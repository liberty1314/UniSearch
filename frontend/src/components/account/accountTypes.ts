import type {
  AccountPreferences,
  AccountResultViewPreference,
  AccountThemePreference,
} from '@/lib/accountPreferences';

export interface AccountProfile {
  id: number;
  username: string;
  role: string;
  is_enabled: boolean;
  last_login_at?: string | null;
  created_at?: string;
  monthly_login_days?: string[];
  monthly_login_day_count?: number;
}

export type AccountSection = 'overview' | 'preferences' | 'security';

export type {
  AccountPreferences,
  AccountResultViewPreference,
  AccountThemePreference,
};

export const getAccountRoleLabel = (role?: string): string =>
  role === 'admin' ? '管理员' : '普通用户';
