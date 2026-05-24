import React from "react";
import { Badge } from "@/components/ui/badge";
import { getCloudTypeInfo } from "@/utils/cloudTypeUtils";
import { ImageIcon } from "lucide-react";
import type { ResourceObject } from "@/types/api";

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
    <section className="relative overflow-hidden rounded-[2.4rem] border border-white/60 bg-slate-950 text-white shadow-[0_30px_90px_rgba(15,23,42,0.16)]">
      {posterImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: `url(${posterImage})` }}
          />
          <div
            className="absolute inset-0 scale-110 blur-3xl"
            style={{ backgroundImage: `url(${posterImage})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        </>
      ) : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.24),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.2),transparent_26%),linear-gradient(140deg,rgba(2,6,23,0.92),rgba(15,23,42,0.78)_45%,rgba(8,47,73,0.84))]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950 via-slate-950/72 to-transparent" />

      <div className="relative z-10 grid gap-8 px-6 py-6 sm:px-8 sm:py-8 xl:grid-cols-[minmax(0,1fr),380px] xl:gap-10 2xl:grid-cols-[minmax(0,1fr),420px]">
        <div
          className="space-y-6 xl:flex xl:h-full xl:min-h-full xl:flex-col xl:justify-between xl:space-y-0"
          data-testid="resource-detail-hero-content"
        >
          <div className="space-y-3">
            <h1
              className="resource-hero-title max-w-[14ch] text-3xl font-semibold leading-[1.05] tracking-[-0.05em] text-white sm:text-[4rem] sm:leading-[1.01] xl:text-[4.25rem] xl:leading-[0.98] 2xl:text-[4.75rem]"
              style={{ fontFamily: '"Baskerville", "Times New Roman", "Songti SC", "STSong", serif' }}
            >
              {displayTitle}
            </h1>
          </div>

          <div
            className="resource-detail-hero-meta-tray space-y-3 rounded-[1.75rem] px-4 py-4 xl:max-w-[36rem]"
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
            className="rounded-[1.8rem] border border-white/10 bg-white/10 px-4 py-4 shadow-[0_20px_40px_rgba(2,6,23,0.18)] backdrop-blur-xl xl:max-w-[36rem]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-cyan-100">
                打开前速览
              </span>
              <span className="text-xs text-slate-300">
                先看是否值得打开，再决定是否跳转外部资源。
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: "链接数量", value: linkCountLabel },
                { label: "访问方式", value: accessLabel },
                { label: "资源体积", value: sizeLabel || "未提供" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.3rem] border border-white/10 bg-slate-950/20 px-4 py-3"
                >
                  <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-300">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-white">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 text-xs leading-6 text-slate-300">
              发布时间：{publishedAtLabel}
            </div>
          </div>
        </div>

        <div className="xl:flex xl:items-start xl:justify-end xl:pt-1">
          <div className="relative w-full">
            <div className="absolute -right-8 top-6 h-24 w-24 rounded-full bg-cyan-300/16 blur-2xl" />
            <div className="absolute -left-10 bottom-4 h-32 w-32 rounded-full bg-blue-400/14 blur-3xl" />
            <div
              className="relative overflow-hidden rounded-[2.25rem] shadow-[0_10px_28px_rgba(15,23,42,0.2)]"
              data-testid="resource-detail-hero-image-card"
            >
                {posterImage ? (
                  <div className="flex aspect-[4/5] items-center justify-center bg-slate-950/28 p-1 sm:aspect-[5/6] xl:aspect-[4/5] 2xl:aspect-[5/6]">
                    <img
                      src={posterImage}
                      alt={`${displayTitle} 预览图`}
                      className="h-full w-full rounded-[2rem] object-contain shadow-[0_8px_24px_rgba(15,23,42,0.18)]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center rounded-[2rem] bg-slate-900/60 p-1 text-slate-300 sm:aspect-[5/6] xl:aspect-[4/5] 2xl:aspect-[5/6]">
                    <div className="flex flex-col items-center gap-3">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-sm font-medium">暂无预览图</span>
                      <span className="max-w-[16rem] text-center text-xs leading-5 text-slate-400">
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
