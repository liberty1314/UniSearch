import React from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HotPageErrorStateProps {
  categoryLabel?: string;
  message: string;
  onRetry: () => void;
}

const HotPageErrorState: React.FC<HotPageErrorStateProps> = ({
  categoryLabel,
  message,
  onRetry,
}) => {
  const isAggregateView = categoryLabel === "全部热门";

  return (
    <section className="glass-card-premium overflow-hidden px-6 py-12 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
        <TriangleAlert className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        获取热门内容失败
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
        热门榜单服务暂时没有返回可展示的数据，你可以稍后重新加载，
        {isAggregateView
          ? " 或先切换到电影、电视剧、动漫等单类口径继续浏览。"
          : " 或先回到全部热门、切换其他时间维度继续浏览。"}
      </p>
      <div className="mx-auto mt-5 max-w-2xl rounded-[1.4rem] border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-left text-sm text-amber-900 dark:border-amber-400/15 dark:bg-amber-500/10 dark:text-amber-100/90">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300/80">
          错误详情
        </p>
        <p className="mt-2 leading-6">{message}</p>
      </div>
      <div className="mt-6 flex justify-center">
        <Button type="button" size="md" onClick={onRetry} className="rounded-full">
          <RotateCcw className="mr-2 h-4 w-4" />
          重新加载
        </Button>
      </div>
    </section>
  );
};

export default HotPageErrorState;
