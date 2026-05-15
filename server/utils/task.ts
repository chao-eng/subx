import OpenAI from 'openai'
import pLimit from 'p-limit'
import { join } from 'path'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { EventEmitter } from 'events'
import { useDb } from './db'
import { VideoService } from './video'
import { SubtitleService } from './subtitle'
import { TranslationService } from './translation'
import { ConfigService } from './config'
import { STYLE_PRESETS } from '~~/shared/stylePresets'
import type { TranslationTask, SubtitleEntry, TaskStatus } from '~~/types'

export const taskEvents = new EventEmitter()

class TaskQueue {
    private queue: { taskId: string, openaiConfig: any, resolve: (value: void) => void, reject: (reason: any) => void }[] = [];
    private active = 0;

    async add(taskId: string, openaiConfig: any): Promise<void> {
        return new Promise((resolve, reject) => {
            this.queue.push({ taskId, openaiConfig, resolve, reject });
            this.next();
        });
    }

    private async next() {
        const config = await ConfigService.getConfig();
        const concurrency = Math.max(1, Number(config.concurrency) || 3);

        while (this.active < concurrency && this.queue.length > 0) {
            const taskArgs = this.queue.shift();
            if (taskArgs) {
                this.active++;
                TaskService.process(taskArgs.taskId, taskArgs.openaiConfig)
                    .then(taskArgs.resolve)
                    .catch(taskArgs.reject)
                    .finally(() => {
                        this.active--;
                        this.next();
                    });
            }
        }
    }
}

export const globalTaskQueue = new TaskQueue()

async function translateChunkWithRetry(
    openai: OpenAI,
    chunk: SubtitleEntry[],
    targetLanguage: string,
    glossary: Record<string, string>,
    previousContext: SubtitleEntry[],
    model: string,
    taskId: string,
    chunkIndex: number,
    stylePrompt: string,
    maxRetries: number,
    callbacks?: { onEntryTranslated?: (entry: { id: string; translatedText: string }) => void },
    streamUsage: boolean = false
): Promise<SubtitleEntry[]> {
    let lastError: Error | null = null
    const finalResults = new Map<string, SubtitleEntry>()
    let remainingEntries = [...chunk]

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (remainingEntries.length === 0) break

        if (attempt > 0) {
            console.log(`[Retry] Task ${taskId} chunk ${chunkIndex}: 正在进行第 ${attempt}/${maxRetries} 次增量重试，剩余 ${remainingEntries.length} 条未翻译`)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }

        try {
            const results = await TranslationService.translateChunk(
                openai, remainingEntries, targetLanguage, glossary, previousContext, model, taskId, chunkIndex, stylePrompt, callbacks, streamUsage
            )

            for (const entry of results) {
                if (entry.translatedText && entry.translatedText !== entry.text) {
                    finalResults.set(String(entry.id), entry)
                }
            }

            remainingEntries = remainingEntries.filter(e => !finalResults.has(String(e.id)))

            if (remainingEntries.length === 0) {
                break
            }
        } catch (e: any) {
            lastError = e
            console.error(`[Retry] Task ${taskId} chunk ${chunkIndex} 尝试失败:`, e.message)
        }
    }

    // 检查是否还有遗漏
    if (remainingEntries.length > 0) {
        console.warn(`[Task] Task ${taskId} chunk ${chunkIndex}: 在 ${maxRetries} 次重试后仍有 ${remainingEntries.length} 条翻译缺失，将保留原文继续任务。`)
    }

    // 按照原始顺序组装结果
    return chunk.map(entry => {
        const translated = finalResults.get(String(entry.id))
        return translated || { ...entry, translatedText: entry.text } // 最终保底填入原文
    })
}

