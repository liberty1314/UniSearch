import React from "react";
import { Search, Star } from "lucide-react";
import type { HotRankingItem } from "@/types/hotRanking";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface HotHighlightGridProps {
  item?: HotRankingItem;
  onSearch: (item: HotRankingItem) => void;
}

const HotHighlightGrid: React.FC<HotHighlightGridProps> = ({ item, onSearch }) => {
  if (!item) {
    return null;
  }

  const genreNames = Array.isArray(item.genre_names) ? item.genre_names : [];

  return (
    <Card className="overflow-hidden p-0" data-testid="hot-page-highlight">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative min-h-[320px] overflow-hidden bg-slate-950">
          {item.backdrop_url ? (
            <img
              src={item.backdrop_url}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover opacity-80"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.32),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.28),transparent_38%),linear-gradient(135deg,#082f49,#0f172a)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/10" />
          <div className="relative z-10 flex h-full flex-col justify-end p-6 text-white">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
              <span className="rounded-full bg-white/16 px-2 py-0.5 text-[11px] tracking-[0.2em] text-white/92">
                #1
              </span>
              <Star className="h-3.5 w-3.5 text-amber-300" />
              榜首推荐
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">榜首推荐：{item.title}</h2>
            <p className="mt-2 text-sm text-white/70">{item.original_title}</p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">
              {item.overview || "暂无简介"}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-6 p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              热门标签
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(genreNames.length > 0 ? genreNames : ["待补充"]).map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.50] dark:text-slate-300"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="glass-toolbar rounded-[1.25rem] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                热度值
              </p>
              <p className="mt-1.5 text-base font-semibold text-slate-900 dark:text-slate-50">
                {item.popularity.toFixed(0)}
              </p>
            </div>
            <div className="glass-toolbar rounded-[1.25rem] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                上映/首播
              </p>
              <p className="mt-1.5 text-base font-semibold text-slate-900 dark:text-slate-50">
                {item.release_date || "未知"}
              </p>
            </div>
            <div className="glass-toolbar rounded-[1.25rem] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                评分人数
              </p>
              <p className="mt-1.5 text-base font-semibold text-slate-900 dark:text-slate-50">
                {item.vote_count}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="button" size="md" onClick={() => onSearch(item)} className="rounded-full sm:flex-1">
              <Search className="mr-2 h-4 w-4" />
              搜索
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default HotHighlightGrid;
