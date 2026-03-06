import { v4 as uuidv4 } from 'uuid'
import { TaskService } from '../utils/task'
import { ConfigService } from '../utils/config'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { filePath, sourceType, trackIndex, targetLanguage, outputMode, model, stylePreset } = body

    if (!filePath) {
        throw createError({ statusCode: 400, message: 'File path is required' })
    }

    const taskId = uuidv4()
    const config = await ConfigService.getConfig()

    const task = await TaskService.createTask({
        taskId,
        filePath,
        sourceType: sourceType || 'embedded',
        trackIndex: trackIndex || 0,
        model: model || config.defaultModel,
        targetLanguage: targetLanguage || config.targetLanguage,
        outputMode: outputMode || 'translated',
        stylePreset: stylePreset || 'default'
    })

    // Start asynchronous processing
    // DO NOT await this
    TaskService.process(taskId, {
        apiKey: config.apiKey,
        baseUrl: config.apiBaseUrl
    })

    return { taskId }
})
