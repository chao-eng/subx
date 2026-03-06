import { VideoService } from '../utils/video'

export default defineEventHandler(async (event) => {
    const { path } = getQuery(event) as { path: string }

    if (!path) {
        throw createError({ statusCode: 400, message: 'Path is required' })
    }

    try {
        const tracks = await VideoService.probeTracks(path)
        return { tracks }
    } catch (e: any) {
        throw createError({
            statusCode: 500,
            message: `Failed to probe tracks: ${e.message}`
        })
    }
})
