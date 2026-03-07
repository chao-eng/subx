import { AuthService } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const token = getCookie(event, 'subx_session')
    if (token) {
        AuthService.destroySession(token)
    }

    deleteCookie(event, 'subx_session', { path: '/' })

    return { success: true }
})
