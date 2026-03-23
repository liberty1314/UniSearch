export const CUSTOM_EXTENSION_OPTION = 'custom';

export const API_KEY_EXTENSION_OPTIONS = [
  { value: '1', label: '1天', days: 1 },
  { value: '7', label: '7天', days: 7 },
  { value: '30', label: '30天', days: 30 },
  { value: '180', label: '半年', days: 180 },
  { value: '365', label: '一年', days: 365 },
  { value: CUSTOM_EXTENSION_OPTION, label: '自定义', days: null },
] as const;

export function isValidPositiveIntegerDays(value: string): boolean {
  return /^[1-9]\d*$/.test(value.trim());
}

export function resolveExtensionDays(
  selectedValue: string,
  customDays: string
): number | null {
  if (!selectedValue) {
    return 0;
  }

  if (selectedValue === CUSTOM_EXTENSION_OPTION) {
    return isValidPositiveIntegerDays(customDays) ? Number(customDays) : null;
  }

  const matchedOption = API_KEY_EXTENSION_OPTIONS.find((option) => option.value === selectedValue);
  return matchedOption?.days ?? null;
}

export function convertDaysToHours(days: number): number {
  return days * 24;
}

export function getExtensionDaysLabel(days: number): string {
  const matchedOption = API_KEY_EXTENSION_OPTIONS.find((option) => option.days === days);
  return matchedOption?.label ?? `${days}天`;
}

export function getExtendedExpiryDate(
  currentExpiresAt: string,
  extendDays: number,
  now: Date = new Date()
): Date | null {
  if (extendDays <= 0) {
    return null;
  }

  const currentExpiry = new Date(currentExpiresAt);
  const baseDate = currentExpiry > now ? currentExpiry : now;
  return new Date(baseDate.getTime() + convertDaysToHours(extendDays) * 60 * 60 * 1000);
}
