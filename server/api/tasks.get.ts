import { useDb } from '../utils/db'

export default defineEventHandler(async () => {
    const db = useDb()
    const rows = db.prepare(`
    SELECT * FROM tasks 
    ORDER BY created_at DESC 
    LIMIT 100
  `).all() as any[]

    const tasks = rows.map(task => ({
        ...task,
        taskId: task.task_id,
        filePath: task.file_path,
        sourceType: task.source_type,
        trackIndex: task.track_index,
        targetLanguage: task.target_lang,
        outputMode: task.output_mode,
        totalChunks: task.total_chunks,
        completedChunks: task.done_chunks,
        createdAt: task.created_at,
        updatedAt: task.updated_at
    }))

    return { tasks, totalItems: tasks.length }
})
