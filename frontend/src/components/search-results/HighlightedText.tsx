import React from "react";
import { cn } from "@/lib/utils";
import { buildHighlightSegments } from "@/utils/textHighlight";

interface HighlightedTextProps {
  text: string;
  keyword?: string;
  className?: string;
  markClassName?: string;
}

/**
 * 按关键词渲染安全高亮文本：命中片段用 mark 语义标签包裹，
 * 分段由 buildHighlightSegments 生成，不经过任何 HTML 拼接。
 */
const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  keyword,
  className,
  markClassName,
}) => {
  const segments = buildHighlightSegments(text, keyword);
  const hasHighlight = segments.some((segment) => segment.highlighted);

  if (!hasHighlight) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark
            key={index}
            className={cn(
              "rounded-[4px] bg-blue-100/80 px-0.5 text-inherit dark:bg-blue-400/15",
              markClassName,
            )}
          >
            {segment.text}
          </mark>
        ) : (
          <React.Fragment key={index}>{segment.text}</React.Fragment>
        ),
      )}
    </span>
  );
};

export default HighlightedText;
