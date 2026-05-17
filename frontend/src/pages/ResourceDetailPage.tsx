import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  FileSearch,
  ImageIcon,
  Info,
  Link2,
  Tag,
} from "lucide-react";
import PublicPageShell from "@/components/PublicPageShell";
import PasswordModal from "@/components/PasswordModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSearchStore } from "@/stores/searchStore";
import { SystemSettingsService } from "@/services/systemSettingsService";
import type {
  ResourceAction,
  ResourceDetailRouteState,
} from "@/types/api";
import {
  isMagnetTarget,
  normalizeExternalUrl,
  resolveResourceActionTarget,
  resolveResourceDisplaySize,
  resolveResourceOpenTarget,
  resolveResourceSourceLabel,
  resolveResourceSourcePresentation,
} from "@/utils/resourceDisplay";

const formatDetailTime = (value?: string): string => {
  if (!value?.trim()) {
    return "未知时间";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-CN");
};

const formatMetaValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

const ResourceDetailPage: React.FC = () => {
  const { resourceId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { searchResults } = useSearchStore();
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    password: string;
    url: string;
    cloudType: string;
  }>({
    isOpen: false,
    password: "",
    url: "",
    cloudType: "",
  });
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

  const resource = resourceFromState || resourceFromStore;

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

  const metaEntries = useMemo(() => {
    if (!resource?.meta) {
      return [];
    }

    return Object.entries(resource.meta).filter(([, value]) => {
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value === "string") {
        return value.trim().length > 0;
      }
      return true;
    });
  }, [resource?.meta]);

  const visibleActions = useMemo(
    () => resource?.actions.filter((action) => action.type !== "open_detail") || [],
    [resource?.actions],
  );

  const sourcePresentation = useMemo(
    () => (resource ? resolveResourceSourcePresentation(resource) : null),
    [resource],
  );

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

  const handleOpenTarget = useCallback(
    (target: { url: string; password: string; cloudType: string } | null) => {
      if (!target) {
        return;
      }

      if (target.password) {
        setPasswordModal({
          isOpen: true,
          password: target.password,
          url: target.url,
          cloudType: target.cloudType,
        });
        return;
      }

      handleOpenExternal(target.url);
    },
    [handleOpenExternal],
  );

  const handlePrimaryOpenTarget = useCallback(
    (target: { url: string; password: string; cloudType: string } | null) => {
      if (!target) {
        return;
      }

      if (target.password || isMagnetTarget(target)) {
        setPasswordModal({
          isOpen: true,
          password: target.password,
          url: target.url,
          cloudType: target.cloudType,
        });
        return;
      }

      handleOpenExternal(target.url);
    },
    [handleOpenExternal],
  );

  const handleActionClick = useCallback(
    (action: ResourceAction) => {
      if (!resource || !primaryOpenTarget) {
        return;
      }

      const target = resolveResourceActionTarget(action, primaryOpenTarget.item);
      handleOpenTarget(target);
    },
    [handleOpenTarget, primaryOpenTarget, resource],
  );

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    if (routeState?.from?.pathname) {
      navigate(
        `${routeState.from.pathname}${routeState.from.search || ""}${routeState.from.hash || ""}`,
        {
          replace: true,
          state: routeState.from.keyword
            ? { resumeSearch: { keyword: routeState.from.keyword } }
            : undefined,
        },
      );
      return;
    }

    navigate("/", { replace: true });
  }, [navigate, routeState]);

  const handlePasswordModalClose = useCallback(() => {
    setPasswordModal({
      isOpen: false,
      password: "",
      url: "",
      cloudType: "",
    });
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
        <div
          data-testid="resource-detail-disabled-state"
          className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center rounded-[2rem] border border-white/60 bg-white/60 px-8 py-16 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-[24px] dark:border-white/10 dark:bg-slate-950/40 dark:shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
        >
          <div className="mb-5 rounded-full border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <FileSearch className="h-8 w-8 text-slate-500 dark:text-slate-300" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            资源详情页未开启
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            当前系统设置已关闭资源详情页展示。你可以返回搜索结果继续使用直达资源能力。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" variant="outline" onClick={handleBack} className="rounded-full">
              返回搜索结果
            </Button>
            <Button type="button" onClick={() => navigate("/")} className="rounded-full">
              返回首页
            </Button>
          </div>
        </div>
      </PublicPageShell>
    );
  }

  if (!resource) {
    return (
      <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-16">
        <div
          data-testid="resource-detail-empty-state"
          className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center rounded-[2rem] border border-white/60 bg-white/60 px-8 py-16 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-[24px] dark:border-white/10 dark:bg-slate-950/40 dark:shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
        >
          <div className="mb-5 rounded-full border border-slate-200/70 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <FileSearch className="h-8 w-8 text-slate-500 dark:text-slate-300" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            资源上下文已失效
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
            当前详情页没有可用的搜索上下文。你可以返回上一次搜索结果，或者回到首页重新搜索。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button type="button" variant="outline" onClick={handleBack} className="rounded-full">
              返回上一次搜索
            </Button>
            <Button type="button" onClick={() => navigate("/")} className="rounded-full">
              返回首页
            </Button>
          </div>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell contentClassName="container mx-auto px-4 py-8 pt-24 pb-16">
      <div data-testid="resource-detail-page" className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={handleBack} className="rounded-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回搜索结果
          </Button>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {routeState?.from?.label || "资源详情"}
          </div>
        </div>

        <section className="rounded-[2rem] border border-white/60 bg-white/60 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-[24px] dark:border-white/10 dark:bg-slate-950/40 dark:shadow-[0_18px_60px_rgba(0,0,0,0.28)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{resolveResourceSourceLabel(resource)}</Badge>
                {resource.media_type ? <Badge variant="secondary">{resource.media_type}</Badge> : null}
                {resource.target_type ? <Badge variant="secondary">{resource.target_type}</Badge> : null}
                {primaryOpenTarget?.sizeLabel ? (
                  <Badge variant="outline">{primaryOpenTarget.sizeLabel}</Badge>
                ) : null}
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold leading-tight text-slate-900 dark:text-slate-100">
                  {resource.title}
                </h1>
                {resource.description ? (
                  <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {resource.description}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">发布时间</div>
                  <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {formatDetailTime(resource.published_at)}
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">来源类别</div>
                  <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {sourcePresentation?.kindLabel || "未知来源"}
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">具体来源</div>
                  <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {sourcePresentation?.primaryLabel || "未知来源"}
                  </div>
                  {sourcePresentation?.secondaryLabel ? (
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {sourcePresentation.secondaryLabel}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">链接数量</div>
                  <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {resource.links.length}
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">访问方式</div>
                  <div className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {primaryOpenTarget?.target ? "可直接打开" : "仅可查看详情"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-3 lg:max-w-xs">
              <Button
                type="button"
                onClick={() => handlePrimaryOpenTarget(primaryOpenTarget?.target || null)}
                disabled={!primaryOpenTarget?.target}
                className="rounded-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                打开主资源
              </Button>
              {resource.detail.url ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    handlePrimaryOpenTarget({
                      url: resource.detail.url || "",
                      password: "",
                      cloudType: resource.detail.url?.trim().toLowerCase().startsWith("magnet:")
                        ? "magnet"
                        : resource.target_type || resource.links[0]?.type || "detail",
                    })
                  }
                  className="rounded-full"
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  打开详情链接
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        {resource.detail.content ? (
          <section className="rounded-[1.8rem] border border-white/60 bg-white/60 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur-[24px] dark:border-white/10 dark:bg-slate-950/40 dark:shadow-[0_16px_50px_rgba(0,0,0,0.24)]">
            <div className="mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">资源摘要</h2>
            </div>
            <div className="rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 p-4 text-sm leading-7 text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200">
              {resource.detail.content}
            </div>
          </section>
        ) : null}

        <section className="rounded-[1.8rem] border border-white/60 bg-white/60 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur-[24px] dark:border-white/10 dark:bg-slate-950/40 dark:shadow-[0_16px_50px_rgba(0,0,0,0.24)]">
          <div className="mb-4 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-slate-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">全部链接</h2>
          </div>
          <div className="space-y-3">
            {resource.links.map((link) => (
              <article
                key={`${link.type}-${link.url}`}
                className="rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{link.type}</Badge>
                      {link.password ? <Badge variant="secondary">需要访问码</Badge> : null}
                    </div>
                    <h3 className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {link.title || link.work_title || resource.title}
                    </h3>
                    <div className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                      {link.url}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      handleOpenTarget({
                        url: link.url,
                        password: link.password || "",
                        cloudType: link.type,
                      })
                    }
                    className="rounded-full"
                  >
                    打开链接
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {visibleActions.length > 0 ? (
          <section className="rounded-[1.8rem] border border-white/60 bg-white/60 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur-[24px] dark:border-white/10 dark:bg-slate-950/40 dark:shadow-[0_16px_50px_rgba(0,0,0,0.24)]">
            <div className="mb-4 flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">可执行动作</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {visibleActions.map((action) => (
                <Button
                  key={action.key}
                  type="button"
                  variant="outline"
                  onClick={() => handleActionClick(action)}
                  className="rounded-full"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </section>
        ) : null}

        {resource.images?.length ? (
          <section className="rounded-[1.8rem] border border-white/60 bg-white/60 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur-[24px] dark:border-white/10 dark:bg-slate-950/40 dark:shadow-[0_16px_50px_rgba(0,0,0,0.24)]">
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-slate-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">相关图片</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resource.images.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className="overflow-hidden rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <img
                    src={image}
                    alt={`${resource.title} 相关图片 ${index + 1}`}
                    className="h-56 w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {(resource.tags?.length || metaEntries.length > 0) ? (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr),minmax(0,1.1fr)]">
            <div className="rounded-[1.8rem] border border-white/60 bg-white/60 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur-[24px] dark:border-white/10 dark:bg-slate-950/40 dark:shadow-[0_16px_50px_rgba(0,0,0,0.24)]">
              <div className="mb-4 flex items-center gap-2">
                <Tag className="h-4 w-4 text-slate-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">标签</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {(resource.tags || []).length > 0 ? (
                  (resource.tags || []).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">暂无标签</span>
                )}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-white/60 bg-white/60 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.05)] backdrop-blur-[24px] dark:border-white/10 dark:bg-slate-950/40 dark:shadow-[0_16px_50px_rgba(0,0,0,0.24)]">
              <div className="mb-4 flex items-center gap-2">
                <Info className="h-4 w-4 text-slate-500" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">元数据</h2>
              </div>
              <div className="space-y-3">
                {metaEntries.length > 0 ? (
                  metaEntries.map(([key, value]) => (
                    <div
                      key={key}
                      className={cn(
                        "grid gap-2 rounded-[1.1rem] border border-slate-200/70 bg-slate-50/80 p-3 text-sm dark:border-white/10 dark:bg-white/[0.03]",
                        "sm:grid-cols-[minmax(0,120px),minmax(0,1fr)]",
                      )}
                    >
                      <div className="font-medium text-slate-600 dark:text-slate-300">{key}</div>
                      <div className="break-all text-slate-900 dark:text-slate-100">{formatMetaValue(value)}</div>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">暂无元数据</span>
                )}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <PasswordModal
        isOpen={passwordModal.isOpen}
        onClose={handlePasswordModalClose}
        password={passwordModal.password}
        url={passwordModal.url}
        cloudType={passwordModal.cloudType}
      />
    </PublicPageShell>
  );
};

export default ResourceDetailPage;
