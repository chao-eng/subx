import { sha256 } from 'js-sha256'

/**
 * 客户端 SHA-256 加密工具
 * 优先使用浏览器原生 Crypto API (仅在 Secure Contexts 下可用)
 * 在非 HTTPS (且非 localhost) 环境下回退到 js-sha256
 */
export async function hashPasskeyClient(passkey: string): Promise<string> {
    // 检查原生支持 (HTTPS 或 localhost)
    if (globalThis.crypto?.subtle) {
        try {
            const msgUint8 = new TextEncoder().encode(passkey);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            console.warn('[Auth] Native crypto failed, falling back to js-sha256:', e);
        }
    }

    // fallback: 使用 js-sha256 (兼容所有环境)
    return sha256(passkey);
}
