import { useDb } from '../../../utils/db'
import { safePath } from '../../../utils/subtitle'
import { VideoService } from '../../../utils/video'
import { createReadStream, existsSync, mkdirSync } from 'fs'
import { basename, join } from 'path'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id')
    if (!id) {
        throw createError({ statusCode: 400, message: 'Task ID is required' })
    }

    const db = useDb()
    const row = db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(id) as any
    if (!row) {
        throw createError({ statusCode: 404, message: 'Task not found' })
    }

    const videoDir = process.env.VIDEO_DIR || '/data'
    const tempDir = join(process.cwd(), 'temp')
    if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true })
    }

    let sourcePath: string
    if (row.source_type === 'external') {
        sourcePath = safePath(row.file_path)
    } else {
        // 尝试寻找同名外部文件（保留原有逻辑）
        const baseName = row.file_path.replace(/\.[^.]+$/, '')
        const cleanName = baseName.replace(/\.[a-zA-Z]{2,}(-[a-zA-Z]{2,})?$/, '')
        const possibleExts = ['.srt', '.ass', '.ssa']
        
        let foundPath = ''
        for (const ext of possibleExts) {
            const candidate = join(videoDir, `${cleanName}${ext}`)
            if (existsSync(candidate)) {
                foundPath = candidate
                break
            }
        }

        if (foundPath) {
            sourcePath = foundPath
        } else {
            // 如果找不到外部文件，则从视频中即时提取
            const tempSrtPath = join(tempDir, `download_orig_${id}.srt`)
            try {
                if (!existsSync(tempSrtPath)) {
                    await VideoService.extractSubtitle(row.file_path, row.track_index, tempSrtPath)
                }
                sourcePath = tempSrtPath
            } catch (err: any) {
                throw createError({ statusCode: 500, message: `提取原始字幕失败: ${err.message}` })
            }
        }
    }

    if (!sourcePath || !existsSync(sourcePath)) {
        throw createError({ statusCode: 404, message: '无法找到原始字幕文件' })
    }

    const fileName = basename(sourcePath)

    setHeaders(event, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    })

    return sendStream(event, createReadStream(sourcePath))
})
