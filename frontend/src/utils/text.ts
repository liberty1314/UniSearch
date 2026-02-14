/**
 * 文本处理工具函数
 */

/**
 * 移除 HTML 标签
 * @param html - 包含 HTML 标签的字符串
 * @returns 纯文本字符串
 */
export const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * 截断文本
 * @param text - 要截断的文本
 * @param maxLength - 最大长度（默认 100）
 * @returns 截断后的文本
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  const stripped = stripHtmlTags(text);
  return stripped.length > maxLength 
    ? `${stripped.slice(0, maxLength)}...` 
    : stripped;
};

/**
 * 高亮关键词
 * @param text - 原始文本
 * @param keyword - 要高亮的关键词
 * @returns 包含高亮标记的 HTML 字符串
 */
export const highlightKeyword = (text: string, keyword: string): string => {
  if (!keyword) return text;
  
  const regex = new RegExp(`(${keyword})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};
