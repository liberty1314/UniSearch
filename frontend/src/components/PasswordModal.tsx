import React from 'react';
import { IoOpenOutline } from 'react-icons/io5';
import { Copy, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AppleInput } from '@/components/ui/AppleInput';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCloudTypeInfo } from '@/utils/cloudTypeUtils';
import { isMagnetUrl, normalizeExternalUrl } from '@/utils/resourceDisplay';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  password: string;
  url: string;
  cloudType: string; // This is now the cloudType key, not the name
}

const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  password,
  url,
  cloudType
}) => {
  const cloudInfo = getCloudTypeInfo(cloudType);
  const magnetMode = cloudType === 'magnet' || isMagnetUrl(url);
  const finalUrl = normalizeExternalUrl(url);

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    toast.success('访问码已复制');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    toast.success(magnetMode ? '磁力链接已复制' : '链接已复制');
  };

  const handleInvalidOpen = () => {
    toast.error(magnetMode ? '磁力链接为空' : '链接地址为空');
  };

  const dialogTitle = magnetMode ? '磁力链接' : '访问码提示';
  const dialogDescription = magnetMode ? '该资源为磁力链接，可直接复制或打开。' : '该资源需要访问码才能访问';
  const primaryFieldLabel = magnetMode ? '磁力链接' : '链接地址';
  const primaryButtonText = magnetMode ? '打开磁力' : '打开链接';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md sm:max-w-[460px] max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <DialogHeader className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl',
            'border border-slate-200/80 bg-slate-100/50 shadow-sm backdrop-blur-md',
            'dark:border-white/10 dark:bg-white/5 dark:shadow-none'
          )}>
            <LockKeyhole className="h-6 w-6 text-slate-800 dark:text-slate-200" strokeWidth={1.5} />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="flex items-center justify-center gap-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {dialogTitle}
              <span className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm border",
                cloudInfo.bg,
                cloudInfo.text,
                cloudInfo.border
              )}>
                {cloudInfo.name}
              </span>
            </DialogTitle>
            <DialogDescription className="text-sm">
              {dialogDescription}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {!magnetMode ? (
            <div className="space-y-1">
              <AppleInput
                label="访问码"
                value={password}
                readOnly
                className="font-mono tracking-wider font-medium text-slate-900 dark:text-white bg-transparent shadow-none border-slate-200 dark:border-slate-700 focus:bg-transparent"
                endAdornment={
                  <button
                    onClick={handleCopyPassword}
                    className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none"
                    title="复制访问码"
                  >
                    <Copy className="h-[18px] w-[18px]" />
                  </button>
                }
              />
            </div>
          ) : null}

          <div className="space-y-1">
            <AppleInput
              label={primaryFieldLabel}
              value={url}
              readOnly
              className="text-sm text-slate-600 dark:text-slate-300 truncate pr-12 bg-transparent shadow-none border-slate-200 dark:border-slate-700 focus:bg-transparent"
              endAdornment={
                <button
                  onClick={handleCopyUrl}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none"
                  title={magnetMode ? '复制磁力链接' : '复制链接'}
                >
                  <Copy className="h-[18px] w-[18px]" />
                </button>
              }
            />
          </div>

          <div className="pt-2">
            {finalUrl ? (
              <Button asChild variant="primary" size="md" fullWidth className="rounded-xl">
                <a
                  href={finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                >
                  <IoOpenOutline className="h-[18px] w-[18px]" />
                  {primaryButtonText}
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
                <IoOpenOutline className="h-[18px] w-[18px]" />
                {primaryButtonText}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordModal;
