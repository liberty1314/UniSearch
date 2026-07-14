import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import PublicPageShell from "@/components/PublicPageShell";
import PasswordModal from "@/components/PasswordModal";
import SEO from "@/components/SEO";
import ResourceDetailActionPanel from "@/components/resource-detail/ResourceDetailActionPanel";
import ResourceDetailEmptyState from "@/components/resource-detail/ResourceDetailEmptyState";
import ResourceDetailHero from "@/components/resource-detail/ResourceDetailHero";
import { Button } from "@/components/ui/button";
import { useSearchStore } from "@/stores/searchStore";
import { SystemSettingsService } from "@/services/systemSettingsService";
import { SearchService } from "@/services/searchService";
import { toast } from "sonner";
import type { ResourceDetailRouteState } from "@/types/resource";
import { findRecentResourceSnapshot } from "@/lib/resourceSnapshot";
import {
  isMagnetTarget,
  isScanTransferTarget,
  normalizeExternalUrl,
  resolveDirectScanTransferUrl,
  resolveResourceDisplayTitle,
  resolveResourceDisplaySize,
  type ResourceOpenTarget,
  resolveResourceOpenTarget,
} from "@/utils/resourceDisplay";
import { formatDetailTime } from "@/utils/resourceTime";

const fallbackCopyText = async (text: string): Promise<void> => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

