import { AuthService } from '../../utils/auth'

export default defineEventHandler(async () => {
    const hasPasskey = AuthService.hasPasskey()
    return { hasPasskey }
})
