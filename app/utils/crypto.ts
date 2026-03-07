/**
 * 客户端 SHA-256 加密工具
 * 使用浏览器原生 Crypto API，无需额外依赖
 */
export async function hashPasskeyClient(passkey: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(passkey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
