import React from "react";
import { Badge } from "@/components/ui/badge";
import { getCloudTypeInfo } from "@/utils/cloudTypeUtils";
import { ImageIcon } from "lucide-react";
import type { ResourceObject } from "@/types/resource";

interface ResourceDetailHeroProps {
  resource: ResourceObject;
  displayTitle: string;
  sizeLabel: string | null;
  primaryCloudType: string;
  accessLabel: string;
  linkCountLabel: string;
  publishedAtLabel: string;
}

const ResourceDetailHero: React.FC<ResourceDetailHeroProps> = ({
  resource,
  displayTitle,
  sizeLabel,
  primaryCloudType,
  accessLabel,
  linkCountLabel,
  publishedAtLabel,
}) => {
  const posterImage = resource.images?.[0];
  const primaryCloud = getCloudTypeInfo(primaryCloudType);

  return (
    <section className="resource-detail-hero-panel overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-slate-900">
      <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr),minmax(240px,320px)] xl:gap-8">
        <div
          className="space-y-5"
          data-testid="resource-detail-hero-content"
        >
          <div className="space-y-3">
            <h1
              className="resource-hero-title max-w-[64ch] text-3xl font-bold leading-[1.15] tracking-normal text-slate-950 dark:text-white sm:text-4xl"
            >
              {displayTitle}
            </h1>
          </div>

          <div
            className="resource-detail-hero-meta-tray space-y-3 rounded-2xl px-4 py-4"
            data-testid="resource-detail-hero-meta"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge className="resource-detail-hero-pill-primary rounded-full px-3 py-1.5">
                {primaryCloud.name}
              </Badge>
              {resource.media_type ? (
                <Badge variant="outline" className="resource-detail-hero-pill-secondary rounded-full px-3 py-1.5">
                  {resource.media_type}
                </Badge>
              ) : null}
              {resource.target_type ? (
                <Badge variant="outline" className="resource-detail-hero-pill-secondary rounded-full px-3 py-1.5">
                  {resource.target_type}
                </Badge>
              ) : null}
              {sizeLabel ? (
                <Badge variant="outline" className="resource-detail-hero-pill-secondary rounded-full px-3 py-1.5">
                  {sizeLabel}
                </Badge>
              ) : null}
            </div>

            {(resource.tags || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(resource.tags || []).slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="resource-detail-hero-tag rounded-full px-3 py-1 text-xs font-medium tracking-[0.08em]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div
            data-testid="resource-detail-hero-decision-card"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700 dark:border-cyan-300/20 dark:bg-cyan-400/10 dark:text-cyan-200">
                打开前速览
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-300">
                先看是否值得打开，再决定是否跳转外部资源。
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "链接数量", value: linkCountLabel },
                { label: "访问方式", value: accessLabel },
                { label: "资源体积", value: sizeLabel || "未提供" },
                { label: "发布时间", value: publishedAtLabel },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950/40"
                >
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-300">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:flex xl:items-start xl:justify-end">
          <div className="w-full max-w-sm xl:max-w-none">
            <div
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-slate-950/40"
              data-testid="resource-detail-hero-image-card"
            >
              {posterImage ? (
                <div className="flex aspect-[4/5] items-center justify-center sm:aspect-[5/6] xl:aspect-[4/5]">
                  <img
                    src={posterImage}
                    alt={`${displayTitle} 预览图`}
                    className="h-full w-full rounded-xl object-contain"
                  />
                </div>
              ) : (
                <div className="flex aspect-[4/5] items-center justify-center rounded-xl bg-slate-100 p-4 text-slate-500 dark:bg-slate-950/50 dark:text-slate-300 sm:aspect-[5/6] xl:aspect-[4/5]">
                  <div className="flex flex-col items-center gap-3">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-sm font-medium">暂无预览图</span>
                    <span className="max-w-[16rem] text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
                      可先查看摘要、链接数量与资源体积，再决定是否打开。
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResourceDetailHero;
