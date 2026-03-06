import { useDb } from '../utils/db'

export default defineEventHandler(async () => {
    const db = useDb()
    try {
        const stmt = db.prepare(`DELETE FROM tasks WHERE status IN ('done', 'error')`)
        const info = stmt.run()

        // Clean up orphan task_responses chunks to free up DB space
        db.prepare(`DELETE FROM task_responses WHERE task_id NOT IN (SELECT task_id FROM tasks)`).run()

        return { success: true, deletedCount: info.changes }
    } catch (e: any) {
        console.error('Failed to clear history:', e)
        throw createError({ statusCode: 500, message: 'Failed to clear task history' })
    }
})
