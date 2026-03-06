import { TaskService } from '../../utils/task'

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id') || event.context.params?.id
    if (!id) {
        throw createError({ statusCode: 400, message: 'Task ID is required' })
    }

    try {
        const task = TaskService.getTask(id)
        return { task }
    } catch (e: any) {
        throw createError({ statusCode: 404, message: 'Task not found' })
    }
})
