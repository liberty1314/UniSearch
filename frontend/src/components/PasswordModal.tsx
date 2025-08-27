import React from 'react';
import { X, Copy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-fade-in">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 标题 */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            访问码提示
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            该资源需要访问码才能访问
          </p>
        </div>

        {/* 网盘类型 */}
        <div className="mb-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">网盘类型：</span>
          <span className="ml-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
            {cloudType}
          </span>
        </div>

        {/* 访问码 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            访问码
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={password}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono text-sm"
            />
            <button
              onClick={handleCopyPassword}
              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              title="复制访问码"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 链接 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            链接地址
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={url}
              readOnly
              className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm"
            />
            <button
              onClick={handleCopyUrl}
              className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
              title="复制链接"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleOpenUrl}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            打开链接
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>

        {/* 使用说明 */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-700 dark:text-blue-300">
            💡 使用说明：复制访问码后，点击"打开链接"，在网盘页面输入访问码即可访问资源。
          </p>
        </div>
      </div>
    </div>
  );
};

export default PasswordModal;
