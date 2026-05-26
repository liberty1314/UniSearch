import React, { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import SearchBox from "@/components/SearchBox";
import SearchResults from "@/components/SearchResults";
import SearchUnifiedFilterCard from "@/components/SearchUnifiedFilterCard";
import PublicPageShell from "@/components/PublicPageShell";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useSearchUrlSync } from "@/hooks/useSearchUrlSync";
import { useSearchAccessStatus } from "@/stores/searchAccessStore";
import { useSearchStore } from "@/stores/searchStore";

const SearchPage: React.FC = () => {
  const {
    searchParams,
    setSearchParams,
    clearResults,
  } = useSearchStore();
  const { status: searchAccessStatus } = useSearchAccessStatus();
  useSearchUrlSync();
  const location = useLocation();
  const navigate = useNavigate();
  const showSearchAccessHint = searchAccessStatus === "anonymous";

  const hasKeyword = useMemo(
    () => Boolean(searchParams.keyword?.trim()),
    [searchParams.keyword],
  );

  const handleBack = () => {
    clearResults();
    setSearchParams({ keyword: "" });

    if (location.key !== "default") {
      navigate(-1);
      return;
    }

    navigate("/", {
      replace: true,
      state: {
        skipHomeEntrance: true,
        resetHomeSearchBox: true,
        routeTransition: "backward",
        transitionSource: "search-back-home",
        resetScroll: true,
      },
    });
  };

  return (
    <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-16">
      <SEO
        title={
          hasKeyword
            ? `${searchParams.keyword} 的搜索结果 | UniSearch`
            : "搜索结果 | UniSearch"
        }
        description="在 UniSearch 中查看聚合搜索结果，并按网盘与关键词进一步筛选。"
      />

      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleBack}
              className="rounded-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回
            </Button>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {hasKeyword ? `“${searchParams.keyword}” 的搜索结果` : "开始新的搜索"}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              输入关键词后进入聚合搜索；如当前未登录，系统会先引导您完成登录再继续查看结果。
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <SearchBox
            className="w-full max-w-4xl"
            accessHint={
              showSearchAccessHint
                ? "搜索结果需要登录后查看，您可以先输入关键词，系统会保留本次搜索意图。"
                : undefined
            }
          />

          {hasKeyword ? (
            <div className="max-w-5xl">
              <SearchUnifiedFilterCard />
            </div>
          ) : null}

          <SearchResults />
        </div>
      </div>
    </PublicPageShell>
  );
};

export default SearchPage;
