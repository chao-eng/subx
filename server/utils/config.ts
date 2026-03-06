import { useDb } from './db'
import type { AppConfig } from '../../types'

export const ConfigService = {
    /**
     * Get all configuration
     */
    async getConfig(): Promise<AppConfig> {
        const db = useDb()
        const rows = db.prepare('SELECT key, value FROM config').all() as any[]

        // Default values
        const config: AppConfig = {
            apiKey: '',
            apiBaseUrl: 'https://api.openai.com/v1',
            defaultModel: 'gpt-3.5-turbo',
            targetLanguage: 'zh-CN',
            chunkSize: 800,
            concurrency: 3,
            maxRetries: 3,
            glossary: {}
        }

        // Override with DB values
        rows.forEach(row => {
            if (row.key === 'glossary') {
                config.glossary = JSON.parse(row.value)
            } else {
                (config as any)[row.key] = row.value
            }
        })

        return config
    },

    /**
     * Update configuration
     */
    async updateConfig(key: string, value: any) {
        const db = useDb()
        const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value)

        const stmt = db.prepare('INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, datetime(\'now\'))')
        stmt.run(key, valStr)
    }
}
