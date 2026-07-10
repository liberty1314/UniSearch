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
      className="mx-auto flex min-h-[68vh] max-w-5xl items-center overflow-hidden rounded-[20px] border border-slate-200 bg-white px-6 py-10 shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-900 sm:px-10"
    >
      <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,0.8fr),minmax(280px,0.52fr)] lg:items-end">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
            <FileSearch className="h-4 w-4" />
            资源详情
          </div>
          <div className="space-y-4">
            <h1
              className="max-w-3xl text-3xl font-bold leading-tight tracking-normal text-slate-950 dark:text-white sm:text-4xl"
            >
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-8 text-slate-600 dark:text-slate-300 sm:text-base">
              {description}
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-white/10 dark:bg-white/[0.04]">
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
