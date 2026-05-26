export const SOURCE_FOCUS_LONG_PRESS_MS = 520;
export const SOURCE_FOCUS_MENU_WIDTH = 220;
export const SOURCE_FOCUS_MENU_HEIGHT = 176;
export const SOURCE_FOCUS_MENU_MARGIN = 8;

export interface SourceFocusMenuPositionInput {
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
  menuWidth?: number;
  menuHeight?: number;
  margin?: number;
}

export interface SourceFocusMenuPosition {
  x: number;
  y: number;
}

export const clampMenuPosition = ({
  x,
  y,
  viewportWidth,
  viewportHeight,
  menuWidth = SOURCE_FOCUS_MENU_WIDTH,
  menuHeight = SOURCE_FOCUS_MENU_HEIGHT,
  margin = SOURCE_FOCUS_MENU_MARGIN,
}: SourceFocusMenuPositionInput): SourceFocusMenuPosition => ({
  x: Math.max(margin, Math.min(x, viewportWidth - menuWidth - margin * 2)),
  y: Math.max(margin, Math.min(y, viewportHeight - menuHeight - margin)),
});
