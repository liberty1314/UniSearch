import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Flame, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHotCategoryLabel } from "@/components/trending/hotRankingPresentation";
import type { HotRankingItem, HotRankingPeriod } from "@/types/hotRanking";
import type { HotPageMeta } from "@/components/trending/hotRankingPresentation";

const titleMap: Record<HotRankingPeriod, string> = {
  day: "每日热门内容",
  week: "每周热门内容",
  month: "每月热门内容",
  year: "每年热门内容",
};

const periodLabelMap: Record<HotRankingPeriod, string> = {
  day: "日榜",
  week: "周榜",
  month: "月榜",
  year: "年榜",
};

interface HotHeroCarouselProps {
  period: HotRankingPeriod;
  meta: HotPageMeta;
  items: HotRankingItem[];
  onSearch: (item: HotRankingItem) => void;
  "data-testid"?: string;
}

const HotHeroCarousel: React.FC<HotHeroCarouselProps> = ({
  period,
  meta,
  items,
  onSearch,
  "data-testid": dataTestId,
}) => {
  const hasMultipleItems = items.length > 1;
  const loopedItems = React.useMemo(
    () =>
      hasMultipleItems
        ? [items[items.length - 1], ...items, items[0]]
        : items,
    [hasMultipleItems, items],
  );
  const [displayIndex, setDisplayIndex] = React.useState(hasMultipleItems ? 1 : 0);
  const [enableTransition, setEnableTransition] = React.useState(true);
  const loopResetRef = React.useRef<"head" | "tail" | null>(null);

  React.useEffect(() => {
    setEnableTransition(false);
    setDisplayIndex(hasMultipleItems ? 1 : 0);

    const frame = window.requestAnimationFrame(() => {
      setEnableTransition(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hasMultipleItems, items.length, items[0]?.id]);

  React.useEffect(() => {
    if (!hasMultipleItems) {
      return;
    }

    const timer = window.setInterval(() => {
      goNext();
    }, 5200);

    return () => window.clearInterval(timer);
  });

  const activeIndex = hasMultipleItems
    ? (displayIndex - 1 + items.length) % items.length
    : 0;
  const activeItem = items[activeIndex];
  const activeCategoryLabel =
    meta.sectionCount > 1
      ? getHotCategoryLabel(activeItem?.ranking_category ?? "movie")
      : meta.categoryLabel;
  if (!activeItem) {
    return null;
  }

  const switchTo = (index: number) => {
    if (!hasMultipleItems) {
      return;
    }

    setEnableTransition(true);
    setDisplayIndex(index + 1);
  };

  const goPrev = () => {
    if (!hasMultipleItems) {
      return;
    }

    setEnableTransition(true);
    if (displayIndex === 1) {
      loopResetRef.current = "head";
      setDisplayIndex(0);
      return;
    }

    setDisplayIndex((current) => current - 1);
  };

  const goNext = () => {
    if (!hasMultipleItems) {
      return;
    }

    setEnableTransition(true);
    if (displayIndex === items.length) {
      loopResetRef.current = "tail";
      setDisplayIndex(items.length + 1);
      return;
    }

    setDisplayIndex((current) => current + 1);
  };

  const handleTrackAnimationComplete = () => {
    if (loopResetRef.current === "tail") {
      loopResetRef.current = null;
      setEnableTransition(false);
      setDisplayIndex(1);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setEnableTransition(true);
        });
      });
      return;
    }

    if (loopResetRef.current === "head") {
      loopResetRef.current = null;
      setEnableTransition(false);
      setDisplayIndex(items.length);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setEnableTransition(true);
        });
      });
    }
  };

  return (
    <section
      className="space-y-4"
      data-testid={dataTestId}
      aria-roledescription="carousel"
      aria-label={`${titleMap[period]}轮播`}
    >
      <div className="glass-card-premium relative min-h-[520px] overflow-hidden rounded-[2rem] bg-slate-950 p-0 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <motion.div
          className="flex h-full"
          animate={{ x: `-${displayIndex * 100}%` }}
          transition={enableTransition ? { duration: 0.68, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
          onAnimationComplete={handleTrackAnimationComplete}
        >
          {loopedItems.map((item, index) => {
            const isActiveSlide = hasMultipleItems ? index === displayIndex : true;
            const realPosition = hasMultipleItems
              ? ((index - 1 + items.length) % items.length) + 1
              : 1;
            const backdropStyle = item.backdrop_url
              ? {
                  backgroundImage: `linear-gradient(120deg, rgba(2, 6, 23, 0.88) 10%, rgba(2, 6, 23, 0.56) 42%, rgba(2, 6, 23, 0.24) 100%), url(${item.backdrop_url})`,
                }
              : {
                  backgroundImage:
                    "radial-gradient(circle at top left, rgba(34,211,238,0.22), transparent 34%), radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 38%), linear-gradient(135deg, #082f49 0%, #0f172a 48%, #020617 100%)",
                };

            return (
              <div
                key={`${item.id}-${index}`}
                className="relative min-h-[520px] w-full shrink-0 bg-cover bg-center"
                style={backdropStyle}
                role="group"
                aria-roledescription="slide"
                aria-label={`${realPosition} / ${items.length}`}
                aria-hidden={!isActiveSlide}
                data-active={isActiveSlide ? "true" : "false"}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_32%)]" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/46 to-slate-950/24" />
                <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950/90 via-slate-950/48 to-transparent" />

                <div className="relative z-10 flex min-h-[520px] flex-col justify-between p-6 pb-28 text-white md:p-8 md:pb-32 xl:pb-10">
                  <div className="flex max-w-full flex-col lg:min-h-[400px]">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] backdrop-blur-md">
                        <Flame className="h-3.5 w-3.5 text-cyan-300" />
                        热门榜单
                      </span>
                      <span className="inline-flex items-center rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                        {periodLabelMap[period]}
                      </span>
                    </div>

                    <p className="mt-6 max-w-3xl text-sm font-semibold uppercase tracking-[0.28em] text-white/55">
                      {titleMap[period]}
                    </p>
                    <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
                      {item.title}
                    </h1>
                    <p className="mt-3 max-w-3xl text-base text-white/72">
                      {item.original_title}
                    </p>
                    <p className="mt-5 max-w-xl text-sm leading-7 text-white/80 line-clamp-3 sm:text-base">
                      {item.overview || "暂无简介"}
                    </p>

                    <div className="mt-10 flex flex-col gap-5 lg:mt-auto lg:max-w-2xl lg:pt-16">
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          size="md"
                          onClick={() => onSearch(item)}
                          tabIndex={isActiveSlide ? 0 : -1}
                          className="rounded-full bg-white px-5 text-slate-900 shadow-[0_14px_36px_rgba(255,255,255,0.14)] hover:bg-white/92 hover:text-slate-950"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          立即搜索榜首内容
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="md"
                          onClick={goNext}
                          disabled={!hasMultipleItems}
                          tabIndex={isActiveSlide ? 0 : -1}
                          className="rounded-full border border-white/14 bg-white/6 px-5 text-white backdrop-blur-md hover:bg-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          查看其他轮播项
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-[1.4rem] border border-white/12 bg-white/7 px-4 py-4 backdrop-blur-md">
                          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-white/58">
                            <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                            当前分类
                          </div>
                          <p className="mt-3 text-2xl font-bold tracking-tight text-white">
                            {activeCategoryLabel}
                          </p>
                        </div>

                        <div className="rounded-[1.4rem] border border-white/12 bg-white/7 px-4 py-4 backdrop-blur-md">
                          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-white/58">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                            榜首热度
                          </div>
                          <p className="mt-3 text-2xl font-bold tracking-tight text-white">
                            {item.popularity.toFixed(0)}
                          </p>
                        </div>

                        <div className="rounded-[1.4rem] border border-white/12 bg-white/7 px-4 py-4 backdrop-blur-md sm:col-span-2 xl:col-span-1">
                          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-white/58">
                            <Star className="h-3.5 w-3.5 text-orange-300" />
                            评分
                          </div>
                          <p className="mt-3 text-2xl font-bold tracking-tight text-white">
                            {item.vote_average.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>

      </div>

      {hasMultipleItems ? (
        <div className="flex items-center justify-center gap-3 px-2">
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={goPrev}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100"
              aria-label="上一张"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-white/88 px-3 py-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 backdrop-blur-md">
              {items.map((item, index) => {
                const previewImage = item.backdrop_url || item.poster_url;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switchTo(index)}
                    className={`group relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition-all md:h-20 md:w-32 ${
                      index === activeIndex
                        ? "border-sky-400 shadow-[0_0_0_3px_rgba(56,189,248,0.22)]"
                        : "border-slate-200 opacity-80 hover:opacity-100"
                    }`}
                    aria-label={`切换到 ${item.title}`}
                  >
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt={item.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-[linear-gradient(135deg,#cbd5e1,#94a3b8)]" />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/18 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 px-2 pb-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
                        #{index + 1}
                      </p>
                      <p className="mt-1 line-clamp-1 text-xs font-semibold text-white">
                        {item.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-100"
              aria-label="下一张"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default HotHeroCarousel;
