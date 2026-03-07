import { createHash, randomBytes } from 'crypto'
import { useDb } from './db'

export const AuthService = {
    /**
     * 检查是否已设置口令密钥
     */
    hasPasskey(): boolean {
        const db = useDb()
        const row = db.prepare('SELECT id FROM auth WHERE id = 1').get()
        return !!row
    },

    /**
     * 创建口令密钥（仅允许创建一次）
     */
    setupPasskey(passkey: string): void {
        if (this.hasPasskey()) {
            throw new Error('口令密钥已存在，不可重复创建')
        }
        const hash = this.hashPasskey(passkey)
        const db = useDb()
        db.prepare('INSERT INTO auth (id, passkey_hash) VALUES (1, ?)').run(hash)
    },

    /**
     * 验证口令密钥
     */
    verifyPasskey(passkey: string): boolean {
        const db = useDb()
        const row = db.prepare('SELECT passkey_hash FROM auth WHERE id = 1').get() as any
        if (!row) return false
        return row.passkey_hash === this.hashPasskey(passkey)
    },

    /**
     * 创建会话 token（有效期 7 天）
     */
    createSession(): string {
        const token = randomBytes(32).toString('hex')
        const db = useDb()
        // 清理过期会话
        db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run()
        // 创建新会话
        db.prepare("INSERT INTO sessions (token, expires_at) VALUES (?, datetime('now', '+7 days'))").run(token)
        return token
    },

    /**
     * 验证会话 token 是否有效
     */
    verifySession(token: string): boolean {
        if (!token) return false
        const db = useDb()
        const row = db.prepare("SELECT token FROM sessions WHERE token = ? AND expires_at > datetime('now')").get(token) as any
        return !!row
    },

    /**
     * 销毁会话
     */
    destroySession(token: string): void {
        const db = useDb()
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    },

    /**
     * 对密钥进行 SHA-256 散列
     */
    hashPasskey(passkey: string): string {
        return createHash('sha256').update(passkey).digest('hex')
    }
}
