import SrtParser from 'srt-parser-2'
import { readFileSync, writeFileSync } from 'fs'
import type { SubtitleEntry } from '../../types'

const srtParser = new SrtParser()

export const SubtitleService = {
    /**
     * Parse SRT file content into subtitle entries
     */
    async parseSubtitle(filePath: string): Promise<SubtitleEntry[]> {
        const srtContent = readFileSync(filePath, 'utf-8')
        const srtEntries = srtParser.fromSrt(srtContent)

        return srtEntries.map(entry => ({
            id: entry.id,
            startTime: entry.startTime,
            endTime: entry.endTime,
            text: entry.text
        }))
    },

    /**
     * Write subtitle entries back as SRT
     */
    async writeSubtitle(entries: SubtitleEntry[], outputPath: string) {
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
