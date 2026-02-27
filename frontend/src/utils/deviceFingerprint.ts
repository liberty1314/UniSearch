/**
 * 设备指纹生成工具
 * 用于生成唯一的设备标识，用于"记住我"功能的安全验证
 */

/**
 * 生成设备指纹
 * 基于浏览器特征生成唯一标识
 */
export async function generateDeviceFingerprint(): Promise<string> {
    const components: string[] = [];

    // 1. User Agent
    components.push(navigator.userAgent);

    // 2. 屏幕分辨率
    components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

    // 3. 时区
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // 4. 语言
    components.push(navigator.language);

    // 5. 平台
    components.push(navigator.platform);

    // 6. Canvas 指纹
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillStyle = '#f60';
            ctx.fillRect(0, 0, 100, 50);
            ctx.fillStyle = '#069';
            ctx.fillText('UniSearch', 2, 15);
            components.push(canvas.toDataURL());
        }
    } catch (e) {
        // Canvas 指纹生成失败，跳过
    }

    // 7. WebGL 指纹
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl && gl instanceof WebGLRenderingContext) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
                components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
            }
        }
    } catch (e) {
        // WebGL 指纹生成失败，跳过
    }

    // 8. 硬件并发数
    components.push(String(navigator.hardwareConcurrency || 0));

    // 9. 设备内存（如果可用）
    if ('deviceMemory' in navigator) {
        components.push(String((navigator as any).deviceMemory));
    }

    // 组合所有特征并生成哈希
    const fingerprint = components.join('|');
    return await hashString(fingerprint);
}

/**
 * 使用 SHA-256 哈希字符串
 */
async function hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 获取或生成设备指纹（带缓存）
 * 首次生成后会缓存到 localStorage（跨重启保持稳定）
 */
export async function getDeviceFingerprint(): Promise<string> {
    const fingerprintStorageKey = 'device_fingerprint_v1';
    const cached = localStorage.getItem(fingerprintStorageKey);
    if (cached) {
        return cached;
    }

    const fingerprint = await generateDeviceFingerprint();
    localStorage.setItem(fingerprintStorageKey, fingerprint);
    return fingerprint;
}
