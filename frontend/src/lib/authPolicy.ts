export interface AuthPolicy {
  usernameMinLength: number;
  usernameMaxLength: number;
  passwordMinLength: number;
  passwordMaxLength: number;
  // 密码复杂度：大写/小写/数字/符号中至少满足几类（与后端 AUTH_PASSWORD_COMPLEXITY_CLASSES 对齐）。
  passwordComplexityClasses: number;
}

export const DEFAULT_AUTH_POLICY: AuthPolicy = {
  usernameMinLength: 3,
  usernameMaxLength: 32,
  passwordMinLength: 6,
  passwordMaxLength: 64,
  passwordComplexityClasses: 3,
};

// 用户名允许的字符集：字母、数字、下划线、连字符（与后端 ValidateUsernameCharset 对齐）。
export const USERNAME_CHARSET_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function resolveAuthPolicy(
  settings?: Partial<{
    auth_username_min_length: number;
    auth_username_max_length: number;
    auth_password_min_length: number;
    auth_password_max_length: number;
    auth_password_complexity_classes: number;
  }> | null
): AuthPolicy {
  return {
    usernameMinLength: settings?.auth_username_min_length ?? DEFAULT_AUTH_POLICY.usernameMinLength,
    usernameMaxLength: settings?.auth_username_max_length ?? DEFAULT_AUTH_POLICY.usernameMaxLength,
    passwordMinLength: settings?.auth_password_min_length ?? DEFAULT_AUTH_POLICY.passwordMinLength,
    passwordMaxLength: settings?.auth_password_max_length ?? DEFAULT_AUTH_POLICY.passwordMaxLength,
    passwordComplexityClasses:
      settings?.auth_password_complexity_classes ?? DEFAULT_AUTH_POLICY.passwordComplexityClasses,
  };
}
