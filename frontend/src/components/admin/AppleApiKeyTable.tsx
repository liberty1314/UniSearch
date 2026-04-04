import React, { useState } from 'react';
import { AdminDataTable, AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Edit, Trash2, CheckCircle2, X, Clock, Shield, Power, PowerOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { APIKeyInfo } from '@/types/api';
import {
  BLUE_CYAN_ACTION_HOVER,
  BLUE_CYAN_STATUS_BADGE,
  BLUE_CYAN_TEXT,
} from '@/lib/brandTheme';

interface AppleApiKeyTableProps {
  apiKeys: APIKeyInfo[];
  selectedKeys: Set<string>;
  onSelectKey: (key: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onCopyKey: (key: string) => void;
  onEditClick: (key: APIKeyInfo) => void;
  onDeleteClick: (key: string) => void;
  onToggleStatus: (key: APIKeyInfo, isEnabled: boolean) => void;
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
  onSelectAll,
  onCopyKey,
  onEditClick,
  onDeleteClick,
  onToggleStatus,
  isDeleting,
  isBatchOperating,
  isLoading,
}) => {
  const [activeKey, setActiveKey] = useState<APIKeyInfo | null>(null);

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
    const prefix = key.substring(0, 2); // 前2位
    const suffix = key.substring(key.length - 2); // 后2位
    return `${prefix}...${suffix}`;
  };

  /**
   * 计算可选择的 Keys（排除永久密钥）
   */
  const selectableKeys = apiKeys.filter(key => !key.is_permanent);

  /**
   * 判断是否全选（仅针对可选择的 Keys）
   */
  const isAllSelected = selectableKeys.length > 0 && selectableKeys.every(key => selectedKeys.has(key.key));

  /**
   * 处理全选/取消全选
   */
  const handleSelectAllChange = (checked: boolean) => {
    onSelectAll(checked);
  };

  /**
   * 列配置
   */
  const columns: AdminDataTableColumn<APIKeyInfo>[] = [
    {
      key: 'select',
      title: (
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={handleSelectAllChange}
          disabled={isLoading || isBatchOperating || isDeleting || selectableKeys.length === 0}
          aria-label="全选"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      ),
      width: '48px',
      render: (key) => (
        <Checkbox
          checked={selectedKeys.has(key.key)}
          onCheckedChange={(checked) => onSelectKey(key.key, checked as boolean)}
          disabled={isLoading || isBatchOperating || isDeleting || key.is_permanent}
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
          <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-900 px-3 py-1 rounded-lg">
            {maskApiKey(key.key)}
          </code>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCopyKey(key.key);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            title="复制 API Key"
            aria-label={`复制 ${maskApiKey(key.key)}`}
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      ),
    },
    {
      key: 'description',
      title: '描述',
      hideOnMobile: true,
      render: (key) => {
        const desc = key.description || '-';
        const displayDesc = desc.length > 4 ? `${desc.substring(0, 4)}...` : desc;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap" title={desc}>
              {displayDesc}
            </span>
          </div>
        );
      },
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
          <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
            {formatDistanceToNow(new Date(key.created_at), {
              addSuffix: true,
              locale: zhCN,
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'last_login_at',
      title: '最后登录',
      sortable: true,
      hideOnMobile: true,
      render: (key) =>
        key.last_login_at ? (
          <div className="flex flex-col min-w-[100px]">
            <span className="text-sm whitespace-nowrap">
              {new Date(key.last_login_at).toLocaleDateString('zh-CN')}
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
              {formatDistanceToNow(new Date(key.last_login_at), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400 dark:text-gray-600">从未登录</span>
        ),
    },
    {
      key: 'expires_at',
      title: '过期时间',
      sortable: true,
      hideOnMobile: true,
      render: (key) => {
        // 永久密钥特殊处理
        if (key.is_permanent) {
          return (
            <div className="flex flex-col min-w-[120px]">
              <span className="text-sm whitespace-nowrap text-cyan-700 dark:text-cyan-300 font-medium">
                永不过期
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                管理员专用
              </span>
            </div>
          );
        }

        // 未激活的密钥（首次使用前）
        if (!key.first_used_at) {
          return (
            <div className="flex flex-col min-w-[140px]">
              <span className={`text-sm whitespace-nowrap font-medium ${BLUE_CYAN_TEXT}`}>
                待激活
              </span>
              <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">
                首次使用时生效
              </span>
            </div>
          );
        }

        const expired = isKeyExpired(key.expires_at);
        return (
          <div className="flex flex-col min-w-[120px]">
            <span className="text-sm whitespace-nowrap">
              {new Date(key.expires_at).toLocaleDateString('zh-CN')}
            </span>
            <span className={`text-xs whitespace-nowrap ${expired ? 'text-red-500' : 'text-gray-500 dark:text-slate-400'}`}>
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
        let statusConfig: { text: string; color: string; icon: React.ReactNode };

        // 永久密钥优先判断
        if (key.is_permanent) {
          statusConfig = {
            text: '永久',
            color: BLUE_CYAN_STATUS_BADGE,
            icon: <Shield className="w-4 h-4 flex-shrink-0" />,
          };
        } else if (!key.is_enabled) {
          statusConfig = {
            text: '已禁用',
            color: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
            icon: <X className="w-4 h-4 flex-shrink-0" />,
          };
        } else if (!key.first_used_at) {
          // 未激活的密钥
          statusConfig = {
            text: '待激活',
            color: 'bg-blue-100 text-blue-700 dark:bg-cyan-950/40 dark:text-cyan-300',
            icon: <Clock className="w-4 h-4 flex-shrink-0" />,
          };
        } else if (isKeyExpired(key.expires_at)) {
          statusConfig = {
            text: '已过期',
            color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
            icon: <Clock className="w-4 h-4 flex-shrink-0" />,
          };
        } else {
          statusConfig = {
            text: '正常',
            color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            icon: <CheckCircle2 className="w-4 h-4 flex-shrink-0" />,
          };
        }

        return (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig.color}`}>
            {statusConfig.icon}
            <span className="whitespace-nowrap">{statusConfig.text}</span>
          </div>
        );
      },
    },
  ];

  const desktopColumns = activeKey ? columns.filter((column) => column.key !== 'select') : columns;

  const renderDesktopOverlay = (key: APIKeyInfo, _close: () => void) => {
    let statusConfig: { text: string; color: string; icon: React.ReactNode };

    if (key.is_permanent) {
      statusConfig = {
        text: '永久',
        color: BLUE_CYAN_STATUS_BADGE,
        icon: <Shield className="h-4 w-4" />,
      };
    } else if (!key.is_enabled) {
      statusConfig = {
        text: '已禁用',
        color: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
        icon: <X className="h-4 w-4" />,
      };
    } else if (!key.first_used_at) {
      statusConfig = {
        text: '待激活',
        color: 'bg-blue-100 text-blue-700 dark:bg-cyan-950/40 dark:text-cyan-300',
        icon: <Clock className="h-4 w-4" />,
      };
    } else if (isKeyExpired(key.expires_at)) {
      statusConfig = {
        text: '已过期',
        color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        icon: <Clock className="h-4 w-4" />,
      };
    } else {
      statusConfig = {
        text: '正常',
        color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle2 className="h-4 w-4" />,
      };
    }

    const disableProtectedActions = isDeleting || isBatchOperating || key.is_permanent;

    return (
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{maskApiKey(key.key)}</h4>
              <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${statusConfig.color}`}>
                {statusConfig.icon}
                {statusConfig.text}
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{key.description || '无描述'}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                {key.is_permanent ? '管理员永久密钥' : '标准访问密钥'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                {key.is_permanent ? '永不过期' : `过期时间 ${new Date(key.expires_at).toLocaleDateString('zh-CN')}`}
              </span>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={_close} className="rounded-full" aria-label="关闭详情" title="关闭详情">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">创建时间</p>
            <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">{new Date(key.created_at).toLocaleDateString('zh-CN')}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">最后登录</p>
            <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">
              {key.last_login_at ? formatDistanceToNow(new Date(key.last_login_at), { addSuffix: true, locale: zhCN }) : '从未登录'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">描述</p>
            <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">{key.description || '无描述'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="border-slate-200 dark:border-slate-700"
            onClick={() => onCopyKey(key.key)}
            disabled={isDeleting || isBatchOperating}
          >
            <Copy className="mr-2 h-4 w-4" />
            复制完整密钥
          </Button>
          <Button
            variant="outline"
            className="border-slate-200 dark:border-slate-700"
            onClick={() => {
              onEditClick(key);
            }}
            disabled={disableProtectedActions}
          >
            <Edit className="mr-2 h-4 w-4" />
            编辑
          </Button>
          <Button
            variant="outline"
            className={`border-cyan-200 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-800/70 dark:text-cyan-300 dark:hover:bg-cyan-950/30 ${BLUE_CYAN_ACTION_HOVER}`}
            onClick={() => {
              onToggleStatus(key, !key.is_enabled);
            }}
            disabled={disableProtectedActions}
          >
            {key.is_enabled ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
            {key.is_enabled ? '禁用' : '启用'}
          </Button>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800/70 dark:text-red-300 dark:hover:bg-red-950/30"
            onClick={() => {
              onDeleteClick(key.key);
            }}
            disabled={disableProtectedActions}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </Button>
        </div>
      </div>
    );
  };

  /**
   * 渲染移动端卡片项
   */
  const renderMobileItem = (key: APIKeyInfo) => {
    let statusConfig: { text: string; color: string; icon: React.ReactNode };

    // 永久密钥优先判断
    if (key.is_permanent) {
      statusConfig = {
        text: '永久',
        color: BLUE_CYAN_STATUS_BADGE,
        icon: <Shield className="w-3 h-3 flex-shrink-0" />,
      };
    } else if (!key.is_enabled) {
      statusConfig = {
        text: '已禁用',
        color: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
        icon: <X className="w-3 h-3 flex-shrink-0" />,
      };
    } else if (!key.first_used_at) {
      // 未激活的密钥
      statusConfig = {
        text: '待激活',
        color: 'bg-blue-100 text-blue-700 dark:bg-cyan-950/40 dark:text-cyan-300',
        icon: <Clock className="w-3 h-3 flex-shrink-0" />,
      };
    } else if (isKeyExpired(key.expires_at)) {
      statusConfig = {
        text: '已过期',
        color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        icon: <Clock className="w-3 h-3 flex-shrink-0" />,
      };
    } else {
      statusConfig = {
        text: '正常',
        color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        icon: <CheckCircle2 className="w-3 h-3 flex-shrink-0" />,
      };
    }

    return (
      <div className="flex flex-col gap-3">
        {/* Header: Checkbox | Status | Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedKeys.has(key.key)}
              onCheckedChange={(checked) => onSelectKey(key.key, checked as boolean)}
              disabled={isLoading || isBatchOperating || isDeleting || key.is_permanent}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5"
            />
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig.color}`}>
              {statusConfig.icon}
              <span>{statusConfig.text}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(key);
              }}
              disabled={isDeleting || isBatchOperating || key.is_permanent}
              className={`h-8 w-8 p-0 ${BLUE_CYAN_ACTION_HOVER}`}
            >
              <Edit className="w-4 h-4 text-gray-600 dark:text-slate-300" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStatus(key, !key.is_enabled);
              }}
              disabled={isDeleting || isBatchOperating || key.is_permanent}
              className={`h-8 w-8 p-0 ${BLUE_CYAN_ACTION_HOVER}`}
            >
              {key.is_enabled ? <PowerOff className="w-4 h-4 text-cyan-700 dark:text-cyan-300" /> : <Power className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(key.key);
              }}
              disabled={isDeleting || isBatchOperating || key.is_permanent}
              className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        </div>

        {/* Content: API Key */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800/60 rounded-lg p-2.5 border border-gray-100 dark:border-slate-800">
          <div className="flex flex-col min-w-0 flex-1 mr-2">
            <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-0.5">API KEY</span>
            <code className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate">
              {maskApiKey(key.key)}
            </code>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onCopyKey(key.key); }}
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-md transition-colors"
            title="复制"
          >
            <Copy className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content: Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/40 p-2 rounded-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider opacity-70">创建时间</span>
            <span>{new Date(key.created_at).toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider opacity-70">最后登录</span>
            <span>{key.last_login_at ? formatDistanceToNow(new Date(key.last_login_at), { addSuffix: true, locale: zhCN }) : '从未登录'}</span>
          </div>
        </div>

        {/* Footer: Description & Time */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400 pt-1 border-t border-gray-100 dark:border-slate-800/50">
          <span className="truncate max-w-[50%] mr-2" title={key.description || ''}>
            {key.description || '无描述'}
          </span>
          <span className="flex-shrink-0">
            {key.is_permanent ? '永久有效' : formatDistanceToNow(new Date(key.expires_at), { addSuffix: true, locale: zhCN })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <AdminDataTable
      data={apiKeys}
      columns={desktopColumns}
      rowKey={(key) => key.key}
      loading={isLoading}
      emptyText="暂无 API Keys"
      hoverable
      showCount={false}
      renderMobileItem={renderMobileItem}
      renderDesktopOverlay={renderDesktopOverlay}
      onOverlayOpenChange={(item) => setActiveKey(item)}
      disableInteractionsWhenOverlayOpen
    />
  );
};
