export const ADMIN_DROPDOWN_TRIGGER_CLASSES =
  'h-11 w-full rounded-[1.1rem] border border-slate-200/70 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm backdrop-blur-md ring-offset-background placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100';

export const ADMIN_DROPDOWN_CONTENT_CLASSES =
  'z-[110] max-h-[min(24rem,calc(100vh-1.5rem))] min-w-[var(--radix-select-trigger-width)] w-max max-w-[min(28rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.25rem] border border-slate-200/70 bg-white/95 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-100';

export const ADMIN_DROPDOWN_ITEM_CLASSES =
  'relative flex w-full cursor-default select-none items-center rounded-[0.9rem] py-2 pl-8 pr-3 text-sm outline-none transition focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-white/10 dark:focus:text-white';

export const ADMIN_DROPDOWN_PANEL_CLASSES =
  'rounded-[1.35rem] border border-slate-200/70 bg-white/95 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95';

export const ADMIN_DROPDOWN_BACKDROP_Z_INDEX = 'z-[109]';

const CJK_CHAR_WIDTH = 16;
const LATIN_CHAR_WIDTH = 8;
const DIGIT_CHAR_WIDTH = 7;
const SPACE_CHAR_WIDTH = 4;
const PUNCT_CHAR_WIDTH = 6;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

export const estimateTextWidth = (text: string): number => {
  let width = 0;
  for (const char of text.trim()) {
    if (/[\u3400-\u9fff]/.test(char)) {
      width += CJK_CHAR_WIDTH;
      continue;
    }
    if (/[A-Z]/.test(char) || /[a-z]/.test(char)) {
      width += LATIN_CHAR_WIDTH;
      continue;
    }
    if (/[0-9]/.test(char)) {
      width += DIGIT_CHAR_WIDTH;
      continue;
    }
    if (/\s/.test(char)) {
      width += SPACE_CHAR_WIDTH;
      continue;
    }
    width += PUNCT_CHAR_WIDTH;
  }
  return width;
};

export const estimateDropdownContentWidth = (
  labels: string[],
  options: {
    minWidth?: number;
    maxWidth?: number;
    extraWidth?: number;
  } = {}
): number => {
  const {
    minWidth = 240,
    maxWidth = Math.max(minWidth, typeof window !== 'undefined' ? window.innerWidth - 24 : minWidth),
    extraWidth = 56,
  } = options;

  const longestLabelWidth = labels.reduce((currentMax, label) => (
    Math.max(currentMax, estimateTextWidth(label))
  ), 0);

  return clamp(Math.ceil(longestLabelWidth + extraWidth), minWidth, maxWidth);
};

export interface FloatingDropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: 'top' | 'bottom';
}

export const computeFloatingDropdownPosition = (
  triggerRect: DOMRect,
  preferredWidth: number,
  preferredHeight: number,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
  offset = 8,
  safePadding = 12
): FloatingDropdownPosition => {
  const width = Math.min(
    Math.max(triggerRect.width, preferredWidth),
    Math.max(240, viewportWidth - safePadding * 2)
  );
  const availableBelow = viewportHeight - triggerRect.bottom - safePadding;
  const availableAbove = triggerRect.top - safePadding;
  const shouldOpenTop = availableBelow < preferredHeight && availableAbove > availableBelow;
  const placement: 'top' | 'bottom' = shouldOpenTop ? 'top' : 'bottom';
  const maxHeight = Math.max(180, Math.min(preferredHeight, placement === 'top' ? availableAbove : availableBelow));
  const top = placement === 'top'
    ? Math.max(safePadding, triggerRect.top - offset - maxHeight)
    : Math.min(viewportHeight - safePadding - maxHeight, triggerRect.bottom + offset);
  const left = Math.min(
    Math.max(safePadding, triggerRect.left),
    Math.max(safePadding, viewportWidth - safePadding - width)
  );

  return {
    top,
    left,
    width,
    maxHeight,
    placement,
  };
};
