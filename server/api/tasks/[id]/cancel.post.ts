import { TaskService } from '../../../utils/task'

export default defineEventHandler(async (event) => {
    const taskId = getRouterParam(event, 'id')

    if (!taskId) {
        throw createError({ statusCode: 400, message: 'Task ID is required' })
    }

    try {
        const task = TaskService.getTask(taskId)

        if (task.status === 'done' || task.status === 'error') {
            return { success: false, message: '任务已结束，无法取消' }
        }

        // Mark task as error/cancelled in database
        await TaskService.updateStatus(taskId, 'error', task.progress, {
            log: '任务已被用户手动取消'
        })

        const db = useDb()
        db.prepare('UPDATE tasks SET error = ? WHERE task_id = ?').run('用户取消任务', taskId)

        return { success: true }
    } catch (e: any) {
        throw createError({
            statusCode: 500,
            message: e.message || '取消任务失败'
        })
    }
})
