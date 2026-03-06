import { ConfigService } from '../utils/config'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    for (const [key, value] of Object.entries(body)) {
        // Basic validation
        if (key === 'apiKey' && String(value).includes('*')) continue // Ignore masked values

        await ConfigService.updateConfig(key, value)
    }

    return { success: true }
})
