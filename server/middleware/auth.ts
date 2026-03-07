import { AuthService } from '../utils/auth'

export default defineEventHandler((event) => {
    const url = getRequestURL(event)
    const pathname = url.pathname

    // 核心保护：只拦截 API 请求
    // 排除认证接口和图标接口
    if (
        !pathname.startsWith('/api/') || 
        pathname.startsWith('/api/auth/') || 
        pathname.startsWith('/api/_nuxt_icon/')
    ) {
        return
    }

    // 如果应用尚未初始化（未设置密钥），允许通过 API
    if (!AuthService.hasPasskey()) {
        return
    }

    // 验证会话
    const token = getCookie(event, 'subx_session')
    if (!token || !AuthService.verifySession(token)) {
        throw createError({
            statusCode: 401,
            message: '未授权，请先登录'
        })
    }
})