export const TaskService = {
    async createTask(task: Partial<TranslationTask>): Promise<TranslationTask> {
        const db = useDb()
        const stmt = db.prepare(`
      INSERT INTO tasks (
        task_id, file_path, source_type, track_index, model, target_lang, output_mode, style_preset, status, progress, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `)
        stmt.run(
            task.taskId, task.filePath, task.sourceType, task.trackIndex,
            task.model, task.targetLanguage, task.outputMode, task.stylePreset || 'default', 'queued', 0
        )
        return this.getTask(task.taskId!)
    },

    getTask(taskId: string): TranslationTask {
        const db = useDb()
        const task = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId) as any
        return {
            ...task,
            taskId: task.task_id,
            filePath: task.file_path,
            sourceType: task.source_type,
            trackIndex: task.track_index,
            targetLanguage: task.target_lang,
            outputMode: task.output_mode,
            stylePreset: task.style_preset || 'default',
            totalChunks: task.total_chunks,
            completedChunks: task.done_chunks,
            createdAt: task.created_at,
            updatedAt: task.updated_at
        }
    },

    async updateStatus(taskId: string, status: TaskStatus, progress: number, data: any = {}) {
        const db = useDb()
        const stmt = db.prepare('UPDATE tasks SET status = ?, progress = ?, updated_at = datetime(\'now\') WHERE task_id = ?')
        stmt.run(status, progress, taskId)

        taskEvents.emit('progress', { taskId, step: status, progress, ...data })
    },

    async process(taskId: string, openaiConfig: { apiKey: string, baseUrl?: string }) {
        await ConfigService.cleanupLogs()
        const task = this.getTask(taskId)
        const videoDir = process.env.VIDEO_DIR || '/data'
        const tempDir = join(process.cwd(), 'temp')

        if (!existsSync(tempDir)) {
            mkdirSync(tempDir, { recursive: true })
        }

        const srtPath = task.sourceType === 'external'
            ? join(videoDir, task.filePath)
            : join(tempDir, `${taskId}.srt`)
        const baseName = task.filePath.replace(/\.[^.]+$/, '')
        const cleanName = baseName.replace(/\.[a-zA-Z]{2,}(-[a-zA-Z]{2,})?$/, '')
        const outputPath = join(videoDir, `${cleanName}.${task.targetLanguage}.srt`)

        try {
            await this.updateStatus(taskId, 'extracting', 10, { log: '正在从原视频中提取字幕流...' })
            if (task.sourceType === 'embedded') {
                await VideoService.extractSubtitle(task.filePath, task.trackIndex!, srtPath)
                await this.updateStatus(taskId, 'extracting', 15, { log: '字幕提取成功，保存至临时文件。' })
            } else {
                await this.updateStatus(taskId, 'extracting', 15, { log: '使用外部字幕文件。' })
            }

            await this.updateStatus(taskId, 'parsing', 20, { log: '正在解析 SRT 并进行智能分块...' })
            const allEntries = await SubtitleService.parseSubtitle(srtPath)

            const config = await ConfigService.getConfig()
            const chunkSize = config.chunkSize || 2000
            console.log(`[Task] Using chunk size: ${chunkSize}`)

            const chunks = SubtitleService.chunkByTokens(allEntries, chunkSize)
            const totalChunks = chunks.length
            await this.updateStatus(taskId, 'parsing', 25, { log: `解析完成，共划分为 ${totalChunks} 个文本块。` })

            const db = useDb()
            db.prepare('UPDATE tasks SET total_chunks = ? WHERE task_id = ?').run(totalChunks, taskId)

            await this.updateStatus(taskId, 'translating', 30, { totalChunks, completedChunks: 0 })

            const openai = new OpenAI({ apiKey: openaiConfig.apiKey, baseURL: openaiConfig.baseUrl })
            const chunkLimit = Math.max(1, config.concurrency || 3)
            const limit = pLimit(chunkLimit)
            const maxRetries = config.maxRetries || 3

            const glossary = config.glossary || {}

            const stylePresetConfig = STYLE_PRESETS.find(s => s.id === task.stylePreset)
            const stylePrompt = stylePresetConfig?.prompt || ''
            if (stylePrompt) {
                await this.updateStatus(taskId, 'translating', 30, { log: `使用翻译风格预设: ${stylePresetConfig!.name}` })
            }

            const translatedMap = new Map<string, SubtitleEntry>()
            const completedChunksPerChunk = new Map<number, number>()
            let globalCompletedChunks = 0

            const updateGlobalProgress = () => {
                globalCompletedChunks = 0
                for (const count of completedChunksPerChunk.values()) {
                    globalCompletedChunks += count > 0 ? 1 : 0
                }
                const progress = 30 + Math.floor((globalCompletedChunks / totalChunks) * 60)
                this.updateStatus(taskId, 'translating', progress, {
                    totalChunks,
                    completedChunks: globalCompletedChunks,
                    currentText: `翻译进度: ${globalCompletedChunks}/${totalChunks}`
                })
            }

            const promises = chunks.map((chunk, index) => limit(async () => {
                const previousContext = index > 0 && chunks[index - 1]
                    ? chunks[index - 1]!.slice(-5).map(e => {
                        const translated = translatedMap.get(String(e.id))
                        return translated || e
                    })
                    : []

                const uncachedEntries: SubtitleEntry[] = []
                const cachedResults = new Map<string, string>()
                const nonVerbalResults = new Map<string, string>()

                for (const entry of chunk) {
                    if (SubtitleService.isNonVerbal(entry.text)) {
                        nonVerbalResults.set(String(entry.id), entry.text)
                        continue
                    }

                    const sourceText = entry.text
                    const cacheHash = SubtitleService.computeCacheHash(sourceText, task.model, task.targetLanguage)
                    const cached = SubtitleService.getCachedTranslation(cacheHash)
                    if (cached) {
                        cachedResults.set(String(entry.id), cached)
                    } else {
                        uncachedEntries.push(entry)
                    }
                }

                if (cachedResults.size > 0 || nonVerbalResults.size > 0) {
                    console.log(`[Cache] Chunk ${index}: ${cachedResults.size} from cache, ${nonVerbalResults.size} non-verbal skipped, ${uncachedEntries.length} to translate`)
                }

                let translatedChunk: SubtitleEntry[]

                if (uncachedEntries.length === 0) {
                    translatedChunk = chunk.map(entry => {
                        const cachedText = cachedResults.get(String(entry.id))
                        if (cachedText) {
                            return { ...entry, translatedText: cachedText }
                        }
                        const nonVerbalText = nonVerbalResults.get(String(entry.id))
                        if (nonVerbalText) {
                            return { ...entry, translatedText: nonVerbalText }
                        }
                        return entry
                    })
                } else {
                    const idMapping = new Map<string, string>()
                    const remappedChunk: SubtitleEntry[] = uncachedEntries.map((entry, i) => {
                        const sequentialId = String(i + 1)
                        idMapping.set(sequentialId, String(entry.id))
                        return { ...entry, id: sequentialId }
                    })

                    const aiResults = await translateChunkWithRetry(
                        openai, remappedChunk, task.targetLanguage, glossary, previousContext,
                        task.model, taskId, index, stylePrompt, maxRetries,
                        {
                            onEntryTranslated: (entry) => {
                                const originalId = idMapping.get(String(entry.id))
                                if (originalId) {
                                    const originalEntry = uncachedEntries.find(e => String(e.id) === originalId)
                                    if (originalEntry) {
                                        translatedMap.set(originalId, {
                                            ...originalEntry,
                                            translatedText: entry.translatedText
                                        })
                                    }
                                }
                            }
                        },
                        config.streamUsage || false
                    )

                    const aiResultByOriginalId = new Map<string, SubtitleEntry>()
                    for (const entry of aiResults) {
                        const originalId = idMapping.get(String(entry.id))
                        if (originalId) {
                            const originalEntry = uncachedEntries.find(e => String(e.id) === originalId)
                            const restoredEntry: SubtitleEntry = {
                                ...originalEntry!,
                                id: originalId,
                                translatedText: entry.translatedText
                            }
                            aiResultByOriginalId.set(originalId, restoredEntry)

                            if (entry.translatedText && entry.translatedText !== entry.text && !SubtitleService.isNonVerbal(originalEntry!.text)) {
                                const cacheHash = SubtitleService.computeCacheHash(originalEntry!.text, task.model, task.targetLanguage)
                                SubtitleService.setCachedTranslation(cacheHash, originalEntry!.text, entry.translatedText, task.model, task.targetLanguage)
                            }
                        }
                    }

                    translatedChunk = chunk.map(entry => {
                        const cachedText = cachedResults.get(String(entry.id))
                        if (cachedText) {
                            return { ...entry, translatedText: cachedText }
                        }
                        const nonVerbalText = nonVerbalResults.get(String(entry.id))
                        if (nonVerbalText) {
                            return { ...entry, translatedText: nonVerbalText }
                        }
                        const aiResult = aiResultByOriginalId.get(String(entry.id))
                        return aiResult || entry
                    })
                }

                completedChunksPerChunk.set(index, translatedChunk.length)
                for (const entry of translatedChunk) {
                    translatedMap.set(String(entry.id), entry)
                }

                updateGlobalProgress()

                this.updateStatus(taskId, 'translating', 30 + Math.floor((globalCompletedChunks / totalChunks) * 60), {
                    totalChunks,
                    completedChunks: globalCompletedChunks,
                    log: `[AI] 块 #${index + 1} 翻译完成 (${globalCompletedChunks}/${totalChunks})`
                })
            }))

            await Promise.all(promises)

            await this.updateStatus(taskId, 'exporting', 90, { log: '正在合成并保存最终字幕文件...' })
            const translatedEntries = Array.from(translatedMap.values())
            translatedEntries.sort((a, b) => Number(a.id) - Number(b.id))
            await SubtitleService.writeSubtitle(translatedEntries, outputPath, task.outputMode as 'translated' | 'bilingual')
            await this.updateStatus(taskId, 'exporting', 95, { log: `文件保存成功: ${outputPath}` })

            TranslationService.cleanupPartialFiles(taskId, totalChunks)

            await this.updateStatus(taskId, 'done', 100)
            db.prepare('UPDATE tasks SET status = \'done\', progress = 100, output_path = ?, updated_at = datetime(\'now\') WHERE task_id = ?')
                .run(outputPath, taskId)

        } catch (e: any) {
            const maskedKey = openaiConfig.apiKey ? `${openaiConfig.apiKey.substring(0, 6)}...` : 'MISSING'
            console.error('\n' + '='.repeat(50))
            console.error(`[DEBUG] 任务失败详情 - Task ID: ${taskId}`)
            console.error(`[DEBUG] 接口地址 (Base URL): ${openaiConfig.baseUrl || 'https://api.openai.com/v1'}`)
            console.error(`[DEBUG] API Key (前6位): ${maskedKey}`)
            console.error(`[DEBUG] 使用模型: ${task.model}`)
            console.error(`[DEBUG] 目标语言: ${task.targetLanguage}`)
            console.error(`[DEBUG] 错误信息: ${e.message}`)
            if (e.response?.data) {
                console.error(`[DEBUG] API 响应详情: ${JSON.stringify(e.response.data)}`)
            }
            console.error('='.repeat(50) + '\n')

            await this.updateStatus(taskId, 'error', 0, {
                error: e.message,
                log: `!!! 任务失败: ${e.message}${e.stack ? '\n堆栈信息: ' + e.stack.split('\n').slice(0, 3).join('\n') : ''}`
            })
            useDb().prepare('UPDATE tasks SET status = \'error\', error = ?, updated_at = datetime(\'now\') WHERE task_id = ?').run(e.message, taskId)
        } finally {
            if (task.sourceType === 'embedded' && existsSync(srtPath)) {
                try {
                    rmSync(srtPath, { force: true })
                    console.log(`[Task] Cleaned up temp file: ${srtPath}`)
                } catch (err) {
                    console.error(`[Task] Failed to clean up temp file: ${srtPath}`, err)
                }
            }
        }
    }
}
