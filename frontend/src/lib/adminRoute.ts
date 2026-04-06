export const ADMIN_VIEWS = [
  'system_info',
  'user_management',
  'system_settings',
  'announcement_management',
] as const;

export type AdminView = typeof ADMIN_VIEWS[number];

export const DEFAULT_ADMIN_VIEW: AdminView = 'system_info';

export const isAdminView = (value: string | null): value is AdminView =>
  value !== null && ADMIN_VIEWS.includes(value as AdminView);

export const buildAdminUrl = (view: AdminView = DEFAULT_ADMIN_VIEW) => `/admin?view=${view}`;
