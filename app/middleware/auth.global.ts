export default defineNuxtRouteMiddleware(async (to) => {
    // 1. 完全跳过对登录页的检查逻辑
    if (to.path === '/login' || to.path === '/login/') return

    const { authenticated, hasPasskey, check } = useAuth()

    // 2. 如果尚未登录，执行认证确认
    // 在 SSR 和页面初次加载时执行 check()
    if (!authenticated.value) {
        await check()
    }

    // 3. 拦截检查
    if (!hasPasskey.value || !authenticated.value) {
        return navigateTo('/login', { replace: true })
    }
})
