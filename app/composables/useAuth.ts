import { hashPasskeyClient } from '../utils/crypto'

export const useAuth = () => {
    const authenticated = useState<boolean>('auth:authenticated', () => false)
    const hasPasskey = useState<boolean>('auth:hasPasskey', () => true)
    const checking = useState<boolean>('auth:checking', () => true)
    
    // 使用 useRequestFetch 确保在 SSR 期间能自动透传 Cookie
    const fetcher = useRequestFetch()

    /**
     * 检查认证状态
     */
    async function check() {
        // 防止重复检查
        if (import.meta.client && !checking.value) return
        
        checking.value = true
        try {
            // 1. 检查是否已设置密钥
            const statusRes = await fetcher('/api/auth/status')
            hasPasskey.value = statusRes.hasPasskey

            if (!statusRes.hasPasskey) {
                authenticated.value = false
                return
            }

            // 2. 检查当前会话是否有效
            const verifyRes = await fetcher('/api/auth/verify')
            authenticated.value = verifyRes.authenticated
        } catch (e) {
            console.error('[Auth] Check failed:', e)
            authenticated.value = false
        } finally {
            checking.value = false
        }
    }

    /**
     * 创建口令密钥
     */
    async function setup(passkey: string) {
        const hashed = await hashPasskeyClient(passkey)
        await fetcher('/api/auth/setup', {
            method: 'POST',
            body: { passkey: hashed }
        })
        authenticated.value = true
        hasPasskey.value = true
    }

    /**
     * 登录
     */
    async function login(passkey: string) {
        const hashed = await hashPasskeyClient(passkey)
        await fetcher('/api/auth/login', {
            method: 'POST',
            body: { passkey: hashed }
        })
        authenticated.value = true
    }

    /**
     * 登出
     */
    async function logout() {
        await $fetch('/api/auth/logout', { method: 'POST' })
        authenticated.value = false
        navigateTo('/login')
    }

    return {
        authenticated,
        hasPasskey,
        checking,
        check,
        setup,
        login,
        logout
    }
}
