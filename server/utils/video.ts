import ffmpeg from 'fluent-ffmpeg'
import { join } from 'path'
import type { TrackInfo } from '../../types'

export const VideoService = {
    /**
     * Probe subtitle tracks for a video file
     */
    async probeTracks(filePath: string): Promise<TrackInfo[]> {
        const videoDir = process.env.VIDEO_DIR || '/data'
        const fullPath = join(videoDir, filePath)

        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(fullPath, (err, metadata) => {
                if (err) return reject(err)

                const subtitleStreams = metadata.streams.filter(s => s.codec_type === 'subtitle')
                const tracks: TrackInfo[] = subtitleStreams.map(s => ({
                    index: s.index ?? 0,
                    codec: s.codec_name ?? 'unknown',
                    language: s.tags?.language ?? 'und',
                    title: s.tags?.title ?? ''
                }))

                resolve(tracks)
            })
        })
    },

    /**
     * Extract subtitle track as SRT
     */
    async extractSubtitle(videoFilePath: string, trackIndex: number, outputPath: string): Promise<string> {
        const videoDir = process.env.VIDEO_DIR || '/data'
        const fullPath = join(videoDir, videoFilePath)

        return new Promise((resolve, reject) => {
            ffmpeg(fullPath)
                .outputOptions([`-map 0:${trackIndex}`, '-c:s srt'])
                .output(outputPath)
                .on('error', (err) => reject(err))
                .on('end', () => resolve(outputPath))
                .run()
        })
    }
}
