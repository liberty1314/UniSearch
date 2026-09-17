/**
 * 关键词高亮的纯文本分段逻辑。
 *
 * 返回安全分段（而非 HTML 字符串），由 React 渲染为 mark/文本节点，
 * 天然避免 XSS 注入路径；正则元字符全部转义后按长度降序拼接，
 * 保证长词优先匹配且分词之间互不嵌套。
 */

export interface TextHighlightSegment {
  text: string;
  highlighted: boolean;
}

/** 单个关键词最多拆出的分词数量，防止超长输入构造出病态正则 */
const MAX_KEYWORD_TOKENS = 6;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * 按空白拆分关键词并去重（大小写不敏感），限制分词数量。
 */
export const splitKeywordTokens = (keyword: string): string[] => {
  const tokens = keyword
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

  const seen = new Set<string>();
  return tokens
    .filter((token) => {
      const normalized = token.toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    })
    .slice(0, MAX_KEYWORD_TOKENS);
};

/**
 * 将文本按关键词分词切成“普通/命中”分段序列。
 * 大小写不敏感；无关键词或无命中时返回单个普通分段。
 */
export const buildHighlightSegments = (
  text: string,
  keyword?: string,
): TextHighlightSegment[] => {
  const tokens = keyword ? splitKeywordTokens(keyword) : [];
  if (!text || tokens.length === 0) {
    return text ? [{ text, highlighted: false }] : [];
  }

  const pattern = new RegExp(
    `(${tokens
      .map(escapeRegExp)
      .sort((left, right) => right.length - left.length)
      .join("|")})`,
    "gi",
  );

  const segments: TextHighlightSegment[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, index), highlighted: false });
    }
    segments.push({ text: match[0], highlighted: true });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlighted: false });
  }
  return segments;
};
