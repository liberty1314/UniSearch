import React from 'react';
import { AppleTable, AppleTableColumn } from '@/components/AppleTable';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Edit, Trash2, CheckCircle2, X, Clock, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { APIKeyInfo } from '@/types/api';

// ============ 类型定义 ============
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

type ExpiryStatusType = 'permanent' | 'pending' | 'expired' | 'active';

interface StatusDisplayConfig {
  mainText: string;
  subText: string;
  mainColor?: string;
}

// ============ 常量配置 ============
const STATUS_COLORS = {
  permanent: 'text-purple-600 dark:text-purple-400 font-medium',
  pending: 'text-blue-600 dark:text-blue-400 font-medium',
  expired: 'text-red-500',
  active: '',
} as const;

// ============ 辅助组件 ============
const StatusDisplay: React.FC<StatusDisplayConfig> = ({ 
  mainText, 
  subText, 
  mainColor = '' 
}) => (
  <div className="flex flex-col min-w-[120px]">
    <span className={`text-sm whitespace-nowrap ${mainColor}`}>
      {mainText}
    </span>
    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
      {subText}
    </span>
  </div>
);

// ============ 工具函数 ============
/**
 * 判断 Key 是否已过期
 */
const isKeyExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

/**
 * 脱敏显示 API Key
 * 格式：sk...89
 */
const maskApiKey = (key: string): string => {
  if (key.length <= 4) return key;
  const prefix = key.substring(0, 2);
  const suffix = key.substring(key.length - 2);
  return `${prefix}...${suffix}`;
};

/**
 * 获取过期状态类型
 */
const getExpiryStatusType = (key: APIKeyInfo): ExpiryStatusType => {
  if (key.is_permanent) return 'permanent';
  if (!key.first_used_at) return 'pending';
  if (isKeyExpired(key.expires_at)) return 'expired';
  return 'active';
};

/**
 * 获取过期状态显示配置
 */
const getExpiryStatusConfig = (key: APIKeyInfo): StatusDisplayConfig => {
  const statusType = getExpiryStatusType(key);
  
  const configs: Record<ExpiryStatusType, StatusDisplayConfig> = {
    permanent: {
      mainText: '永不过期',
      subText: '管理员专用',
      mainColor: STATUS_COLORS.permanent,
    },
    pending: {
      mainText: '待激活',
      subText: '首次使用时生效',
      mainColor: STATUS_COLORS.pending,
    },
    expired: {
      mainText: new Date(key.expires_at).toLocaleDateString('zh-CN'),
      subText: `已过期 ${formatDistanceToNow(new Date(key.expires_at), { 
        addSuffix: true, 
        locale: zhCN 
      })}`,
      mainColor: STATUS_COLORS.expired,
    },
    active: {
      mainText: new Date(key.expires_at).toLocaleDateString('zh-CN'),
      subText: `${formatDistanceToNow(new Date(key.expires_at), { 
        addSuffix: true, 
        locale: zhCN 
      })}过期`,
      mainColor: STATUS_COLORS.active,
    },
  };
  
  return configs[statusType];
};

// ============ 主组件 ============
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
          disabled={isLoading || isBatchOperating || isDeleting || key.is_permanent}
          aria-label={`选择 ${key.key}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          title={key.is_permanent ? '管理员永久密钥不可选择' : undefined}
        />
      ),
    },
    {
      key: 'key',
      title: 'API Key',
      sortable: true,
      render: (key) => (
        <div className="flex items-center gap-2 min-w-0">
          <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-lg">
            {maskApiKey(key.key)}
          </code>
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onCopyKey(key.key);
            }}
            className="flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="复制完整密钥"
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
        <div className="flex items-center gap-2 max-w-[200px]">
          <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2" title={key.description || '-'}>
            {key.description || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'created_at',
      title: '创建时间',
      sortable: true,
      hideOnMobile: true,
      render: (key) => (
        <div className="flex flex-col min-w-[100px]">
          <span className="text-sm whitespace-nowrap">
            {new Date(key.created_at).toLocaleDateString('zh-CN')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
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
        const config = getExpiryStatusConfig(key);
        return <StatusDisplay {...config} />;
      },
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      render: (key) => {
        let statusConfig: { text: string; color: string; icon: React.ReactNode };
        
        // 永久密钥优先判断
        if (key.is_permanent) {
          statusConfig = {
            text: '永久',
            color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            icon: <Shield className="w-4 h-4" />,
          };
        } else if (!key.is_enabled) {
          statusConfig = {
            text: '已禁用',
            color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
            icon: <X className="w-4 h-4" />,
          };
        } else if (isKeyExpired(key.expires_at)) {
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
            disabled={isDeleting || isBatchOperating || key.is_permanent}
            className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title={key.is_permanent ? '管理员永久密钥不可编辑' : '编辑'}
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
            disabled={isDeleting || isBatchOperating || key.is_permanent}
            className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
            title={key.is_permanent ? '管理员永久密钥不可删除' : '删除'}
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
