import React from "react";
import { Compass, Sparkles } from "lucide-react";

interface HotPageEmptyStateProps {
  categoryLabel?: string;
}

const HotPageEmptyState: React.FC<HotPageEmptyStateProps> = ({ categoryLabel }) => {
  const isAggregateView = categoryLabel === "全部热门";

  return (
    <section className="glass-card-premium overflow-hidden px-6 py-12 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
        <Compass className="h-6 w-6" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        当前筛选暂无上榜内容
      </h2>
      <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
        当前分类：{categoryLabel || "热门内容"}。
        {isAggregateView
          ? " 可以先切换时间维度或内容分类，继续查看电影、电视剧或动漫的独立热门趋势。"
          : " 可以回到全部热门，或切换时间维度再看看是否有更适合当前口径的结果。"}
      </p>
      <div className="mx-auto mt-6 grid max-w-3xl gap-3 text-left md:grid-cols-2">
        <div className="glass-toolbar rounded-[1.35rem] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
            <Sparkles className="h-4 w-4 text-cyan-500" />
            试试切换时间维度
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            日榜更适合看短期热度，月榜和年榜更适合筛选持续热播内容。
          </p>
        </div>
        <div className="glass-toolbar rounded-[1.35rem] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
            <Compass className="h-4 w-4 text-cyan-500" />
            {isAggregateView ? "切换到单类榜单" : "回到全部热门"}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {isAggregateView
              ? "电影、电视剧和动漫的上榜趋势不同，切到单类后能更快聚焦你关心的内容。"
              : "回到全部热门后会重新展示三类内容的聚合分区，帮助你重新建立浏览路径。"}
          </p>
        </div>
      </div>
    </section>
  );
};

export default HotPageEmptyState;
