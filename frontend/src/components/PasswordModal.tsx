import React from 'react';
import { IoCopyOutline, IoOpenOutline } from 'react-icons/io5';
import { Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  password: string;
  url: string;
  cloudType: string;
}

const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  password,
  url,
  cloudType
}) => {
  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    // 可以添加一个提示，但这里简化处理
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    // 可以添加一个提示，但这里简化处理
  };

  const handleOpenUrl = () => {
    window.open(url, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>访问码提示</DialogTitle>
          <DialogDescription>该资源需要访问码才能访问</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <span className="text-sm text-gray-500 dark:text-slate-400">网盘类型：</span>
            <span className="ml-2 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {cloudType}
            </span>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              访问码
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={password}
                readOnly
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-700 dark:text-white"
              />
              <button
                onClick={handleCopyPassword}
                className="rounded-lg bg-blue-500 p-2 text-white transition-colors hover:bg-blue-600"
                title="复制访问码"
                aria-label="复制访问码"
              >
                <IoCopyOutline className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">
              链接地址
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-slate-700 dark:bg-slate-700 dark:text-white"
              />
              <button
                onClick={handleCopyUrl}
                className="rounded-lg bg-gray-500 p-2 text-white transition-colors hover:bg-gray-600"
                title="复制链接"
                aria-label="复制链接"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleOpenUrl}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 no-tap-highlight"
            >
              <IoOpenOutline className="h-4 w-4" />
              打开链接
            </button>
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-apple-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-gray-600 dark:focus-visible:ring-offset-gray-800 no-tap-highlight"
            >
              关闭
            </button>
          </div>

          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 使用说明：复制访问码后，点击"打开链接"，在网盘页面输入访问码即可访问资源。
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordModal;
