import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Info, Tag } from "lucide-react";

interface ResourceDetailMetaSectionProps {
  tags?: string[];
  metaEntries: Array<[string, unknown]>;
  formatMetaValue: (value: unknown) => string;
}

const ResourceDetailMetaSection: React.FC<ResourceDetailMetaSectionProps> = ({
  tags,
  metaEntries,
  formatMetaValue,
}) => {
  const hasTags = Boolean(tags && tags.length > 0);
  const hasMeta = metaEntries.length > 0;

  if (!hasTags && !hasMeta) {
    return null;
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,0.78fr),minmax(0,1.22fr)]">
      <div className="surface-panel rounded-[1.65rem] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h2
              className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white"
              style={{ fontFamily: '"Baskerville", "Times New Roman", "Songti SC", "STSong", serif' }}
            >
              标签
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              归类这条资源的关键词与主题线索。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasTags ? (
            (tags || []).map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full px-3 py-1.5">
                {tag}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">暂无标签</span>
          )}
        </div>
      </div>

      <div className="surface-panel rounded-[1.65rem] p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h2
              className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white"
              style={{ fontFamily: '"Baskerville", "Times New Roman", "Songti SC", "STSong", serif' }}
            >
              元数据
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              展示抓取到的补充字段，保留原始信息的可追溯性。
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {hasMeta ? (
            metaEntries.map(([key, value]) => (
              <div
                key={key}
                className={cn(
                  "grid gap-2 rounded-[1.25rem] border border-slate-200/70 bg-slate-50/90 p-4 text-sm dark:border-white/10 dark:bg-white/[0.04]",
                  "sm:grid-cols-[minmax(0,140px),minmax(0,1fr)]",
                )}
              >
                <div className="font-medium text-slate-500 dark:text-slate-300">{key}</div>
                <div className="break-all text-slate-950 dark:text-white">{formatMetaValue(value)}</div>
              </div>
            ))
          ) : (
            <span className="text-sm text-slate-500 dark:text-slate-400">暂无元数据</span>
          )}
        </div>
      </div>
    </section>
  );
};

export default ResourceDetailMetaSection;
