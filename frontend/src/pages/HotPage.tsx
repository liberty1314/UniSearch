import React from "react";
import { startTransition } from "react";
import { useNavigate } from "react-router-dom";
import PublicPageShell from "@/components/PublicPageShell";
import SEO from "@/components/SEO";
import HotHeroCarousel from "@/components/trending/HotHeroCarousel";
import HotToolbar from "@/components/trending/HotToolbar";
import HotMediaGrid from "@/components/trending/HotMediaGrid";
import HotPageSkeleton from "@/components/trending/HotPageSkeleton";
import HotPageErrorState from "@/components/trending/HotPageErrorState";
import HotPageEmptyState from "@/components/trending/HotPageEmptyState";
import {
  buildHeroItems,
  buildHotPageMeta,
  filterDuplicateSpotlight,
} from "@/components/trending/hotRankingPresentation";
import { hotRankingService } from "@/services/hotRankingService";
import { SearchService } from "@/services/searchService";
import type {
  HotRankingCategory,
  HotRankingItem,
  HotRankingPeriod,
  HotRankingResponse,
} from "@/types/hotRanking";

const DEFAULT_PERIOD: HotRankingPeriod = "day";
const DEFAULT_CATEGORY: HotRankingCategory = "movie";

const HotPage: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = React.useState<HotRankingPeriod>(DEFAULT_PERIOD);
  const [category, setCategory] = React.useState<HotRankingCategory>(DEFAULT_CATEGORY);
  const [data, setData] = React.useState<HotRankingResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState("");

  const loadRankings = React.useCallback(async (nextPeriod: HotRankingPeriod, nextCategory: HotRankingCategory) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await hotRankingService.getHotRankings({
        period: nextPeriod,
        category: nextCategory,
      });
      setData(response);
    } catch (error) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: string }).message === "string"
          ? (error as { message: string }).message
          : "请稍后重试";
      setErrorMessage(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadRankings(period, category);
  }, [category, loadRankings, period]);

  const handlePeriodChange = (value: HotRankingPeriod) => {
    startTransition(() => {
      setPeriod(value);
    });
  };

  const handleCategoryChange = (value: HotRankingCategory) => {
    startTransition(() => {
      setCategory(value);
    });
  };

  const handleRetry = () => {
    void loadRankings(period, category);
  };

  const handleSearch = (item: HotRankingItem) => {
    navigate(
      SearchService.buildSearchUrl({
        keyword: item.title,
        source: "all",
        resultType: "merge",
        cloudTypes: [],
        channels: [],
        plugins: [],
        concurrency: 5,
        refresh: false,
        ext: {},
      }),
    );
  };

  const firstSection = data?.sections[0];
  const pageMeta = buildHotPageMeta(data, category);
  const heroItems = React.useMemo(() => buildHeroItems(firstSection), [firstSection]);
  const deduplicatedSection = firstSection
    ? {
        ...firstSection,
        items: filterDuplicateSpotlight(firstSection.spotlight, firstSection.items),
      }
    : null;
  const hasHeroItems = heroItems.length > 0;
  const hasListItems = Boolean(deduplicatedSection && deduplicatedSection.items.length > 0);

  return (
    <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-16">
      <SEO
        title="热门内容 | UniSearch"
        description="查看电影、电视剧与动漫的 TMDB 热门榜单，并快速跳转站内搜索相关资源。"
      />

      <div className="mx-auto max-w-6xl space-y-8">
        {!loading && !errorMessage && hasHeroItems ? (
          <HotHeroCarousel
            period={period}
            meta={pageMeta}
            items={heroItems}
            onSearch={handleSearch}
            data-testid="hot-page-hero"
          />
        ) : null}

        <HotToolbar
          period={period}
          category={category}
          onPeriodChange={handlePeriodChange}
          onCategoryChange={handleCategoryChange}
        />

        {loading ? <HotPageSkeleton /> : null}

        {!loading && errorMessage ? (
          <HotPageErrorState message={errorMessage} onRetry={handleRetry} />
        ) : null}

        {!loading && !errorMessage && hasListItems && deduplicatedSection ? (
          <div className="space-y-8">
            <HotMediaGrid section={deduplicatedSection} onSearch={handleSearch} />
          </div>
        ) : null}

        {!loading && !errorMessage && !hasHeroItems && !hasListItems ? (
          <HotPageEmptyState categoryLabel={pageMeta.categoryLabel} />
        ) : null}
      </div>
    </PublicPageShell>
  );
};

export default HotPage;
