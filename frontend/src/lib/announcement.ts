/**
 * 将 Markdown 文本压缩为适合列表摘要展示的纯文本。
 */
export const getAnnouncementPlainText = (content: string): string => {
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^#+\s*/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * 获取公告摘要文本，超出长度时追加省略号。
 */
export const getAnnouncementPreviewText = (content: string, limit: number): string => {
  const plainText = getAnnouncementPlainText(content);
  if (plainText.length <= limit) {
    return plainText;
  }
  return `${plainText.slice(0, limit)}...`;
};

export type AnnouncementLifecycleStatus = 'scheduled' | 'active' | 'expired';

export const getAnnouncementLifecycleStatus = (announcement: {
  start_time: string;
  end_time: string | null;
}): AnnouncementLifecycleStatus => {
  const now = new Date();
  const startTime = new Date(announcement.start_time);
  const endTime = announcement.end_time ? new Date(announcement.end_time) : null;

  if (startTime > now) {
    return 'scheduled';
  }
  if (endTime && endTime < now) {
    return 'expired';
  }
  return 'active';
};

export const getAnnouncementLifecycleLabel = (status: AnnouncementLifecycleStatus): string => {
  switch (status) {
    case 'scheduled':
      return '未生效';
    case 'expired':
      return '已过期';
    default:
      return '进行中';
  }
};

export const getAnnouncementLifecycleColor = (status: AnnouncementLifecycleStatus): string => {
  switch (status) {
    case 'scheduled':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300';
    case 'expired':
      return 'bg-slate-200 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300';
    default:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
  }
};
