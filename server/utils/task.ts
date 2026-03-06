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

export const TaskService = {
    /**
     * Create new task in database
     */
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

    /**
     * Get task by ID
     */
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

    /**
     * Update task status and progress
     */
    async updateStatus(taskId: string, status: TaskStatus, progress: number, data: any = {}) {
        const db = useDb()
        const stmt = db.prepare('UPDATE tasks SET status = ?, progress = ?, updated_at = datetime(\'now\') WHERE task_id = ?')
        stmt.run(status, progress, taskId)

        // Emit for SSE
        taskEvents.emit('progress', { taskId, step: status, progress, ...data })
    },

    /**
     * Main processing loop for a task
     */
    async process(taskId: string, openaiConfig: { apiKey: string, baseUrl?: string }) {
        const task = this.getTask(taskId)
        const videoDir = process.env.VIDEO_DIR || '/data'
        const tempDir = join(process.cwd(), 'temp')

        if (!existsSync(tempDir)) {
            mkdirSync(tempDir, { recursive: true })
        }

        const srtPath = task.sourceType === 'external'
            ? join(videoDir, task.filePath)
            : join(tempDir, `${taskId}.srt`)
        // Clean up common language prefixes from the base name, e.g., "video.zh-CN.srt" -> "video.en.srt"
        const baseName = task.filePath.replace(/\.[^.]+$/, '')
        const cleanName = baseName.replace(/\.[a-zA-Z]{2,}(-[a-zA-Z]{2,})?$/, '')
        const outputPath = join(videoDir, `${cleanName}.${task.targetLanguage}.srt`)

        try {
            // 1. Extraction (Optional for MKV)
            await this.updateStatus(taskId, 'extracting', 10, { log: '正在从原视频中提取字幕流...' })
            if (task.sourceType === 'embedded') {
                await VideoService.extractSubtitle(task.filePath, task.trackIndex!, srtPath)
                await this.updateStatus(taskId, 'extracting', 15, { log: '字幕提取成功，保存至临时文件。' })
            } else {
                await this.updateStatus(taskId, 'extracting', 15, { log: '使用外部字幕文件。' })
            }

            // 2. Parsing & Chunking
            await this.updateStatus(taskId, 'parsing', 20, { log: '正在解析 SRT 并进行智能分块...' })
            const allEntries = await SubtitleService.parseSubtitle(srtPath)

            // 获取数据库中的配置（分块大小）
            const config = await ConfigService.getConfig()
            const chunkSize = config.chunkSize || 2000
            console.log(`[Task] Using chunk size: ${chunkSize}`)

            const chunks = SubtitleService.chunkByTokens(allEntries, chunkSize)
            const totalChunks = chunks.length
            await this.updateStatus(taskId, 'parsing', 25, { log: `解析完成，共划分为 ${totalChunks} 个文本块。` })

            const db = useDb()
            db.prepare('UPDATE tasks SET total_chunks = ? WHERE task_id = ?').run(totalChunks, taskId)

            // 3. Translation
            await this.updateStatus(taskId, 'translating', 30, { totalChunks, completedChunks: 0 })

            const openai = new OpenAI({ apiKey: openaiConfig.apiKey, baseURL: openaiConfig.baseUrl })
            const limit = pLimit(3) // 3 parallel translation tasks

            let completedChunks = 0
            const translatedEntries: SubtitleEntry[] = []

            // Resolve the style prompt from the preset
            const stylePresetConfig = STYLE_PRESETS.find(s => s.id === task.stylePreset)
            const stylePrompt = stylePresetConfig?.prompt || ''
            if (stylePrompt) {
                await this.updateStatus(taskId, 'translating', 30, { log: `使用翻译风格预设: ${stylePresetConfig!.name}` })
            }

            const promises = chunks.map((chunk, index) => limit(async () => {
                const translatedChunk = await TranslationService.translateChunk(
                    openai, chunk, task.targetLanguage, {}, [], task.model, taskId, index, stylePrompt
                )
                completedChunks++
                translatedEntries.push(...translatedChunk)

                await this.updateStatus(taskId, 'translating', 30 + Math.floor((completedChunks / totalChunks) * 60), {
                    totalChunks,
                    completedChunks,
                    currentText: `翻译进度: ${completedChunks}/${totalChunks}`,
                    log: `[AI] 块 #${index + 1} 翻译完成 (${completedChunks}/${totalChunks})`
                })
            }))

            await Promise.all(promises)

            // 4. Exporting
            await this.updateStatus(taskId, 'exporting', 90, { log: '正在合成并保存最终字幕文件...' })
            translatedEntries.sort((a, b) => Number(a.id) - Number(b.id))
            await SubtitleService.writeSubtitle(translatedEntries, outputPath)
            await this.updateStatus(taskId, 'exporting', 95, { log: `文件保存成功: ${outputPath}` })

            // 5. Done
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
            // Clean up temporary extracted subtitle
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
