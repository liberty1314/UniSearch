import React from "react";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResourceOpenTarget } from "@/utils/resourceDisplay";
import { isScanTransferTarget, resolveDirectScanTransferUrl } from "@/utils/resourceDisplay";

interface ResourceDetailActionPanelProps {
  primaryTarget: ResourceOpenTarget | null;
  onOpenTarget: (target: ResourceOpenTarget | null) => void;
  onCopyText: (value: string, successMessage: string) => void;
}

const ResourceDetailActionPanel: React.FC<ResourceDetailActionPanelProps> = ({
  primaryTarget,
  onOpenTarget,
  onCopyText,
}) => {
  const hasPassword = Boolean(primaryTarget?.password);
  const scanTransferMode =
    isScanTransferTarget(primaryTarget) && !resolveDirectScanTransferUrl(primaryTarget);
  const primaryStatusLabel = primaryTarget?.url
    ? scanTransferMode
      ? "需手机扫码"
      : "可直接处理"
    : "仅支持查看详情";
  const passwordStatusLabel = scanTransferMode
    ? primaryTarget?.scanTransfer?.refreshable
      ? "支持刷新二维码"
      : "需手机端完成"
    : hasPassword
      ? "已提供"
      : "无需";
  const primaryButtonLabel = scanTransferMode ? "扫码转存" : "打开主资源";

  return (
    <aside className="xl:self-start">
      <div className="xl:sticky xl:top-24">
        <div
          data-testid="resource-detail-action-panel"
          className="resource-detail-action-panel overflow-hidden rounded-2xl p-4 sm:p-5"
        >
          <div className="space-y-2">
            <div>
              <h2 className="resource-detail-section-title">资源操作</h2>
            </div>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-300">
              打开外部资源前，请确认访问方式和提取码状态。
            </p>
          </div>

          <div className="mt-3.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400">主链接状态</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {primaryStatusLabel}
              </span>
            </div>
            <div className="mt-3 border-t border-slate-200/60 pt-3 dark:border-white/[0.08]" />
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400">提取码</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {passwordStatusLabel}
              </span>
            </div>
          </div>

          <div className="mt-[18px] flex flex-col gap-2.5">
            <Button
              type="button"
              onClick={() => onOpenTarget(primaryTarget)}
              disabled={!primaryTarget}
              className="resource-detail-button-primary rounded-xl"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {primaryButtonLabel}
            </Button>
            {primaryTarget?.password ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => onCopyText(primaryTarget.password, "提取码已复制")}
                className="resource-detail-button-secondary rounded-xl"
              >
                <Copy className="mr-2 h-4 w-4" />
                复制提取码
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ResourceDetailActionPanel;
