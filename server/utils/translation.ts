import OpenAI from 'openai'
import type { SubtitleEntry } from '../../types'
import { useDb } from './db'
import { appendFileSync, existsSync, readFileSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'

interface StreamCallbacks {
    onEntryTranslated?: (entry: { id: string; translatedText: string }) => void
}

function buildTranslationPrompt(
    chunk: SubtitleEntry[],
    targetLanguage: string,
    glossaryText: string,
    contextText: string,
    styleBlock: string
): string {
    const inputLines = chunk.map(e => `${e.id}\n${e.text}`).join('\n\n')

    return `你是专业影视字幕翻译。将以下字幕逐条翻译为地道的${targetLanguage}。
${styleBlock}
输出格式（严格遵守！）：
- 每条翻译占两行：第一行是序号（纯数字，必须与输入序号完全一致），第二行是翻译文本
- 条目之间用一个空行分隔
- 条目顺序必须与输入完全一致，不能增减任何条目
- 不要输出任何其他内容（不要 markdown、不要解释、不要编号前缀）
- 即使某条原文很短或无意义，也必须输出对应序号和翻译

影视字幕翻译规范（极其重要！）：
1.【单行长度限制】单行字幕尽量简短，中文字符建议不超过 15-18 个。如果原文长句，请根据语义和呼吸停顿点进行换行（在译文适当位置插入 \\n）。
2.【标点符号处理】标准字幕不该有句末标点。必须删除行尾的句号（。）和逗号（，）。句子内部的停顿使用半角或全角空格，或者直接换行，不要出现逗号。可保留问号（？）、叹号（！）和省略号（...）。
3.【语气词冗余】必须在翻译时删除无意义的口语填充词，如"嗯"、"啊"、"呃"、"这个"、"那个"、"我的意思是"等，以使字幕画面保持干净利落。
4.【歌词特殊处理】如果原文或上下文明显是歌词（比如包含♪符号或强韵律的句子），请在翻译两端固定加上（♪）或保留原有音符。歌词翻译不求字面精准，追求意境和押韵。
5.【贴合语境】翻译风格自然流畅，符合人物所处场景及该类影视剧的表达习惯。

术语表：
${glossaryText}

前文背景：
${contextText}

待翻译：
${inputLines}`
}

function parseStreamedTranslations(fullContent: string): Map<string, string> {
    const result = new Map<string, string>()
    const blocks = fullContent.split(/\n\s*\n/)

    for (const block of blocks) {
        const lines = block.trim().split('\n')
        if (lines.length < 2) continue

        const idLine = lines[0]?.trim()
        if (!idLine || !/^\d+$/.test(idLine)) continue

        const translatedText = lines.slice(1).join('\n').trim()
        result.set(idLine, translatedText || '')
    }

    return result
}

export const TranslationService = {
    async translateChunk(
        openai: OpenAI,
        chunk: SubtitleEntry[],
        targetLanguage: string = 'zh-CN',
        glossary: Record<string, string> = {},
        previousContext: SubtitleEntry[] = [],
        model: string = 'gpt-4o-mini',
        taskId?: string,
        chunkIndex?: number,
        stylePrompt?: string,
        callbacks?: StreamCallbacks
    ): Promise<SubtitleEntry[]> {
        const glossaryText = Object.entries(glossary)
            .map(([key, value]) => `${key} -> ${value}`)
            .join('\n')

        const contextText = previousContext
            .slice(-5)
            .map(entry => `ID:${entry.id} Context: ${entry.translatedText || entry.text}`)
            .join('\n')

        const styleBlock = stylePrompt
            ? `\n翻译风格指令（最高优先级！）：\n${stylePrompt}\n`
            : ''

        const prompt = buildTranslationPrompt(chunk, targetLanguage, glossaryText, contextText, styleBlock)

        const partialPath = taskId
            ? join(process.cwd(), 'temp', `${taskId}.chunk-${chunkIndex ?? 0}.partial`)
            : null

        if (partialPath) {
            const partialDir = join(partialPath, '..')
            if (!existsSync(partialDir)) {
                mkdirSync(partialDir, { recursive: true })
            }
        }

        let fullContent = ''
        let lastParsedIndex = 0

        try {
            const stream = await openai.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: `你是高级字幕翻译专家。按指定格式逐条输出翻译，不要输出任何额外内容。每条输入都必须有对应的翻译输出，序号必须与输入完全一致。${stylePrompt ? ' ' + stylePrompt : ''}`
                    },
                    { role: 'user', content: prompt }
                ],
                stream: true
            })

            let lastLogTime = Date.now()
            let buffer = ''

            for await (const part of stream) {
                const content = part.choices[0]?.delta?.content || ''
                fullContent += content
                buffer += content

                if (Date.now() - lastLogTime > 2000 && fullContent.length > 0) {
                    console.log(`[Stream] Task ${taskId} chunk ${chunkIndex} received ${fullContent.length} bytes...`)
                    lastLogTime = Date.now()
                }

                const newEntries = this.parseNewEntries(buffer, lastParsedIndex, chunk)
                if (newEntries.length > 0) {
                    lastParsedIndex += newEntries.length

                    if (partialPath) {
                        try {
                            for (const entry of newEntries) {
                                appendFileSync(partialPath, `${entry.id}\n${entry.translatedText}\n\n`)
                            }
                        } catch (fsErr) {
                            console.error('[FS] Failed to write partial file:', fsErr)
                        }
                    }

                    if (callbacks?.onEntryTranslated) {
                        for (const entry of newEntries) {
                            callbacks.onEntryTranslated(entry)
                        }
                    }
                }
            }

            console.log(`[Stream] Task ${taskId} chunk ${chunkIndex} complete, total ${fullContent.length} bytes`)

            if (taskId) {
                try {
                    const db = useDb()
                    db.prepare('INSERT INTO task_responses (task_id, chunk_index, model, raw_response) VALUES (?, ?, ?, ?)').run(
                        taskId,
                        chunkIndex ?? 0,
                        model,
                        fullContent
                    )
                } catch (dbErr) {
                    console.error('[DB] Failed to save raw AI response:', dbErr)
                }
            }
        } catch (e: any) {
            console.error('\n' + '!'.repeat(20) + ' 流式 API 请求失败 ' + '!'.repeat(20))
            console.error(`[DEBUG] Model: ${model}`)
            console.error(`[DEBUG] Chunk size: ${chunk.length} entries`)
            console.error(`[DEBUG] Error: ${e.message}`)
            if (e.status) console.error(`[DEBUG] HTTP Status: ${e.status}`)
            if (e.error) console.error(`[DEBUG] Error Detail: ${JSON.stringify(e.error)}`)
            console.error('!'.repeat(60) + '\n')
            throw e
        }

        const translatedMap = parseStreamedTranslations(fullContent)

        if (translatedMap.size === 0) {
            console.warn(`[Parser] 警告: 解析出的翻译条目为空! 原始内容长度: ${fullContent.length}`)
            if (fullContent.length > 0) {
                console.warn(`[Parser] 原始内容前200字符: ${fullContent.substring(0, 200)}`)
            }
        } else if (translatedMap.size !== chunk.length) {
            console.warn(`[Parser] 警告: 翻译条目数 (${translatedMap.size}) 与原始条目数 (${chunk.length}) 不一致`)
            const missingIds = chunk.map(e => String(e.id)).filter(id => !translatedMap.has(id))
            if (missingIds.length > 0 && missingIds.length <= 20) {
                console.warn(`[Parser] 缺失的条目ID: ${missingIds.join(', ')}`)
            }
        }

        const result = chunk.map((entry) => {
            const translated = translatedMap.get(String(entry.id))
            return {
                ...entry,
                translatedText: translated !== undefined ? translated : entry.text
            }
        })

        const translatedCount = result.filter(e => e.translatedText && e.translatedText !== e.text).length
        if (translatedCount === 0 && chunk.length > 0) {
            throw new Error(`翻译结果为空: chunk ${chunkIndex} 包含 ${chunk.length} 条目但无有效翻译 (AI返回 ${fullContent.length} bytes)`)
        }

        return result
    },

    parseNewEntries(buffer: string, startIndex: number, chunk: SubtitleEntry[]): { id: string; translatedText: string }[] {
        const entries: { id: string; translatedText: string }[] = []
        const blocks = buffer.split(/\n\s*\n/)
        const chunkIds = new Set(chunk.map(e => String(e.id)))

        for (let i = startIndex; i < blocks.length - 1; i++) {
            const block = blocks[i]?.trim()
            if (!block) continue

            const lines = block.split('\n')
            if (lines.length < 2) continue

            const idLine = lines[0]?.trim()
            if (!idLine || !/^\d+$/.test(idLine)) continue
            if (!chunkIds.has(idLine)) continue

            const translatedText = lines.slice(1).join('\n').trim()
            entries.push({ id: idLine, translatedText: translatedText || '' })
        }

        return entries
    },

    loadPartialTranslations(taskId: string, chunkIndex: number): Map<string, string> {
        const partialPath = join(process.cwd(), 'temp', `${taskId}.chunk-${chunkIndex}.partial`)
        if (!existsSync(partialPath)) return new Map()

        try {
            const content = readFileSync(partialPath, 'utf-8')
            return parseStreamedTranslations(content)
        } catch {
            return new Map()
        }
    },

    cleanupPartialFiles(taskId: string, totalChunks: number) {
        for (let i = 0; i < totalChunks; i++) {
            const partialPath = join(process.cwd(), 'temp', `${taskId}.chunk-${i}.partial`)
            try {
                if (existsSync(partialPath)) {
                    rmSync(partialPath, { force: true })
                }
            } catch { /* ignore */ }
        }
    }
}
