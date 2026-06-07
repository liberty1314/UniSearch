import React from "react";
import { FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResourceDetailEmptyStateProps {
  title: string;
  description: string;
  backLabel: string;
  testId: string;
  onBack: () => void;
  retryLabel?: string;
  onRetrySearch?: () => void;
  onHome: () => void;
}

const ResourceDetailEmptyState: React.FC<ResourceDetailEmptyStateProps> = ({
  title,
  description,
  backLabel,
  testId,
  onBack,
  retryLabel,
  onRetrySearch,
  onHome,
}) => {
  return (
    <div
      data-testid={testId}
      className="relative mx-auto flex min-h-[68vh] max-w-5xl items-center overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/70 px-6 py-10 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-[28px] dark:border-white/10 dark:bg-slate-950/55 dark:shadow-[0_30px_80px_rgba(0,0,0,0.36)] sm:px-10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(140deg,rgba(255,255,255,0.48),rgba(255,255,255,0.08))] dark:bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_30%),linear-gradient(140deg,rgba(15,23,42,0.56),rgba(15,23,42,0.2))]" />
      <div className="absolute left-6 top-6 h-28 w-28 rounded-full border border-white/70 bg-white/60 blur-3xl dark:border-white/10 dark:bg-cyan-400/10" />
      <div className="relative z-10 grid w-full gap-10 lg:grid-cols-[minmax(0,0.8fr),minmax(280px,0.52fr)] lg:items-end">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-[0_12px_32px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
            <FileSearch className="h-4 w-4" />
            资源详情
          </div>
          <div className="space-y-4">
            <h1
              className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-slate-950 dark:text-white sm:text-5xl"
              style={{ fontFamily: '"Baskerville", "Times New Roman", "Songti SC", "STSong", serif' }}
            >
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-8 text-slate-600 dark:text-slate-300 sm:text-base">
              {description}
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-[2rem] border border-slate-200/70 bg-white/78 p-6 shadow-[0_20px_54px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55 dark:shadow-[0_20px_54px_rgba(0,0,0,0.3)]">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
              下一步
            </div>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              你可以返回上一个搜索视图继续查找，也可以直接回到首页重新发起检索。
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button type="button" onClick={onBack} className="rounded-full">
              {backLabel}
            </Button>
            {retryLabel && onRetrySearch ? (
              <Button
                type="button"
                variant="outline"
                onClick={onRetrySearch}
                className="rounded-full"
              >
                {retryLabel}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={onHome} className="rounded-full">
              返回首页
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceDetailEmptyState;
