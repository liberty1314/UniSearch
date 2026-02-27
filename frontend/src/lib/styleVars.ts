import type { CSSProperties } from 'react';

export type StyleVarValue = string | number | null | undefined;
export type StyleVarMap = Record<`--${string}`, StyleVarValue>;

/**
 * Converts CSS variable map into a React style object.
 * Undefined/null values are omitted to avoid noisy inline styles.
 */
export function toStyleVars<T extends StyleVarMap>(vars: T): CSSProperties {
  const style = {} as CSSProperties;

  for (const [key, value] of Object.entries(vars) as [keyof T, T[keyof T]][]) {
    if (value === undefined || value === null) {
      continue;
    }

    style[key as string] = String(value);
  }

  return style;
}
