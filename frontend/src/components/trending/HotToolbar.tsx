import React from "react";
import HotCategoryTabs from "@/components/trending/HotCategoryTabs";
import HotPeriodTabs from "@/components/trending/HotPeriodTabs";
import type { HotRankingCategory, HotRankingPeriod } from "@/types/hotRanking";

interface HotToolbarProps {
  period: HotRankingPeriod;
  category: HotRankingCategory;
  onPeriodChange: (value: HotRankingPeriod) => void;
  onCategoryChange: (value: HotRankingCategory) => void;
}

const HotToolbar: React.FC<HotToolbarProps> = ({
  period,
  category,
  onPeriodChange,
  onCategoryChange,
}) => {
  return (
    <section className="glass-card-premium p-5 md:p-6">
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="glass-toolbar rounded-[1.35rem] p-3">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              时间维度
            </p>
            <div className="mt-3">
              <HotPeriodTabs value={period} onChange={onPeriodChange} />
            </div>
          </div>

          <div className="glass-toolbar rounded-[1.35rem] p-3">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              内容分类
            </p>
            <div className="mt-3">
              <HotCategoryTabs value={category} onChange={onCategoryChange} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HotToolbar;
