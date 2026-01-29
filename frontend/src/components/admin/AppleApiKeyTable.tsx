import React from 'react';
import { AppleTable, AppleTableColumn } from '@/components/AppleTable';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Edit, Trash2, CheckCircle2, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { APIKeyInfo } from '@/types/api';

interface AppleApiKeyTableProps {
  apiKeys: APIKeyInfo[];
  selectedKeys: Set<string>;
  onSelectKey: (key: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onCopyKey: (key: string) => void;
  onEditClick: (key: APIKeyInfo) => void;
  onDeleteClick: (key: string) => void;
  isDeleting: boolean;
  isBatchOperating: boolean;
  isLoading: boolean;
}

/**
 * Apple 风格 API Key 表格组件
 */
export const AppleApiKeyTable: React.FC<AppleApiKeyTableProps> = ({
  apiKeys,
  selectedKeys,
  onSelectKey,
  onCopyKey,
  onEditClick,
  onDeleteClick,
  isDeleting,
  isBatchOperating,
  isLoading,
}) => {
  /**
   * 判断 Key 是否已过期
   */
  const isKeyExpired = (expiresAt: string): boolean => {
    return new Date(expiresAt) < new Date();
  };

  /**
   * 列配置
   */
  const columns: AppleTableColumn<APIKeyInfo>[] = [
    {
      key: 'select',
      title: '',
      width: '48px',
      render: (key) => (
        <Checkbox
          checked={selectedKeys.has(key.key)}
          onCheckedChange={(checked) => onSelectKey(key.key, checked as boolean)}
          disabled={isLoading || isBatchOperating || isDeleting}
          aria-label={`选择 ${key.key}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'key',
      title: 'API Key',
      sortable: true,
      render: (key) => (
        <div className="flex items-center gap-2 min-w-0">
          <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-lg truncate max-w-[300px]">
            {key.key}
          </code>
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onCopyKey(key.key);
            }}
            className="flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="复制"
          >
            <Copy className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ),
    },
    {
      key: 'description',
      title: '描述',
      hideOnMobile: true,
      render: (key) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {key.description || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      title: '创建时间',
      sortable: true,
      hideOnMobile: true,
      render: (key) => (
        <div className="flex flex-col">
          <span className="text-sm">
            {new Date(key.created_at).toLocaleDateString('zh-CN')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDistanceToNow(new Date(key.created_at), {
              addSuffix: true,
              locale: zhCN,
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'expires_at',
      title: '过期时间',
      sortable: true,
      hideOnMobile: true,
      render: (key) => {
        const expired = isKeyExpired(key.expires_at);
        return (
          <div className="flex flex-col">
            <span className="text-sm">
              {new Date(key.expires_at).toLocaleDateString('zh-CN')}
            </span>
            <span className={`text-xs ${expired ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              {expired
                ? `已过期 ${formatDistanceToNow(new Date(key.expires_at), { addSuffix: true, locale: zhCN })}`
                : `${formatDistanceToNow(new Date(key.expires_at), { addSuffix: true, locale: zhCN })}过期`
              }
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      render: (key) => {
        const expired = isKeyExpired(key.expires_at);
        let statusConfig: { text: string; color: string; icon: React.ReactNode };
        
        if (!key.is_enabled) {
          statusConfig = {
            text: '已禁用',
            color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
            icon: <X className="w-4 h-4" />,
          };
        } else if (expired) {
          statusConfig = {
            text: '已过期',
            color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
            icon: <Clock className="w-4 h-4" />,
          };
        } else {
          statusConfig = {
            text: '正常',
            color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            icon: <CheckCircle2 className="w-4 h-4" />,
          };
        }

        return (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
            {statusConfig.icon}
            {statusConfig.text}
          </div>
        );
      },
    },
    {
      key: 'actions',
      title: '操作',
      align: 'right',
      render: (key) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onEditClick(key);
            }}
            disabled={isDeleting || isBatchOperating}
            className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onDeleteClick(key.key);
            }}
            disabled={isDeleting || isBatchOperating}
            className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppleTable
      data={apiKeys}
      columns={columns}
      rowKey={(key) => key.key}
      loading={isLoading}
      emptyText="暂无 API Keys"
      hoverable
    />
  );
};
