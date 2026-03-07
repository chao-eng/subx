import { AuthService } from '../../utils/auth'

export default defineEventHandler(async (event) => {
    const { passkey } = await readBody(event)

    if (!passkey || typeof passkey !== 'string' || passkey.length < 4) {
        throw createError({ statusCode: 400, message: '口令密钥长度不得少于 4 个字符' })
    }

    if (AuthService.hasPasskey()) {
        throw createError({ statusCode: 409, message: '口令密钥已存在' })
    }

    try {
        AuthService.setupPasskey(passkey)
        const token = AuthService.createSession()

        setCookie(event, 'subx_session', token, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
            sameSite: 'lax'
        })

        return { success: true }
    } catch (e: any) {
        throw createError({ statusCode: 500, message: e.message })
    }
})
