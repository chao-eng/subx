import { readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import type { FileNode } from '~/types'

const SUPPORTED_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.webm', '.ts', '.srt', '.ass', '.vtt']

export default defineEventHandler(async () => {
    const videoDir = process.env.VIDEO_DIR || '/data'

    function scan(dir: string): FileNode[] {
        try {
            const items = readdirSync(dir)
            const nodes: FileNode[] = []

            for (const item of items) {
                if (item.startsWith('.')) continue
                const fullPath = join(dir, item)
                const stats = statSync(fullPath)
                const isDir = stats.isDirectory()
                const ext = item.substring(item.lastIndexOf('.')).toLowerCase()

                if (isDir) {
                    const children = scan(fullPath)
                    if (children.length > 0) {
                        nodes.push({
                            name: item,
                            path: relative(videoDir, fullPath),
                            isDir: true,
                            children: children
                        })
                    }
                } else if (SUPPORTED_EXTENSIONS.includes(ext)) {
                    nodes.push({
                        name: item,
                        path: relative(videoDir, fullPath),
                        isDir: false
                    })
                }
            }

            return nodes
        } catch (e) {
            console.error('Scan failed:', e)
            return []
        }
    }

    return scan(videoDir)
})
