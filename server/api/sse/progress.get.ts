import { taskEvents } from '../../utils/task'

export default defineEventHandler((event) => {
    const { taskId } = getQuery(event) as { taskId: string }

    if (!taskId) {
        throw createError({ statusCode: 400, message: 'TaskId is required' })
    }

    const { res } = event.node

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    })

    const onProgress = (data: any) => {
        if (data.taskId === taskId) {
            res.write(`event: progress\ndata: ${JSON.stringify(data)}\n\n`)
        }
    }

    taskEvents.on('progress', onProgress)

    // Keep alive
    const kId = setInterval(() => {
        res.write(`: keepalive\n\n`)
    }, 15000)

    event.node.req.on('close', () => {
        taskEvents.off('progress', onProgress)
        clearInterval(kId)
        res.end()
    })
})
