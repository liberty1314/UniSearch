import {
  ACCOUNT_PANEL_BADGE_CLASSES,
  ACCOUNT_PANEL_EYEBROW_CLASSES,
  ACCOUNT_PANEL_TITLE_CLASSES,
} from '@/components/account/accountDesign';
import { ADMIN_COMPACT_SURFACE_CLASSES, ADMIN_DENSITY } from '@/components/admin/adminDensity';

export const ADMIN_PAGE_SHELL_CLASSES =
  'surface-page relative min-h-[calc(100vh-5rem)] overflow-hidden bg-white text-slate-900 dark:text-white';

export const ADMIN_PAGE_BACKDROP_CLASSES =
  'pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(14,165,233,0.06),transparent_26%)] dark:bg-[radial-gradient(circle_at_18%_10%,rgba(37,99,235,0.20),transparent_30%),radial-gradient(circle_at_78%_14%,rgba(34,211,238,0.14),transparent_28%),linear-gradient(rgba(34,211,238,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.055)_1px,transparent_1px)] dark:bg-[length:auto,auto,48px_48px,48px_48px]';

export const ADMIN_CONTENT_WRAPPER_CLASSES =
  'relative mx-auto flex w-full max-w-[1720px] gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8';

export const ADMIN_PAGE_HEADER_CLASSES =
  'surface-panel relative overflow-hidden rounded-[1.5rem] border-slate-200/55 dark:border-cyan-300/[0.14]';

export const ADMIN_PAGE_HEADER_HOVER_CLASSES =
  'hover:border-cyan-200/70 hover:bg-white/[0.82] dark:hover:border-cyan-300/[0.24] dark:hover:bg-slate-950/[0.70]';

export const ADMIN_SECTION_HEADER_CLASSES =
  'flex items-center justify-between gap-4';

export const ADMIN_SECTION_ICON_CLASSES =
  'surface-card flex h-16 w-16 items-center justify-center rounded-[1.5rem] text-slate-700 dark:text-slate-200';

export const ADMIN_PANEL_SURFACE_CLASSES =
  `${ADMIN_COMPACT_SURFACE_CLASSES} ${ADMIN_DENSITY.cardRadius} ${ADMIN_DENSITY.cardShadow}`;
export const ADMIN_PANEL_SURFACE_HOVER_CLASSES =
  'hover:border-cyan-200/70 hover:bg-white/[0.86] hover:shadow-[0_12px_30px_rgba(15,23,42,0.065)] dark:hover:border-cyan-300/[0.24] dark:hover:bg-slate-900/[0.64] dark:hover:shadow-[0_16px_38px_rgba(8,47,73,0.28)]';
export const ADMIN_PANEL_EYEBROW_CLASSES = ACCOUNT_PANEL_EYEBROW_CLASSES;
export const ADMIN_PANEL_TITLE_CLASSES = ACCOUNT_PANEL_TITLE_CLASSES;
export const ADMIN_PANEL_BADGE_CLASSES = ACCOUNT_PANEL_BADGE_CLASSES;

export const ADMIN_SUBTLE_RAIL_CLASSES =
  'surface-card rounded-[1.35rem]';

export const ADMIN_GENTLE_SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;

export const ADMIN_FADE_UP = { duration: 0.3, ease: 'easeOut' } as const;

export const ADMIN_HOVERABLE_BUTTON_CLASSES =
  'rounded-full border-[0.5px] border-slate-200/60 bg-white/[0.46] text-slate-700 shadow-[0_4px_12px_rgba(15,23,42,0.035)] backdrop-blur-md transition-all duration-300 hover:bg-white/70 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.50] dark:text-slate-200 dark:hover:border-cyan-300/[0.24] dark:hover:bg-cyan-400/[0.08] dark:hover:text-cyan-100';
