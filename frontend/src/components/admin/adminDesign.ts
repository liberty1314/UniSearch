import {
  ACCOUNT_PANEL_BADGE_CLASSES,
  ACCOUNT_PANEL_EYEBROW_CLASSES,
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
  ACCOUNT_PANEL_TITLE_CLASSES,
} from '@/components/account/accountDesign';

export const ADMIN_PAGE_SHELL_CLASSES =
  'relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#f5f5f7] text-slate-900 dark:bg-[#000000] dark:text-white';

export const ADMIN_PAGE_BACKDROP_CLASSES =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(8,145,178,0.08),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.06),transparent_26%)]';

export const ADMIN_CONTENT_WRAPPER_CLASSES =
  'relative mx-auto flex w-full max-w-[1720px] gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8';

export const ADMIN_PAGE_HEADER_CLASSES =
  'glass-card-premium relative overflow-hidden rounded-[1.5rem] border-slate-200/55 dark:border-white/10';

export const ADMIN_PAGE_HEADER_HOVER_CLASSES =
  'hover:shadow-glass-strong hover:bg-white/68 dark:hover:bg-slate-900/58';

export const ADMIN_SECTION_HEADER_CLASSES =
  'flex items-center justify-between gap-4';

export const ADMIN_SECTION_ICON_CLASSES =
  'glass-toolbar flex h-16 w-16 items-center justify-center rounded-[1.5rem] text-slate-700 dark:text-slate-200';

export const ADMIN_PANEL_SURFACE_CLASSES = ACCOUNT_PANEL_SURFACE_CLASSES;
export const ADMIN_PANEL_SURFACE_HOVER_CLASSES = ACCOUNT_PANEL_SURFACE_HOVER_CLASSES;
export const ADMIN_PANEL_EYEBROW_CLASSES = ACCOUNT_PANEL_EYEBROW_CLASSES;
export const ADMIN_PANEL_TITLE_CLASSES = ACCOUNT_PANEL_TITLE_CLASSES;
export const ADMIN_PANEL_BADGE_CLASSES = ACCOUNT_PANEL_BADGE_CLASSES;

export const ADMIN_SUBTLE_RAIL_CLASSES =
  'glass-panel';

export const ADMIN_GENTLE_SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;

export const ADMIN_FADE_UP = { duration: 0.3, ease: 'easeOut' } as const;

export const ADMIN_HOVERABLE_BUTTON_CLASSES =
  'rounded-full border-[0.5px] border-slate-200/50 bg-white/40 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-white/60 dark:border-white/10 dark:bg-slate-800/40 dark:hover:bg-slate-800/60';
