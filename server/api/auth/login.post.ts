import { AuthService } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const { passkey } = await readBody(event)

    if (!passkey) {
        throw createError({ statusCode: 400, message: '请输入口令密钥' })
    }

    const valid = AuthService.verifyPasskey(passkey)
    if (!valid) {
        throw createError({ statusCode: 401, message: '口令密钥错误' })
    }

    const token = AuthService.createSession()

    setCookie(event, 'subx_session', token, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        sameSite: 'lax'
    })

    return { success: true }
})
