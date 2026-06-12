import {
  ACCOUNT_PANEL_BADGE_CLASSES,
  ACCOUNT_PANEL_EYEBROW_CLASSES,
  ACCOUNT_PANEL_TITLE_CLASSES,
} from '@/components/account/accountDesign';
import { ADMIN_COMPACT_SURFACE_CLASSES, ADMIN_DENSITY } from '@/components/admin/adminDensity';

export const ADMIN_PAGE_SHELL_CLASSES =
  'relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#f5f5f7] text-slate-900 dark:bg-[#000000] dark:text-white';

export const ADMIN_PAGE_BACKDROP_CLASSES =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(8,145,178,0.08),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.06),transparent_26%)]';

export const ADMIN_CONTENT_WRAPPER_CLASSES =
  'relative mx-auto flex w-full max-w-[1720px] gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8';

export const ADMIN_PAGE_HEADER_CLASSES =
  'glass-card-premium relative overflow-hidden rounded-[1.5rem] border-slate-200/55 dark:border-cyan-300/[0.14]';

export const ADMIN_PAGE_HEADER_HOVER_CLASSES =
  'hover:shadow-glass-strong hover:bg-white/68 dark:hover:bg-slate-950/[0.68]';

export const ADMIN_SECTION_HEADER_CLASSES =
  'flex items-center justify-between gap-4';

export const ADMIN_SECTION_ICON_CLASSES =
  'glass-toolbar flex h-16 w-16 items-center justify-center rounded-[1.5rem] text-slate-700 dark:text-slate-200';

export const ADMIN_PANEL_SURFACE_CLASSES =
  `${ADMIN_COMPACT_SURFACE_CLASSES} ${ADMIN_DENSITY.cardRadius} ${ADMIN_DENSITY.cardShadow}`;
export const ADMIN_PANEL_SURFACE_HOVER_CLASSES =
  'hover:border-cyan-200/70 hover:bg-white/78 dark:hover:border-cyan-300/[0.26] dark:hover:bg-slate-950/[0.72]';
export const ADMIN_PANEL_EYEBROW_CLASSES = ACCOUNT_PANEL_EYEBROW_CLASSES;
export const ADMIN_PANEL_TITLE_CLASSES = ACCOUNT_PANEL_TITLE_CLASSES;
export const ADMIN_PANEL_BADGE_CLASSES = ACCOUNT_PANEL_BADGE_CLASSES;

export const ADMIN_SUBTLE_RAIL_CLASSES =
  'rounded-[1.35rem] border-[0.5px] border-slate-200/65 bg-white/[0.62] shadow-[0_8px_22px_rgba(15,23,42,0.06)] backdrop-blur-lg dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:shadow-[0_12px_28px_rgba(2,6,23,0.28)]';

export const ADMIN_GENTLE_SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;

export const ADMIN_FADE_UP = { duration: 0.3, ease: 'easeOut' } as const;

export const ADMIN_HOVERABLE_BUTTON_CLASSES =
  'rounded-full border-[0.5px] border-slate-200/50 bg-white/40 text-slate-700 shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-white/60 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.52] dark:text-slate-200 dark:hover:border-cyan-300/[0.24] dark:hover:bg-cyan-400/[0.08] dark:hover:text-cyan-100';
