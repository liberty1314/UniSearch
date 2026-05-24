import React from "react";
import { Search, Star } from "lucide-react";
import type { HotRankingItem } from "@/types/hotRanking";
import type { HotRankingCategory } from "@/types/hotRanking";
import { getHotCategoryLabel } from "@/components/trending/hotRankingPresentation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface HotMediaCardProps {
  item: HotRankingItem;
  rank: number;
  category: HotRankingCategory;
  onSearch: (item: HotRankingItem) => void;
}

const HotMediaCard: React.FC<HotMediaCardProps> = ({ item, rank, category, onSearch }) => {
  return (
    <Card className="group p-4 md:p-5" data-testid="hot-media-card">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative h-40 w-full overflow-hidden rounded-[1.4rem] bg-slate-100 sm:h-36 sm:w-28 sm:shrink-0 dark:bg-slate-800">
          <div className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-slate-950/78 px-2.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-white shadow-[0_10px_24px_rgba(15,23,42,0.24)]">
            #{rank}
          </div>
          {item.poster_url ? (
            <img
              src={item.poster_url}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_46%),linear-gradient(135deg,#e2e8f0,#cbd5e1)] text-sm font-medium text-slate-500 dark:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_42%),linear-gradient(135deg,#0f172a,#1e293b)] dark:text-slate-300">
              暂无海报
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  排名 #{rank}
                </p>
                <span className="rounded-full border border-slate-200/70 bg-white/75 px-2.5 py-0.5 text-[11px] font-medium text-slate-500 dark:border-white/10 dark:bg-slate-900/45 dark:text-slate-300">
                  {getHotCategoryLabel(category)}
                </span>
              </div>
              <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                {item.title}
              </h3>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {item.original_title}
              </p>
            </div>

            <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Star className="h-3.5 w-3.5" />
              {item.vote_average.toFixed(1)}
            </div>
          </div>

          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300/85">
            {item.overview || "暂无简介"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {item.genre_names.map((genre) => (
              <span
                key={genre}
                className="rounded-full border border-slate-200/70 bg-white/75 px-3 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300"
              >
                {genre}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>上映/首播：{item.release_date || "未知"}</span>
              <span>热度 {item.popularity.toFixed(0)}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSearch(item)}
              className="rounded-full"
            >
              <Search className="mr-2 h-4 w-4" />
              搜索
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HotMediaCard;
