import OpenAI from 'openai'
import { SubtitleEntry } from '../../types'
import { useDb } from './db'

/**
 * 从 AI 响应文本中提取 JSON 对象
 * 处理前后多余文字等边界情况
 */
function extractJsonFromResponse(raw: string): string {
    let text = raw.trim()

    // 如果文本不以 { 开头，尝试找到第一个 { 的位置
    const firstBrace = text.indexOf('{')
    if (firstBrace > 0) {
        text = text.substring(firstBrace)
    }

    // 如果文本在最后一个 } 之后还有多余内容，截掉
    const lastBrace = text.lastIndexOf('}')
    if (lastBrace > 0 && lastBrace < text.length - 1) {
        text = text.substring(0, lastBrace + 1)
    }

    return text
}

/**
 * 尝试修复被截断的 JSON
 * 通过找到最后一个完整的数组元素来修复
 */
function tryRepairTruncatedJson(text: string): string {
    // 策略1：找到最后一个 }, 的位置（即最后一个完整的数组元素分隔符）
    const lastCompleteSeparator = text.lastIndexOf('},')
    if (lastCompleteSeparator > 0) {
        // 从这个位置截断，补全 JSON 结构
        const repaired = text.substring(0, lastCompleteSeparator + 1) + ']}'
        try {
            JSON.parse(repaired)
            console.log('[Parser] 截断修复成功（策略1: 回退到最后一个完整元素）')
            return repaired
        } catch { /* 继续尝试 */ }
    }

    // 策略2：找到最后一个完整的 } 并尝试补全
    const lastCloseBrace = text.lastIndexOf('}')
    if (lastCloseBrace > 0) {
        // 检查是否需要补 ] 和 }
        const afterBrace = text.substring(0, lastCloseBrace + 1)
        const attempts = [
            afterBrace + ']}',     // 缺少 ] 和 }
            afterBrace + '}',      // 只缺少外层 }
            afterBrace + ']}'       // 缺少 ] 和 }（元素在 } 处完整）
        ]
        for (const attempt of attempts) {
            try {
                JSON.parse(attempt)
                console.log('[Parser] 截断修复成功（策略2: 补全闭合括号）')
                return attempt
            } catch { /* 继续 */ }
        }
    }

    // 策略3：如果以上都失败，用正则提取所有完整的 {id:..., text:...} 对象
    const objectPattern = /\{\s*"id"\s*:\s*(?:"[^"]*"|\d+)\s*,\s*"text"\s*:\s*"(?:[^"\\]|\\.)*"\s*\}/g
    const objects = text.match(objectPattern)
    if (objects && objects.length > 0) {
        const repaired = `{"subtitles":[${objects.join(',')}]}`
        try {
            JSON.parse(repaired)
            console.log(`[Parser] 截断修复成功（策略3: 逐个提取，恢复 ${objects.length} 个条目）`)
            return repaired
        } catch { /* 放弃 */ }
    }

    return text // 返回原始文本，让上层处理错误
}

/**
 * 从解析后的 JSON 对象中提取字幕数组
 * 兼容不同的键名
 */
function extractSubtitlesFromParsed(parsed: any): any[] {
    // 优先使用 subtitles 键
    if (Array.isArray(parsed.subtitles)) return parsed.subtitles
    // 兼容其他常见键名
    if (Array.isArray(parsed.translations)) return parsed.translations
    if (Array.isArray(parsed.result)) return parsed.result
    if (Array.isArray(parsed.data)) return parsed.data
    // 如果根对象只有一个键且值是数组，直接使用
    const keys = Object.keys(parsed)
    const firstKey = keys[0]
    if (keys.length === 1 && firstKey && Array.isArray(parsed[firstKey])) {
        return parsed[firstKey]
    }
    // 如果 parsed 本身就是数组
    if (Array.isArray(parsed)) return parsed

    return []
}

export const TranslationService = {
    /**
     * Translate a single chunk of subtitles using streaming for maximum reliability
     */
    async translateChunk(
        openai: OpenAI,
        chunk: SubtitleEntry[],
        targetLanguage: string = 'zh-CN',
        glossary: Record<string, string> = {},
        previousContext: SubtitleEntry[] = [],
        model: string = 'gpt-4o-mini',
        taskId?: string,
        chunkIndex?: number,
        stylePrompt?: string
    ): Promise<SubtitleEntry[]> {
        const glossaryText = Object.entries(glossary)
            .map(([key, value]) => `${key} -> ${value}`)
            .join('\n')

        const contextText = previousContext
            .slice(-5)
            .map(entry => `ID:${entry.id} Context: ${entry.translatedText || entry.text}`)
            .join('\n')

        const inputPayload = {
            subtitles: chunk.map(e => ({ id: e.id, text: e.text }))
        };

        const styleBlock = stylePrompt
            ? `\n翻译风格指令（最高优先级！）：\n${stylePrompt}\n`
            : ''

        const prompt = `
你是一个专业的影视字幕翻译。请结合上下文和术语表，将以下 JSON 数据中的 text 字段翻译为地道的${targetLanguage}。
${styleBlock}

格式要求（必须严格遵守！）：
1. 保持原有的 JSON 结构不变，绝对不能改变 id 字段。
2. 输出的条目数量必须与输入完全一致，不能增减。
3. 必须输出一个 JSON 对象，且根节点键为 "subtitles"，其值为翻译后的数组。
4. 只输出纯 JSON 对象，不要用 markdown 代码块包裹，不要添加任何解释性文字。

影视字幕翻译规范（极其重要！）：
1.【单行长度限制】单行字幕尽量简短，中文字符建议不超过 15-18 个。如果原文长句，请根据语义和呼吸停顿点进行换行（在译文适当位置插入 \\n）。
2.【标点符号处理】标准字幕不该有句末标点。必须删除行尾的句号（。）和逗号（，）。句子内部的停顿使用半角或全角空格，或者直接换行，不要出现逗号。可保留问号（？）、叹号（！）和省略号（...）。
3.【语气词冗余】必须在翻译时删除无意义的口语填充词，如“嗯”、“啊”、“呃”、“这个”、“那个”、“我的意思是”等，以使字幕画面保持干净利落。
4.【歌词特殊处理】如果原文或上下文明显是歌词（比如包含♪符号或强韵律的句子），请在翻译两端固定加上（♪）或保留原有音符。歌词翻译不求字面精准，追求意境和押韵。
5.【贴合语境】翻译风格自然流畅，符合人物所处场景及该类影视剧的表达习惯。

术语表：
${glossaryText}

前文背景：
${contextText}

待翻译内容：
${JSON.stringify(inputPayload)}
`

        let fullContent = ''
        try {
            const stream = await openai.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: `你是一个高级字幕翻译专家。你必须只输出合法的 JSON 对象，不要使用 markdown 包裹，不要输出任何额外内容。${stylePrompt ? ' ' + stylePrompt : ''}`
                    },
                    { role: 'user', content: prompt }
                ],
                stream: true,
                response_format: { type: 'json_object' }
            })

            let lastLogTime = Date.now()
            for await (const part of stream) {
                const content = part.choices[0]?.delta?.content || ''
                fullContent += content

                // 每 2 秒记录一次接收进度，防止在处理大块时看起来像死机
                if (Date.now() - lastLogTime > 2000 && fullContent.length > 0) {
                    console.log(`[Stream] Task received ${fullContent.length} bytes...`)
                    lastLogTime = Date.now()
                }
            }

            // 流式接收完成后记录总长度
            console.log(`[Stream] Reception complete, total ${fullContent.length} bytes`)

            // 将原始结果保存到数据库
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
            console.error(`[DEBUG] Prompt (first 500): ${prompt.trim().substring(0, 500)}...`)
            console.error(`[DEBUG] Error: ${e.message}`)
            if (e.status) console.error(`[DEBUG] HTTP Status: ${e.status}`)
            if (e.error) console.error(`[DEBUG] Error Detail: ${JSON.stringify(e.error)}`)
            console.error('!'.repeat(60) + '\n')
            throw e
        }

        // === JSON 提取与解析 ===
        let jsonText = extractJsonFromResponse(fullContent)

        try {
            let parsed: any

            // 第一次尝试：直接解析
            try {
                parsed = JSON.parse(jsonText)
            } catch (firstError: any) {
                console.warn(`[Parser] 直接解析失败: ${firstError.message}`)
                console.warn(`[Parser] 原始内容长度: ${fullContent.length}, 提取后长度: ${jsonText.length}`)

                // 第二次尝试：修复截断的 JSON
                if (jsonText.length > 100) {
                    console.warn('[Parser] 尝试修复截断的 JSON...')
                    const repairedText = tryRepairTruncatedJson(jsonText)
                    try {
                        parsed = JSON.parse(repairedText)
                    } catch (repairError: any) {
                        console.error(`[Parser] 修复后仍然无法解析: ${repairError.message}`)
                        throw firstError // 抛出原始错误
                    }
                } else {
                    throw firstError
                }
            }

            const translatedItems = extractSubtitlesFromParsed(parsed)

            if (translatedItems.length === 0) {
                console.warn(`[Parser] 警告: 解析出的翻译条目为空! 原始 keys: ${JSON.stringify(Object.keys(parsed))}`)
            } else if (translatedItems.length !== chunk.length) {
                console.warn(`[Parser] 警告: 翻译条目数 (${translatedItems.length}) 与原始条目数 (${chunk.length}) 不一致`)
            }

            return chunk.map((entry) => ({
                ...entry,
                translatedText: translatedItems.find((t: any) => String(t.id) === String(entry.id))?.text || entry.text
            }))
        } catch (e) {
            console.error('Failed to parse AI response. Raw content length:', fullContent.length)
            console.error('Extracted JSON preview (first 200 char):', jsonText.substring(0, 200))
            console.error('Extracted JSON preview (last 200 char):', jsonText.slice(-200))

            // 抛出一个更友好的错误信息，提示减小分块
            if (fullContent.length > 8000) {
                throw new Error(`AI 响应过长 (${fullContent.length} 字符) 导致数据损坏。请在设置中减小"分块大小"到 1000 以下。`)
            }
            throw e
        }
    }
}