import { AuthService } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const token = getCookie(event, 'subx_session')
    const valid = token ? AuthService.verifySession(token) : false
    return { authenticated: valid }
})
