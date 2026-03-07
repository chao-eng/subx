import { join } from 'path'
import { SubtitleService } from '../utils/subtitle'

export default defineEventHandler(async (event) => {
    const { path } = getQuery(event) as { path: string }
    const videoDir = process.env.VIDEO_DIR || '/data'
    const fullPath = join(videoDir, path)

    if (!path) {
        throw createError({ statusCode: 400, message: 'Path is required' })
    }

    try {
        const entries = await SubtitleService.parseSubtitle(fullPath)
        // Return only the first 50 entries to avoid overwhelming the UI if the file is huge
        return { 
            entries: entries.slice(0, 50),
            total: entries.length
        }
    } catch (e: any) {
        console.error('[API] Error reading subtitle content:', e)
        throw createError({
            statusCode: 500,
            message: `Failed to read subtitle content: ${e.message}`
        })
    }
})
