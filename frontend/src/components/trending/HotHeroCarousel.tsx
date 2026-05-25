import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  const shouldReduceMotion = useReducedMotion();
  const hasMultipleItems = items.length > 1;
  const [activeIndex, setActiveIndex] = React.useState(0);
  const firstItemId = items[0]?.id;

  const goNext = React.useCallback(() => {
    if (!hasMultipleItems) {
      return;
    }
    setActiveIndex((current) => (current + 1) % items.length);
  }, [hasMultipleItems, items.length]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [firstItemId, items.length]);

  React.useEffect(() => {
    if (!hasMultipleItems) {
      return;
    }

    const timer = window.setInterval(() => {
      goNext();
    }, 5200);

    return () => window.clearInterval(timer);
  }, [activeIndex, goNext, hasMultipleItems]);

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
    setActiveIndex(index);
  };

  const goPrev = () => {
    if (!hasMultipleItems) {
      return;
    }
    setActiveIndex((current) => (current - 1 + items.length) % items.length);
  };

  const backdropStyle = activeItem.backdrop_url
    ? {
        backgroundImage: `linear-gradient(120deg, rgba(2, 6, 23, 0.88) 10%, rgba(2, 6, 23, 0.56) 42%, rgba(2, 6, 23, 0.24) 100%), url(${activeItem.backdrop_url})`,
      }
    : {
        backgroundImage:
          "radial-gradient(circle at top left, rgba(34,211,238,0.22), transparent 34%), radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 38%), linear-gradient(135deg, #082f49 0%, #0f172a 48%, #020617 100%)",
      };

  return (
    <section
      className="space-y-4"
      data-testid={dataTestId}
      aria-roledescription="carousel"
      aria-label={`${titleMap[period]}轮播`}
    >
      <div className="glass-card-premium relative h-[520px] overflow-hidden rounded-[2rem] bg-slate-950 p-0 shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:h-[560px]">
        <AnimatePresence initial={false}>
          <motion.div
            key={`${activeItem.id}-${period}-${activeIndex}`}
            className="absolute inset-0 bg-slate-950"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.992 }}
            transition={{ duration: shouldReduceMotion ? 0.18 : 0.46, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="relative h-[520px] w-full bg-cover bg-center md:h-[560px]"
              style={backdropStyle}
              role="group"
              aria-roledescription="slide"
              aria-label={`${activeIndex + 1} / ${items.length}`}
              aria-hidden="false"
              data-active="true"
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_32%)]" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/46 to-slate-950/24" />
                <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950/90 via-slate-950/48 to-transparent" />

                <div className="relative z-10 flex h-[520px] flex-col justify-between p-6 pb-28 text-white md:h-[560px] md:p-8 md:pb-32 xl:pb-10">
                  <div className="flex min-h-0 max-w-full flex-1 flex-col lg:min-h-[400px]">
                    <motion.div
                      className="flex flex-wrap items-center gap-2.5"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                      transition={{ delay: 0.04, duration: 0.28 }}
                    >
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] backdrop-blur-md">
                        <Flame className="h-3.5 w-3.5 text-cyan-300" />
                        热门榜单
                      </span>
                      <span className="inline-flex items-center rounded-full bg-white/12 px-3 py-1.5 text-xs font-semibold backdrop-blur-md">
                        {periodLabelMap[period]}
                      </span>
                    </motion.div>

                    <motion.p
                      className="mt-6 max-w-3xl text-sm font-semibold uppercase tracking-[0.28em] text-white/55"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                      animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                      transition={{ delay: 0.08, duration: 0.32 }}
                    >
                      {titleMap[period]}
                    </motion.p>
                    <motion.h1
                      className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                      transition={{ delay: 0.12, duration: 0.36 }}
                    >
                      {activeItem.title}
                    </motion.h1>
                    <motion.p
                      className="mt-3 max-w-3xl text-base text-white/72"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                      transition={{ delay: 0.16, duration: 0.34 }}
                    >
                      {activeItem.original_title}
                    </motion.p>
                    <motion.p
                      className="mt-5 max-w-xl min-h-[5.25rem] text-sm leading-7 text-white/80 line-clamp-3 sm:min-h-[6rem] sm:text-base"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.34 }}
                    >
                      {activeItem.overview || "暂无简介"}
                    </motion.p>

                    <motion.div
                      className="mt-10 flex flex-col gap-5 lg:mt-auto lg:max-w-2xl lg:pt-16"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                      animate={shouldReduceMotion ? false : { opacity: 1, y: 0 }}
                      transition={{ delay: 0.24, duration: 0.36 }}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="button"
                          size="md"
                          onClick={() => onSearch(activeItem)}
                          className="rounded-full bg-white px-5 text-slate-900 shadow-[0_14px_36px_rgba(255,255,255,0.14)] hover:bg-white/92 hover:text-slate-950"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          立即搜索榜首内容
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
                            {activeItem.popularity.toFixed(0)}
                          </p>
                        </div>

                        <div className="rounded-[1.4rem] border border-white/12 bg-white/7 px-4 py-4 backdrop-blur-md sm:col-span-2 xl:col-span-1">
                          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-white/58">
                            <Star className="h-3.5 w-3.5 text-orange-300" />
                            评分
                          </div>
                          <p className="mt-3 text-2xl font-bold tracking-tight text-white">
                            {activeItem.vote_average.toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
            </div>
          </motion.div>
        </AnimatePresence>

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
                    aria-label={`切换到第 ${index + 1} 项：${item.title}`}
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
