import React, { useState } from 'react';
import { AdminDataTable, AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, KeyRound, Power, PowerOff, Shield, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { UserInfo } from '@/types/api';
import {
  ADMIN_HOVERABLE_BUTTON_CLASSES,
} from '@/components/admin/adminDesign';
import { cn } from '@/lib/utils';

interface AppleUserTableProps {
  users: UserInfo[];
  selectedUsers: Set<number>;
  onSelectUser: (userId: number, checked: boolean) => void;
  onEditClick: (user: UserInfo) => void;
  onResetPasswordClick: (user: UserInfo) => void;
  onDeleteClick: (userId: number) => void;
  onToggleStatus: (userId: number, isEnabled: boolean) => void;
  currentUserId: number;
  isDeleting: boolean;
  isBatchOperating: boolean;
  isLoading: boolean;
}

const USER_TABLE_GRID_GAP_CLASS_NAME = 'gap-x-5';
const USER_TABLE_GRID_TEMPLATE_COLUMNS = [
  'minmax(0,0.72fr)',
  'minmax(0,1.45fr)',
  'minmax(0,0.55fr)',
  'minmax(0,0.78fr)',
  'minmax(0,0.9fr)',
  'minmax(0,1.5fr)',
  'minmax(0,0.75fr)',
].join(' ');
const USER_TABLE_GRID_TEMPLATE_COLUMNS_WITHOUT_SELECT = [
  'minmax(0,1.45fr)',
  'minmax(0,0.55fr)',
  'minmax(0,0.78fr)',
  'minmax(0,0.9fr)',
  'minmax(0,1.5fr)',
  'minmax(0,0.75fr)',
].join(' ');

/**
 * Apple 风格用户表格组件
 */
export const AppleUserTable: React.FC<AppleUserTableProps> = ({
  users,
  selectedUsers,
  onSelectUser,
  onEditClick,
  onResetPasswordClick,
  onDeleteClick,
  onToggleStatus,
  currentUserId,
  isDeleting,
  isBatchOperating,
  isLoading,
}) => {
  const [activeUser, setActiveUser] = useState<UserInfo | null>(null);

  /**
   * 获取角色徽章样式
   */
  const getRoleBadgeVariant = (role: 'admin' | 'user') => {
    return role === 'admin' ? 'default' : 'secondary';
  };

  /**
   * 获取角色显示文本
   */
  const getRoleText = (role: 'admin' | 'user') => {
    return role === 'admin' ? '管理员' : '用户';
  };

  const getStatusConfig = (user: UserInfo) => {
    return user.is_enabled
      ? {
        text: '正常',
        badgeClassName: 'bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-300',
        gradientClassName: 'from-green-500/10 to-transparent',
        icon: <Power className="w-4 h-4" />,
      }
      : {
        text: '已禁用',
        badgeClassName: 'bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-300',
        gradientClassName: 'from-red-500/10 to-transparent',
        icon: <PowerOff className="w-4 h-4" />,
      };
  };

  const getCurrentMonthDayCount = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  };

  const getMonthlyLoginDays = (user: UserInfo) => {
    return user.monthly_login_days ?? [];
  };

  const getMonthlyLoginDayCount = (user: UserInfo) => {
    return user.monthly_login_day_count ?? getMonthlyLoginDays(user).length;
  };

  const renderMonthlyLoginBars = (user: UserInfo) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const dayCount = getCurrentMonthDayCount();
    const loginDaySet = new Set(getMonthlyLoginDays(user));
    const loggedInDays = getMonthlyLoginDayCount(user);

    return (
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">已登录 {loggedInDays} 天</div>
          <div className="mt-1 flex max-w-full gap-0.5 overflow-hidden" aria-label={`本月登录 ${loggedInDays} 天`}>
            {Array.from({ length: dayCount }).map((_, index) => {
              const date = new Date(currentYear, currentMonth, index + 1);
              const dateKey = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, '0'),
                String(date.getDate()).padStart(2, '0'),
              ].join('-');
              const hasLogin = loginDaySet.has(dateKey);

              return (
              <span
                key={index}
                data-month-login-day={dateKey}
                title={`${dateKey}${hasLogin ? ' 已登录' : ' 未登录'}`}
                className={cn(
                  'h-5 w-1 flex-1 rounded-full border transition-all duration-500',
                  hasLogin
                    ? 'border-cyan-400/30 bg-cyan-500/70 dark:border-cyan-300/30 dark:bg-cyan-300/80'
                    : user.is_enabled
                      ? 'border-slate-200/70 bg-slate-200/40 dark:border-cyan-300/[0.14] dark:bg-cyan-400/[0.08]'
                      : 'border-red-200/40 bg-red-300/20 dark:border-red-900/30 dark:bg-red-950/30'
                )}
              />
              );
            })}
          </div>
        </div>
        <span className="min-w-12 text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{loggedInDays}/{dayCount}</span>
      </div>
    );
  };

  const renderUserAvatar = (user: UserInfo, sizeClassName = 'h-10 w-10', textClassName = 'text-sm') => (
    <div
      className={cn(
        'flex flex-shrink-0 items-center justify-center rounded-2xl border-[0.5px] border-cyan-100/70 bg-gradient-to-br from-blue-500 to-cyan-500 font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] dark:border-cyan-400/20',
        sizeClassName,
        textClassName
      )}
    >
      {user.username.charAt(0).toUpperCase()}
    </div>
  );

  const renderStatusBadge = (user: UserInfo, iconClassName = 'w-4 h-4') => {
    const statusConfig = getStatusConfig(user);

    return (
      <div className={cn('inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium', statusConfig.badgeClassName)}>
        {React.cloneElement(statusConfig.icon, { className: iconClassName })}
        {statusConfig.text}
      </div>
    );
  };

  /**
   * 列配置
   */
  const columns: AdminDataTableColumn<UserInfo>[] = [
    {
      key: 'select',
      title: 'No',
      width: '72px',
      render: (user, index) => (
        <div className="flex min-h-10 items-center gap-2">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center">
            <Checkbox
              checked={selectedUsers.has(user.id)}
              onCheckedChange={(checked) => onSelectUser(user.id, checked as boolean)}
              disabled={user.id === currentUserId || isLoading || isBatchOperating || isDeleting}
              aria-label={`选择 ${user.username}`}
              className="h-4 w-4"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
          </span>
          <span className="text-2xl font-bold text-slate-300 dark:text-slate-600">
            {String(index + 1).padStart(2, '0')}
          </span>
        </div>
      ),
    },
    {
      key: 'user',
      title: '用户身份',
      sortable: true,
      render: (user) => (
        <div className="flex min-h-10 items-center gap-3">
          {renderUserAvatar(user)}
          <div className="flex flex-col min-w-0">
            <span className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">{user.username}</span>
            {user.id === currentUserId && (
              <span className="text-xs font-medium text-blue-600 dark:text-cyan-300">
                当前用户
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: '角色',
      sortable: true,
      align: 'center',
      hideOnMobile: true,
      render: (user) => (
        <Badge variant={getRoleBadgeVariant(user.role)}>
          {getRoleText(user.role)}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      title: '创建时间',
      sortable: true,
      hideOnMobile: true,
      render: (user) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
            {new Date(user.created_at).toLocaleDateString('zh-CN')}
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400">
            {formatDistanceToNow(new Date(user.created_at), {
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
      hideOnMobile: true,
      render: (user) =>
        user.last_login_at ? (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {new Date(user.last_login_at).toLocaleDateString('zh-CN')}
            </span>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              {formatDistanceToNow(new Date(user.last_login_at), {
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
      key: 'monthly_login',
      title: '本月登录',
      hideOnMobile: true,
      render: (user) => renderMonthlyLoginBars(user),
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      render: (user) => renderStatusBadge(user),
    },
  ];

  const desktopColumns = activeUser ? columns.filter((column) => column.key !== 'select') : columns;

  const renderDesktopOverlay = (user: UserInfo, _close: () => void) => {
    const isCurrentUser = user.id === currentUserId;

    return (
      <div className="space-y-4">
        <div className="relative flex items-start justify-between gap-4 overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-r from-slate-50/90 to-transparent p-4 dark:border-cyan-300/[0.12] dark:from-slate-950/[0.68]">
          <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-l', getStatusConfig(user).gradientClassName)} />
          <div className="flex items-start gap-4">
            {renderUserAvatar(user, 'h-14 w-14', 'text-lg')}
            <div className="relative space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-xl font-semibold text-slate-900 dark:text-slate-50">{user.username}</h4>
                <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleText(user.role)}</Badge>
                {isCurrentUser ? (
                  <span className="inline-flex items-center gap-1 rounded-full border-[0.5px] border-cyan-200/50 bg-cyan-50/70 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:border-cyan-900/30 dark:bg-cyan-950/25 dark:text-cyan-300">
                    <Shield className="h-3.5 w-3.5" />
                    当前用户
                  </span>
                ) : null}
              </div>
              {renderStatusBadge(user)}
              <p className="text-sm text-slate-500 dark:text-slate-400">
                点击操作后沿用当前弹窗和业务流程，不修改现有权限规则。
              </p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={_close} className="rounded-full" aria-label="关闭详情" title="关闭详情">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-300">创建时间</p>
            <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">{new Date(user.created_at).toLocaleDateString('zh-CN')}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-300">最后登录</p>
            <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">
              {user.last_login_at ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true, locale: zhCN }) : '从未登录'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-300">账户类型</p>
            <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">{getRoleText(user.role)}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-300">本月登录情况</p>
          {renderMonthlyLoginBars(user)}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className={cn(ADMIN_HOVERABLE_BUTTON_CLASSES, 'border-slate-200/50 text-slate-700 dark:border-cyan-300/[0.14] dark:text-slate-200')}
            onClick={() => {
              onEditClick(user);
            }}
            disabled={isDeleting || isBatchOperating}
          >
            <Edit className="mr-2 h-4 w-4" />
            编辑
          </Button>
          <Button
            variant="outline"
            className="border-[0.5px] border-amber-200/60 text-amber-600 hover:bg-amber-50/80 dark:border-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-950/30"
            onClick={() => {
              onResetPasswordClick(user);
            }}
            disabled={isDeleting || isBatchOperating}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            重置密码
          </Button>
          <Button
            variant="outline"
            className="border-[0.5px] border-cyan-200/60 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-950/30"
            onClick={() => {
              onToggleStatus(user.id, !user.is_enabled);
            }}
            disabled={isCurrentUser || isDeleting || isBatchOperating}
          >
            {user.is_enabled ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
            {user.is_enabled ? '禁用' : '启用'}
          </Button>
          <Button
            variant="outline"
            className="border-[0.5px] border-red-200/60 text-red-600 hover:bg-red-50/80 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
            onClick={() => {
              onDeleteClick(user.id);
            }}
            disabled={isCurrentUser || isDeleting || isBatchOperating}
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
  const renderMobileItem = (user: UserInfo) => {
    const isCurrentUser = user.id === currentUserId;

    return (
      <div className="flex flex-col gap-3">
        {/* Header: Checkbox | User Info | Role */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedUsers.has(user.id)}
              onCheckedChange={(checked) => onSelectUser(user.id, checked as boolean)}
              disabled={user.id === currentUserId || isLoading || isBatchOperating || isDeleting}
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5"
            />
            <div className="flex items-center gap-2">
              {renderUserAvatar(user, 'h-8 w-8 rounded-full', 'text-xs')}
              <div className="flex flex-col">
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{user.username}</span>
                <span className="text-[10px] text-gray-500 dark:text-slate-400">
                  {user.role === 'admin' ? '管理员' : '普通用户'}
                </span>
              </div>
            </div>
          </div>

          {renderStatusBadge(user, 'w-3 h-3')}
        </div>

        {/* Content: Stats */}
        <div className="grid grid-cols-2 gap-2 rounded-[1rem] border-[0.5px] border-slate-200/50 bg-white/40 p-2 text-xs text-gray-500 shadow-sm backdrop-blur-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-300">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider opacity-70">创建时间</span>
            <span>{new Date(user.created_at).toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider opacity-70">最后登录</span>
            <span>{user.last_login_at ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true, locale: zhCN }) : '从未登录'}</span>
          </div>
        </div>

        {/* Footer: Actions */}
        <div className="flex items-center justify-end gap-1 border-t border-slate-200/50 pt-1 dark:border-white/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onEditClick(user); }}
            disabled={isDeleting || isBatchOperating}
            className="h-8 w-8 p-0 rounded-full border border-transparent hover:bg-white/60 dark:hover:bg-white/5"
          >
            <Edit className="w-4 h-4 text-gray-600 dark:text-slate-300" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onResetPasswordClick(user); }}
            disabled={isDeleting || isBatchOperating}
            className="h-8 w-8 p-0 hover:bg-amber-50 dark:hover:bg-amber-900/20"
          >
            <KeyRound className="w-4 h-4 text-amber-600" />
          </Button>
          {!isCurrentUser && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onToggleStatus(user.id, !user.is_enabled); }}
                disabled={isDeleting || isBatchOperating}
                className="h-8 w-8 rounded-full border border-transparent p-0 hover:bg-cyan-50 dark:hover:bg-cyan-950/20"
              >
                {user.is_enabled ? <PowerOff className="w-4 h-4 text-cyan-700 dark:text-cyan-300" /> : <Power className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onDeleteClick(user.id); }}
                disabled={isDeleting || isBatchOperating}
                className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <AdminDataTable
      data={users}
      columns={desktopColumns}
      rowKey={(user) => user.id}
      loading={isLoading}
      emptyText="暂无用户数据"
      hoverable
      showCount={false}
      renderMobileItem={renderMobileItem}
      renderDesktopOverlay={renderDesktopOverlay}
      onOverlayOpenChange={(item) => setActiveUser(item)}
      disableInteractionsWhenOverlayOpen
      desktopVariant="management-grid"
      desktopGridGapClassName={USER_TABLE_GRID_GAP_CLASS_NAME}
      desktopGridTemplateColumns={
        activeUser
          ? USER_TABLE_GRID_TEMPLATE_COLUMNS_WITHOUT_SELECT
          : USER_TABLE_GRID_TEMPLATE_COLUMNS
      }
      getRowAccentClassName={(user) => getStatusConfig(user).gradientClassName}
    />
  );
};
