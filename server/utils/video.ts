import ffmpeg from 'fluent-ffmpeg'
import { join } from 'path'
import type { TrackInfo } from '../../types'

// 针对 Windows 环境下可能找不到 ffprobe 的情况进行配置
// 如果环境变量中没有设置，尝试默认路径
if (process.platform === 'win32') {
    if (process.env.FFMPEG_PATH) {
        console.log('[VideoService] Setting FFmpeg path:', process.env.FFMPEG_PATH)
        ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH)
    }
    if (process.env.FFPROBE_PATH) {
        console.log('[VideoService] Setting ffprobe path:', process.env.FFPROBE_PATH)
        ffmpeg.setFfprobePath(process.env.FFPROBE_PATH)
    }
}

export const VideoService = {
    /**
     * Probe subtitle tracks for a video file
     */
    async probeTracks(filePath: string): Promise<TrackInfo[]> {
        const videoDir = process.env.VIDEO_DIR || '/data'
        const fullPath = join(videoDir, filePath)
        console.log('[VideoService] Probing tracks for:', fullPath)

        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(fullPath, (err, metadata) => {
                if (err) {
                    console.error('[VideoService] ffprobe error:', err)
                    return reject(err)
                }

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
