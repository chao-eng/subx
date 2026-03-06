import { ConfigService } from '../utils/config'

export default defineEventHandler(async () => {
    const config = await ConfigService.getConfig()

    // Mask API key
    const maskedKey = config.apiKey.length > 8
        ? `${config.apiKey.slice(0, 4)}****${config.apiKey.slice(-4)}`
        : config.apiKey.replace(/./g, '*')

    return {
        ...config,
        apiKey: maskedKey
    }
})
