import React from 'react';
import { AppleTable, AppleTableColumn } from '@/components/AppleTable';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, KeyRound, Power, PowerOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { UserInfo } from '@/types/api';

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

  /**
   * 列配置
   */
  const columns: AppleTableColumn<UserInfo>[] = [
    {
      key: 'select',
      title: '',
      width: '48px',
      render: (user) => (
        <Checkbox
          checked={selectedUsers.has(user.id)}
          onCheckedChange={(checked) => onSelectUser(user.id, checked as boolean)}
          disabled={user.id === currentUserId || isLoading || isBatchOperating || isDeleting}
          aria-label={`选择 ${user.username}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'username',
      title: '用户名',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-apple-blue to-apple-purple flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate">{user.username}</span>
            {user.id === currentUserId && (
              <span className="text-xs text-apple-blue dark:text-apple-blue">
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
          <span className="text-sm">
            {new Date(user.created_at).toLocaleDateString('zh-CN')}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
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
            <span className="text-sm">
              {new Date(user.last_login_at).toLocaleDateString('zh-CN')}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
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
      key: 'status',
      title: '状态',
      align: 'center',
      render: (user) => {
        const statusConfig = user.is_enabled
          ? {
              text: '正常',
              color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
              icon: <Power className="w-4 h-4" />,
            }
          : {
              text: '已禁用',
              color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
              icon: <PowerOff className="w-4 h-4" />,
            };

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
      render: (user) => {
        const isCurrentUser = user.id === currentUserId;
        
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onEditClick(user);
              }}
              disabled={isDeleting || isBatchOperating}
              className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
              title="编辑"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onResetPasswordClick(user);
              }}
              disabled={isDeleting || isBatchOperating}
              className="hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600"
              title="重置密码"
            >
              <KeyRound className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onToggleStatus(user.id, !user.is_enabled);
              }}
              disabled={isCurrentUser || isDeleting || isBatchOperating}
              className="hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600"
              title={user.is_enabled ? '禁用' : '启用'}
            >
              {user.is_enabled ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onDeleteClick(user.id);
              }}
              disabled={isCurrentUser || isDeleting || isBatchOperating}
              className="hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <AppleTable
      data={users}
      columns={columns}
      rowKey={(user) => user.id}
      loading={isLoading}
      emptyText="暂无用户数据"
      hoverable
    />
  );
};
