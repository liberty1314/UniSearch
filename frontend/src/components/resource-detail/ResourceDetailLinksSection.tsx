import React from "react";
import { Copy, ExternalLink, KeyRound, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCloudTypeInfo, getCloudTypePriority } from "@/utils/cloudTypeUtils";
import type { ResourceLink } from "@/types/api";
import type { ResourceOpenTarget } from "@/utils/resourceDisplay";

interface ResourceDetailLinksSectionProps {
  resourceTitle: string;
  links: ResourceLink[];
  primaryLinkUrl?: string | null;
  formatDetailTime: (value?: string) => string;
  onOpenTarget: (target: ResourceOpenTarget | null) => void;
  onCopyText: (value: string, successMessage: string) => void;
}

interface PreparedLinkItem {
  link: ResourceLink;
  cloudType: string;
  title: string;
  timestamp: number;
  isPrimary: boolean;
}

const toTimestamp = (value?: string): number => {
  if (!value?.trim()) {
    return -1;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : -1;
};

const ResourceDetailLinksSection: React.FC<ResourceDetailLinksSectionProps> = ({
  resourceTitle,
  links,
  primaryLinkUrl,
  formatDetailTime,
  onOpenTarget,
  onCopyText,
}) => {
  const preparedLinks: PreparedLinkItem[] = links.map((link, index) => ({
    link,
    cloudType: link.type || "unknown",
    title: link.title || link.work_title || resourceTitle,
    timestamp: toTimestamp(link.datetime),
    isPrimary: Boolean(primaryLinkUrl && link.url === primaryLinkUrl && index === 0),
  }));

  const groupedLinks = preparedLinks.reduce<Record<string, PreparedLinkItem[]>>((groups, item) => {
    const groupKey = item.cloudType || "unknown";
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});

  const sortedGroupEntries = Object.entries(groupedLinks)
    .map(([cloudType, items]) => [
      cloudType,
      [...items].sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }
        return right.timestamp - left.timestamp;
      }),
    ] as const)
    .sort((left, right) => {
      const leftHasPrimary = left[1].some((item) => item.isPrimary);
      const rightHasPrimary = right[1].some((item) => item.isPrimary);
      if (leftHasPrimary !== rightHasPrimary) {
        return leftHasPrimary ? -1 : 1;
      }

      const priorityDiff = getCloudTypePriority(left[0]) - getCloudTypePriority(right[0]);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return left[0].localeCompare(right[0], "zh-CN");
    });

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/78 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-[24px] dark:border-white/10 dark:bg-slate-950/56 dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
      <div className="border-b border-slate-200/70 px-6 py-5 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-3 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <h2
              className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white"
              style={{ fontFamily: '"Baskerville", "Times New Roman", "Songti SC", "STSong", serif' }}
            >
              全部链接
            </h2>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="space-y-4">
          {sortedGroupEntries.map(([cloudType, items]) => {
            const cloudInfo = getCloudTypeInfo(cloudType);

            return (
              <section
                key={cloudType}
                data-testid={`resource-link-group-${cloudType}`}
                className="rounded-[1.75rem] border border-slate-200/70 bg-slate-50/65 p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="rounded-full">
                      {cloudInfo.name}
                    </Badge>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {items.length} 条
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <article
                      key={`${item.cloudType}-${item.link.url}-${index}`}
                      className="group relative overflow-hidden rounded-[1.35rem] border border-slate-200/70 bg-white/88 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:shadow-[0_18px_40px_rgba(0,0,0,0.26)]"
                    >
                      <div
                        className={cn(
                          "absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-80",
                          cloudInfo.gradient,
                        )}
                      />

                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.isPrimary ? (
                              <Badge className="rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                                当前主链接
                              </Badge>
                            ) : null}
                            {item.link.access_mode === "scan_transfer" || item.link.scan_transfer ? (
                              <Badge variant="secondary" className="rounded-full">
                                需手机扫码
                              </Badge>
                            ) : null}
                            {item.link.datetime ? (
                              <Badge variant="secondary" className="rounded-full">
                                {formatDetailTime(item.link.datetime)}
                              </Badge>
                            ) : null}
                            <Badge variant="secondary" className="rounded-full">
                              {item.link.password ? (
                                <>
                                  <KeyRound className="mr-1 h-3 w-3" />
                                  需要提取码
                                </>
                              ) : (
                                "提取码：无需"
                              )}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            <h4
                              data-testid="resource-link-title"
                              className="text-base font-semibold leading-tight text-slate-950 dark:text-white"
                            >
                              {item.title}
                            </h4>
                            <div className="break-all text-sm text-slate-500 dark:text-slate-400">
                              {item.link.url}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              onOpenTarget({
                                url: item.link.url,
                                password: item.link.password || "",
                                cloudType: item.link.type,
                                accessMode:
                                  item.link.access_mode ||
                                  (item.link.scan_transfer ? "scan_transfer" : item.link.password ? "password_open" : "direct_open"),
                                scanTransfer: item.link.scan_transfer,
                              })
                            }
                            className="rounded-full"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {item.link.access_mode === "scan_transfer" || item.link.scan_transfer
                              ? "扫码转存"
                              : "打开资源"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onCopyText(item.link.url, "链接已复制")}
                            className="rounded-full"
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            复制链接
                          </Button>
                          {item.link.password ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => onCopyText(item.link.password || "", "提取码已复制")}
                              className="rounded-full"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              复制提取码
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ResourceDetailLinksSection;
