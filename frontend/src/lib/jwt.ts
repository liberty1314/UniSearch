/**
 * JWT 解析工具（仅解析 payload，不做签名校验；校验由后端负责）。
 */

export interface JWTPayload {
  user_id?: number;
  username?: string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * 解析 JWT payload。解析失败（格式非法、非 JWT）时返回 null。
 */
export const parseJWT = (token: string): JWTPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as JWTPayload;
  } catch {
    return null;
  }
};

/**
 * 从 access token 推断是否为管理员。
 * 角色以后端签发的 JWT 为准，避免前端凭"用了哪个登录入口"硬编码身份。
 */
export const deriveIsAdminFromToken = (token: string): boolean => {
  const payload = parseJWT(token);
  return payload?.role === 'admin';
};
