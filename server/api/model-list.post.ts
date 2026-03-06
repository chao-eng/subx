import OpenAI from 'openai'
import { ConfigService } from '../utils/config'

export default defineEventHandler(async (event) => {
    // 改为读取 Body，完全避免 URL 编码问题
    const body = await readBody(event)
    let apiKey = (body.apiKey || '').trim()
    let baseURL = (body.baseURL || '').trim()

    // 如果前端传过来的是脱敏后的 Key (带 * 号)，则使用后台存储的原始配置进行查询
    if (apiKey.includes('*')) {
        const config = await ConfigService.getConfig()
        apiKey = config.apiKey
        // 如果前端没有传新的 URL，就用后台存的
        if (!baseURL || baseURL.includes('openai.com/v1')) {
            baseURL = config.apiBaseUrl
        }
    }

    if (!apiKey || !baseURL) {
        throw createError({ statusCode: 400, message: 'API 密钥和 URL 不能为空' })
    }

    console.log(`[Model List] 尝试连接: ${baseURL}`)

    try {
        const openai = new OpenAI({
            apiKey,
            baseURL
        })

        // 完全复刻脚本逻辑
        const list = await openai.models.list()
        const models = []

        for await (const model of list) {
            models.push({
                id: model.id,
                owned_by: model.owned_by || ''
            })
        }

        // 排序
        models.sort((a, b) => a.id.localeCompare(b.id))

        console.log(`[Model List] 成功获取 ${models.length} 个模型`)
        return { models }
    } catch (e: any) {
        console.error('[Model List API Error]', e.message)
        // 打印详细错误信息
        if (e.response) {
            console.error('[Detail]', e.response.status, e.response.data)
        }
        throw createError({
            statusCode: e.status || 502,
            message: e.message || '无法连接到模型服务'
        })
    }
})
