export const formatDetailTime = (value?: string): string => {
  if (!value?.trim()) {
    return "未知时间";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() <= 1) {
    return "未知时间";
  }

  return parsed.toLocaleString("zh-CN");
};
