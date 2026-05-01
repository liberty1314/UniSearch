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
import { AppleButton } from '@/components/ui/AppleButton';
import { AppleInput } from '@/components/ui/AppleInput';
import { cn } from '@/lib/utils';
import { getCloudTypeInfo } from '@/utils/cloudTypeUtils';

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

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    toast.success('访问码已复制');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    toast.success('链接已复制');
  };

  const handleOpenUrl = () => {
    try {
      let finalUrl = url.trim();
      // 确保链接包含 http/https 协议前缀
      if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }

      if (!finalUrl) {
        toast.error('链接地址为空');
        return;
      }

      const openedWindow = window.open(finalUrl, '_blank');
      if (openedWindow) {
        openedWindow.opener = null;
      } else {
        toast.error('浏览器阻止了跳转，请手动复制链接');
      }
    } catch (e) {
      console.error('无法打开链接:', e);
      toast.error('打开链接失败，请手动复制链接');
    } finally {
      onClose();
    }
  };

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
              访问码提示
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
              该资源需要访问码才能访问
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">

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

          <div className="space-y-1">
            <AppleInput
              label="链接地址"
              value={url}
              readOnly
              className="text-sm text-slate-600 dark:text-slate-300 truncate pr-12 bg-transparent shadow-none border-slate-200 dark:border-slate-700 focus:bg-transparent"
              endAdornment={
                <button
                  onClick={handleCopyUrl}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none"
                  title="复制链接"
                >
                  <Copy className="h-[18px] w-[18px]" />
                </button>
              }
            />
          </div>

          <div className="pt-2">
            <AppleButton
              variant="primary"
              fullWidth
              onClick={handleOpenUrl}
            >
              <IoOpenOutline className="h-[18px] w-[18px]" />
              打开链接
            </AppleButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordModal;
