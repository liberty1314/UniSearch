export interface AccountProfile {
  id: number;
  username: string;
  role: string;
  is_enabled: boolean;
  last_login_at?: string | null;
  created_at?: string;
}

export type AccountSection = 'overview' | 'security';

export const getAccountRoleLabel = (role?: string): string =>
  role === 'admin' ? '管理员' : '普通用户';
