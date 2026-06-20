import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  ExternalLink,
  LockKeyhole,
  QrCode,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppleInput } from "@/components/ui/AppleInput";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SearchService } from "@/services/searchService";
import type { ResourceAccessMode, ScanTransferInfo } from "@/types/resource";
import { getCloudTypeInfo } from "@/utils/cloudTypeUtils";
import {
  isMagnetUrl,
  normalizeExternalUrl,
} from "@/utils/resourceDisplay";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  password: string;
  url: string;
  cloudType: string;
  resourceId?: string;
  accessMode?: ResourceAccessMode;
  scanTransfer?: ScanTransferInfo;
}

const copyText = async (value: string, successMessage: string): Promise<void> => {
  const trimmed = value.trim();
  if (!trimmed) {
    toast.error("暂无可复制内容");
    return;
  }

  await navigator.clipboard.writeText(trimmed);
  toast.success(successMessage);
};

const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  password,
  url,
  cloudType,
  resourceId,
  accessMode,
  scanTransfer,
}) => {
  const cloudInfo = getCloudTypeInfo(cloudType);
  const magnetMode = cloudType === "magnet" || isMagnetUrl(url);
  const [currentScanTransfer, setCurrentScanTransfer] = useState<ScanTransferInfo | undefined>(
    scanTransfer,
  );
  const [isRefreshingScanTransfer, setIsRefreshingScanTransfer] = useState(false);

  useEffect(() => {
    setCurrentScanTransfer(scanTransfer);
    setIsRefreshingScanTransfer(false);
  }, [isOpen, scanTransfer, url]);

  const scanTransferMode = accessMode === "scan_transfer" || Boolean(currentScanTransfer);
  const finalUrl = normalizeExternalUrl(url);
  const effectiveScanTransfer = currentScanTransfer;
  const qrCodePreview =
    effectiveScanTransfer?.qr_code_base64 || effectiveScanTransfer?.qr_code_image_url || "";
  const qrCodeValue = effectiveScanTransfer?.qr_code_value?.trim() || "";
  const mobileUrl = effectiveScanTransfer?.mobile_url?.trim() || "";
  const transferCode = effectiveScanTransfer?.transfer_code?.trim() || "";
  const openUrl = scanTransferMode && qrCodeValue
    ? normalizeExternalUrl(qrCodeValue)
    : finalUrl;

  const dialogTitle = useMemo(() => {
    if (scanTransferMode) {
      return "扫码转存";
    }
    return magnetMode ? "磁力链接" : "访问码提示";
  }, [magnetMode, scanTransferMode]);

  const dialogDescription = useMemo(() => {
    if (scanTransferMode) {
      return "使用手机网盘 App 扫码转存。";
    }
    return magnetMode
      ? "该资源为磁力链接，可直接复制或打开。"
      : "该资源需要访问码才能访问";
  }, [magnetMode, scanTransferMode]);

  const handleInvalidOpen = () => {
    toast.error(scanTransferMode ? "转存页面地址为空" : magnetMode ? "磁力链接为空" : "链接地址为空");
  };

  const handleRefreshScanTransfer = async () => {
    const refreshKey = effectiveScanTransfer?.refresh_key?.trim();
    if (!refreshKey) {
      toast.error("当前资源暂不支持重新获取二维码");
      return;
    }

    setIsRefreshingScanTransfer(true);
    try {
      const response = await SearchService.refreshScanTransfer({
        resource_id: resourceId,
        link_url: url,
        refresh_key: refreshKey,
      });

      if (!response.scan_transfer) {
        throw new Error("当前资源未返回新的扫码载荷");
      }

      setCurrentScanTransfer(response.scan_transfer);
      toast.success("二维码已重新获取");
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "重新获取二维码失败";
      toast.error(message);
    } finally {
      setIsRefreshingScanTransfer(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-[500px] max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader className="flex flex-col items-center text-center space-y-3 pt-2">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl",
              "border border-slate-200/80 bg-slate-100/50 shadow-sm backdrop-blur-md",
              "dark:border-white/10 dark:bg-white/5 dark:shadow-none",
            )}
          >
            {scanTransferMode ? (
              <QrCode className="h-6 w-6 text-slate-800 dark:text-slate-200" strokeWidth={1.5} />
            ) : (
              <LockKeyhole className="h-6 w-6 text-slate-800 dark:text-slate-200" strokeWidth={1.5} />
            )}
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="flex items-center justify-center gap-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {dialogTitle}
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm border",
                  cloudInfo.bg,
                  cloudInfo.text,
                  cloudInfo.border,
                )}
              >
                {cloudInfo.name}
              </span>
            </DialogTitle>
            <DialogDescription className="line-clamp-1 text-sm">
              {dialogDescription}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {scanTransferMode ? (
            <>
              <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                {qrCodePreview ? (
                  <div className="flex justify-center">
                    <img
                      src={qrCodePreview}
                      alt="扫码转存二维码"
                      className="h-56 w-56 rounded-2xl border border-slate-200/70 bg-white object-contain p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/60"
                    />
                  </div>
                ) : qrCodeValue ? (
                  <div className="flex justify-center">
                    <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm dark:border-white/10">
                      <QRCodeSVG
                        value={qrCodeValue}
                        size={224}
                        level="M"
                        marginSize={3}
                        role="img"
                        aria-label="扫码转存二维码"
                        className="h-56 w-56"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300/80 bg-white/85 px-5 py-6 text-center dark:border-white/10 dark:bg-slate-950/50">
                    <QrCode className="h-10 w-10 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      当前资源暂未返回二维码图片，可继续使用下方口令或手机深链完成转存。
                    </p>
                  </div>
                )}
              </div>

              {transferCode ? (
                <AppleInput
                  label="转存口令"
                  value={transferCode}
                  readOnly
                  className="font-mono tracking-wider font-medium text-slate-900 dark:text-white bg-transparent shadow-none border-slate-200 dark:border-slate-700 focus:bg-transparent"
                  endAdornment={
                    <button
                      onClick={() => void copyText(transferCode, "转存口令已复制")}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none"
                      title="复制转存口令"
                    >
                      <Copy className="h-[18px] w-[18px]" />
                    </button>
                  }
                />
              ) : null}

              {mobileUrl ? (
                <AppleInput
                  label="手机深链"
                  value={mobileUrl}
                  readOnly
                  className="text-sm text-slate-600 dark:text-slate-300 truncate pr-12 bg-transparent shadow-none border-slate-200 dark:border-slate-700 focus:bg-transparent"
                  endAdornment={
                    <button
                      onClick={() => void copyText(mobileUrl, "手机深链已复制")}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none"
                      title="复制手机深链"
                    >
                      <Smartphone className="h-[18px] w-[18px]" />
                    </button>
                  }
                />
              ) : null}
            </>
          ) : !magnetMode ? (
            <div className="space-y-1">
              <AppleInput
                label="访问码"
                value={password}
                readOnly
                className="font-mono tracking-wider font-medium text-slate-900 dark:text-white bg-transparent shadow-none border-slate-200 dark:border-slate-700 focus:bg-transparent"
                endAdornment={
                  <button
                    onClick={() => void copyText(password, "访问码已复制")}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none"
                    title="复制访问码"
                  >
                    <Copy className="h-[18px] w-[18px]" />
                  </button>
                }
              />
            </div>
          ) : null}

          {!scanTransferMode ? (
            <div className="space-y-1">
              <AppleInput
                label={magnetMode ? "磁力链接" : "链接地址"}
                value={url}
                readOnly
                className="text-sm text-slate-600 dark:text-slate-300 truncate pr-12 bg-transparent shadow-none border-slate-200 dark:border-slate-700 focus:bg-transparent"
                endAdornment={
                  <button
                    onClick={() =>
                      void copyText(
                        url,
                        magnetMode ? "磁力链接已复制" : "链接已复制",
                      )
                    }
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none"
                    title={magnetMode ? "复制磁力链接" : "复制链接"}
                  >
                    <Copy className="h-[18px] w-[18px]" />
                  </button>
                }
              />
            </div>
          ) : null}

          {qrCodeValue ? (
            <AppleInput
              label="二维码内容"
              value={qrCodeValue}
              readOnly
              className="text-sm text-slate-600 dark:text-slate-300 truncate pr-12 bg-transparent shadow-none border-slate-200 dark:border-slate-700 focus:bg-transparent"
              endAdornment={
                <button
                  onClick={() =>
                    void copyText(qrCodeValue, "二维码内容已复制")
                  }
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none"
                  title="复制二维码内容"
                >
                  <Copy className="h-[18px] w-[18px]" />
                </button>
              }
            />
          ) : null}

          <div className="flex flex-col gap-2 pt-2">
            {scanTransferMode && effectiveScanTransfer?.refreshable ? (
              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                className="rounded-xl"
                onClick={() => void handleRefreshScanTransfer()}
                disabled={isRefreshingScanTransfer}
              >
                <RefreshCw
                  className={cn("h-[18px] w-[18px]", isRefreshingScanTransfer && "animate-spin")}
                />
                {isRefreshingScanTransfer ? "正在获取二维码" : "重新获取二维码"}
              </Button>
            ) : null}

            {mobileUrl ? (
              <Button asChild variant="primary" size="md" fullWidth className="rounded-xl">
                <a href={mobileUrl} onClick={onClose}>
                  <Smartphone className="h-[18px] w-[18px]" />
                  打开手机深链
                </a>
              </Button>
            ) : openUrl ? (
              <Button asChild variant="primary" size="md" fullWidth className="rounded-xl">
                <a
                  href={openUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                >
                  <ExternalLink className="h-[18px] w-[18px]" />
                  {magnetMode ? "打开磁力" : "打开链接"}
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                fullWidth
                className="rounded-xl"
                onClick={handleInvalidOpen}
              >
                <ExternalLink className="h-[18px] w-[18px]" />
                {magnetMode ? "打开磁力" : "打开链接"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordModal;