const ResourceDetailPage: React.FC = () => {
  const { resourceId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { searchResults } = useSearchStore();
  const [passwordModalTarget, setPasswordModalTarget] = useState<ResourceOpenTarget | null>(null);
  const [enableResourceDetailPage, setEnableResourceDetailPage] = useState(true);
  const [settingsResolved, setSettingsResolved] = useState(false);

  const routeState = (location.state as ResourceDetailRouteState | null) || null;

  useEffect(() => {
    let isMounted = true;

    void SystemSettingsService.getSettingsCached()
      .then((settings) => {
        if (!isMounted) {
          return;
        }
        setEnableResourceDetailPage(settings.enable_resource_detail_page);
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }
        setEnableResourceDetailPage(true);
      })
      .finally(() => {
        if (isMounted) {
          setSettingsResolved(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const resourceFromState = useMemo(() => {
    if (!routeState?.resource || routeState.resource.id !== resourceId) {
      return null;
    }
    return routeState.resource;
  }, [resourceId, routeState]);

  const resourceFromStore = useMemo(
    () =>
      searchResults?.resources.find((item) => item.id === resourceId) || null,
    [resourceId, searchResults?.resources],
  );

  const resourceFromSnapshot = useMemo(
    () => findRecentResourceSnapshot(resourceId),
    [resourceId],
  );

  const resource = resourceFromState || resourceFromStore || resourceFromSnapshot;

  const primaryOpenTarget = useMemo(() => {
    if (!resource) {
      return null;
    }

    const item = {
      resource,
      primaryLink: resource.links[0],
      cloudType: resource.links[0]?.type || resource.target_type || "unknown",
      datetime: 0,
    };

    return {
      item,
      target: resolveResourceOpenTarget(item),
      sizeLabel: resolveResourceDisplaySize(item),
    };
  }, [resource]);

  const displayTitle = useMemo(
    () => (resource ? resolveResourceDisplayTitle(resource) : "未命名资源"),
    [resource],
  );

  const primaryCloudType = useMemo(() => {
    if (!resource) {
      return "unknown";
    }
    return resource.links[0]?.type || resource.target_type || "unknown";
  }, [resource]);

  const seoDescription = useMemo(() => {
    const description = resource?.description?.trim();
    if (description) {
      return description;
    }

    const detailContent = resource?.detail.content?.trim();
    if (detailContent) {
      return detailContent.slice(0, 120);
    }

    return "查看 UniSearch 聚合出的资源详情、链接与扩展信息。";
  }, [resource?.description, resource?.detail.content]);

  const summaryParagraphs = useMemo(() => {
    const content = resource?.detail.content?.trim();
    if (!content) {
      return [];
    }

    return content
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [resource?.detail.content]);

  const handleOpenExternal = useCallback((url: string) => {
    const targetUrl = normalizeExternalUrl(url);
    if (!targetUrl) {
      return;
    }

    const openedWindow = window.open(targetUrl, "_blank");
    if (openedWindow) {
      openedWindow.opener = null;
    }
  }, []);

  const handlePrimaryOpenTarget = useCallback(
    (target: ResourceOpenTarget | null) => {
      if (!target) {
        return;
      }

      const directScanTransferUrl = resolveDirectScanTransferUrl(target);
      if (directScanTransferUrl) {
        handleOpenExternal(directScanTransferUrl);
        return;
      }

      if (target.password || isMagnetTarget(target) || isScanTransferTarget(target)) {
        setPasswordModalTarget(target);
        return;
      }

      handleOpenExternal(target.url);
    },
    [handleOpenExternal],
  );

  const handleBack = useCallback(() => {
    if (routeState?.from?.pathname) {
      navigate(
        `${routeState.from.pathname}${routeState.from.search || ""}${routeState.from.hash || ""}`,
        {
          replace: true,
          state: {
            ...(routeState.from.keyword
              ? { resumeSearch: { keyword: routeState.from.keyword } }
              : {}),
            routeTransition: "backward",
            transitionSource: "resource-detail-back",
            restoreScroll: typeof routeState.scrollY === "number",
            scrollY: routeState.scrollY,
          },
        },
      );
      return;
    }

    navigate("/", { replace: true });
  }, [navigate, routeState]);

  const retrySearchKeyword = useMemo(
    () => routeState?.from?.keyword?.trim() || resourceId.trim(),
    [resourceId, routeState?.from?.keyword],
  );

  const handleRetrySearch = useCallback(() => {
    if (!retrySearchKeyword) {
      return;
    }

    navigate(SearchService.buildSearchUrl({ keyword: retrySearchKeyword }), {
      replace: true,
      state: {
        resumeSearch: { keyword: retrySearchKeyword },
        routeTransition: "backward",
        transitionSource: "resource-detail-retry-search",
      },
    });
  }, [navigate, retrySearchKeyword]);

  const handlePasswordModalClose = useCallback(() => {
    setPasswordModalTarget(null);
  }, []);

  const handleCopyText = useCallback(async (value: string, successMessage: string) => {
    const text = value.trim();
    if (!text) {
      toast.error("暂无可复制内容");
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        await fallbackCopyText(text);
      }
      toast.success(successMessage);
    } catch {
      toast.error("复制失败，请稍后重试");
    }
  }, []);

  if (!settingsResolved) {
    return (
      <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-16">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500 dark:border-slate-700 dark:border-t-cyan-400" />
        </div>
      </PublicPageShell>
    );
  }

  if (!enableResourceDetailPage) {
    return (
      <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-16">
        <ResourceDetailEmptyState
          testId="resource-detail-disabled-state"
          title="资源详情页未开启"
          description="当前系统设置已关闭资源详情页展示。你可以返回搜索结果继续使用直达资源能力。"
          backLabel="返回搜索结果"
          onBack={handleBack}
          onHome={() => navigate("/")}
        />
      </PublicPageShell>
    );
  }

  if (!resource) {
    return (
      <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-16">
        <ResourceDetailEmptyState
          testId="resource-detail-empty-state"
          title="资源上下文已失效"
          description="当前详情页没有可用的搜索上下文。你可以返回上一次搜索结果，或者回到首页重新搜索。"
          backLabel="返回上一次搜索"
          onBack={handleBack}
          retryLabel="重新搜索当前线索"
          onRetrySearch={handleRetrySearch}
          onHome={() => navigate("/")}
        />
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell contentClassName="container mx-auto px-4 py-6 pt-22 pb-12 sm:pt-24 sm:pb-16">
      <SEO
        title={`${resource.title} | UniSearch`}
        description={seoDescription}
        image={resource.images?.[0]}
      />

      <div data-testid="resource-detail-page" className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          data-testid="resource-detail-backbar"
          className="resource-detail-backbar inline-flex flex-wrap items-center gap-3 rounded-full px-2 py-2"
        >
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            className="resource-detail-button-secondary rounded-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回搜索结果
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.5, ease: "easeOut" }}
          className="space-y-5 xl:space-y-6"
        >
          <ResourceDetailHero
            resource={resource}
            displayTitle={displayTitle}
            sizeLabel={primaryOpenTarget?.sizeLabel || null}
            primaryCloudType={primaryCloudType}
            accessLabel={primaryOpenTarget?.target ? "可直接打开" : "仅可查看详情"}
            linkCountLabel={`${resource.links.length}`}
            publishedAtLabel={formatDetailTime(resource.published_at)}
          />

          <div
            data-testid="resource-detail-body-bridge"
            className="resource-detail-body-bridge grid gap-5 xl:grid-cols-[minmax(0,1fr),300px] xl:gap-6"
          >
            <div className="space-y-6">
              {resource.detail.content ? (
                <section
                  data-testid="resource-detail-summary"
                  className="resource-detail-summary-panel overflow-hidden rounded-[1.65rem] px-5 py-5 sm:px-6 sm:py-6 xl:px-8 xl:py-7"
                >
                  <div className="max-w-[70ch] space-y-4">
                    <h2
                      className="resource-detail-section-title sm:text-[1.85rem]"
                    >
                      资源摘要
                    </h2>
                    <div
                      data-testid="resource-detail-summary-content"
                      className="resource-detail-summary-flow text-[15px] text-slate-700 dark:text-slate-100 sm:text-base"
                    >
                      {summaryParagraphs.map((paragraph, index) => (
                        <p
                          key={`${index}-${paragraph.slice(0, 24)}`}
                          className={
                            index === 0
                              ? "whitespace-pre-line text-[15.5px] leading-8 text-slate-800 dark:text-slate-50 sm:text-[17px]"
                              : "whitespace-pre-line text-[15px] leading-8 text-slate-700 dark:text-slate-100 sm:text-base"
                          }
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}
            </div>

            <ResourceDetailActionPanel
              primaryTarget={primaryOpenTarget?.target || null}
              onOpenTarget={handlePrimaryOpenTarget}
              onCopyText={(value, successMessage) => {
                void handleCopyText(value, successMessage);
              }}
            />
          </div>
        </motion.div>
      </div>

      <PasswordModal
        isOpen={Boolean(passwordModalTarget)}
        onClose={handlePasswordModalClose}
        password={passwordModalTarget?.password || ""}
        url={passwordModalTarget?.url || ""}
        cloudType={passwordModalTarget?.cloudType || ""}
        resourceId={passwordModalTarget?.resourceId}
        accessMode={passwordModalTarget?.accessMode}
        scanTransfer={passwordModalTarget?.scanTransfer}
      />
    </PublicPageShell>
  );
};

export default ResourceDetailPage;
