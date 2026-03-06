export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { taskId } = body

    if (!taskId) {
        throw createError({ statusCode: 400, message: '任务 ID 缺失' })
    }

    try {
        // TaskService 是自动导入的，这里直接使用
        const task = TaskService.getTask(taskId)

        if (!task) {
            throw createError({ statusCode: 404, message: '任务不存在' })
        }

        if (task.status === 'done' || task.status === 'error') {
            return { success: false, message: '任务已结束' }
        }

        // 更新状态为错误，模拟取消效果
        await TaskService.updateStatus(taskId, 'error', task.progress, {
            log: '!!! 用户手动取消了任务'
        })

        const db = useDb()
        db.prepare('UPDATE tasks SET error = ? WHERE task_id = ?').run('用户取消任务', taskId)

        return { success: true }
    } catch (e: any) {
        console.error('[Cancel Task Error]', e.message)
        throw createError({
            statusCode: 500,
            message: e.message || '取消失败'
        })
    }
})
