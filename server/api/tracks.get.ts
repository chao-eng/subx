import { VideoService } from '../utils/video'
import { sep } from 'path'

export default defineEventHandler(async (event) => {
    const { path } = getQuery(event) as { path: string }
    const videoDir = process.env.VIDEO_DIR || '/data'
    console.log('[API] Received tracks request:', { path, videoDir, sep })

    if (!path) {
        throw createError({ statusCode: 400, message: 'Path is required' })
    }

    try {
        const tracks = await VideoService.probeTracks(path)
        return { tracks }
    } catch (e: any) {
        console.error('[API] Error probing tracks:', {
            path,
            error: e.message,
            stack: e.stack
        })
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal Server Error',
            message: `Failed to probe tracks: ${e.message}`
        })
    }
})
