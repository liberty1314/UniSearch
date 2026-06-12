export interface AuthPolicy {
  usernameMinLength: number;
  usernameMaxLength: number;
  passwordMinLength: number;
  passwordMaxLength: number;
}

export const DEFAULT_AUTH_POLICY: AuthPolicy = {
  usernameMinLength: 3,
  usernameMaxLength: 32,
  passwordMinLength: 6,
  passwordMaxLength: 64,
};

export function resolveAuthPolicy(
  settings?: Partial<{
    auth_username_min_length: number;
    auth_username_max_length: number;
    auth_password_min_length: number;
    auth_password_max_length: number;
  }> | null
): AuthPolicy {
  return {
    usernameMinLength: settings?.auth_username_min_length ?? DEFAULT_AUTH_POLICY.usernameMinLength,
    usernameMaxLength: settings?.auth_username_max_length ?? DEFAULT_AUTH_POLICY.usernameMaxLength,
    passwordMinLength: settings?.auth_password_min_length ?? DEFAULT_AUTH_POLICY.passwordMinLength,
    passwordMaxLength: settings?.auth_password_max_length ?? DEFAULT_AUTH_POLICY.passwordMaxLength,
  };
}
