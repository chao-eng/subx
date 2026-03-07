import SrtParser from 'srt-parser-2'
import { parse as parseAss, compile as compileAss } from 'ass-compiler'
import { readFileSync, writeFileSync } from 'fs'
import type { SubtitleEntry } from '../../types'

const srtParser = new SrtParser()

export const SubtitleService = {
    /**
     * Parse subtitle file content into subtitle entries
     */
    async parseSubtitle(filePath: string): Promise<SubtitleEntry[]> {
        const content = readFileSync(filePath, 'utf-8')
        const extension = filePath.split('.').pop()?.toLowerCase()

        if (extension === 'ass' || extension === 'ssa') {
            const parsed = parseAss(content)
            // Dialogue lines are in parsed.events.dialogue
            return parsed.events.dialogue.map((event, index) => {
                const rawText = typeof event.Text === 'string' 
                    ? event.Text 
                    : (event.Text as any).combined || JSON.stringify(event.Text)
                
                return {
                    id: (index + 1).toString(),
                    startTime: this.assTimeToSrtTime(event.Start),
                    endTime: this.assTimeToSrtTime(event.End),
                    text: rawText
                        .replace(/\\[nN]/g, '\n') // Replace \N or \n with actual newline
                        .replace(/\{[^}]+\}/g, '') // Strip ASS tags like {\pos(x,y)}
                        .trim()
                }
            })
        }

        // Default to SRT
        const srtEntries = srtParser.fromSrt(content)
        return srtEntries.map(entry => ({
            id: entry.id,
            startTime: entry.startTime,
            endTime: entry.endTime,
            text: entry.text
        }))
    },

    /**
     * Convert ASS time (H:MM:SS.CC) to SRT time (HH:MM:SS,mmm)
     */
    assTimeToSrtTime(assTime: number): string {
        // ass-compiler might return seconds or a string. 
        // If it's number (seconds):
        const totalSeconds = assTime
        const hrs = Math.floor(totalSeconds / 3600)
        const mins = Math.floor((totalSeconds % 3600) / 60)
        const secs = Math.floor(totalSeconds % 60)
        const ms = Math.floor((totalSeconds % 1) * 1000)

        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
    },

    /**
     * Write subtitle entries back
     */
    async writeSubtitle(entries: SubtitleEntry[], outputPath: string) {
        const extension = outputPath.split('.').pop()?.toLowerCase()

        if (extension === 'ass' || extension === 'ssa') {
            // If we want to write ASS, we'd need a template or original ASS structure.
            // For now, if the user requested "conversion", converting to SRT is usually safer.
            // But let's support writing SRT even if input was ASS for simplicity.
        }

        const srtEntries = entries.map(entry => ({
            id: entry.id,
            startTime: entry.startTime,
            endTime: entry.endTime,
            text: entry.translatedText || entry.text
        }))

        const srtContent = srtParser.toSrt(srtEntries as any)
        writeFileSync(outputPath, srtContent, 'utf-8')
    },

    /**
     * Chunking strategy (Dynamic token estimation)
     */
    chunkByTokens(entries: SubtitleEntry[], maxTokens: number = 2000): SubtitleEntry[][] {
        const chunks: SubtitleEntry[][] = []
        let currentChunk: SubtitleEntry[] = []
        let currentTokens = 0

        const estimateTokens = (text: string) => {
            // Basic estimation: count words + non-ASCII characters
            const words = text.split(/\s+/).length
            const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length
            return words + nonAscii * 1.5 // Rough factor for CJK tokens
        }

        for (const entry of entries) {
            const entryTokens = estimateTokens(entry.text)
            if (currentTokens + entryTokens > maxTokens && currentChunk.length > 0) {
                chunks.push(currentChunk)
                currentChunk = []
                currentTokens = 0
            }
            currentChunk.push(entry)
            currentTokens += entryTokens
        }

        if (currentChunk.length > 0) chunks.push(currentChunk)

        return chunks
    }
}
