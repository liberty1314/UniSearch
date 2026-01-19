import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, KeyRound, Power, PowerOff } from 'lucide-react';
import type { UserInfo } from '@/types/api';

interface UserTableRowProps {
    user: UserInfo;
    isSelected: boolean;
    canSelect: boolean;
    isDeleting: boolean;
    isBatchOperating: boolean;
    currentUserId: number;
    onSelectChange: (userId: number, checked: boolean) => void;
    onEditClick: (user: UserInfo) => void;
    onResetPasswordClick: (user: UserInfo) => void;
    onDeleteClick: (userId: number) => void;
    onToggleStatus: (userId: number, isEnabled: boolean) => void;
}

/**
 * 用户表格行组件
 * 使用 React.memo 避免不必要的重新渲染
 */
const UserTableRow: React.FC<UserTableRowProps> = memo(({
    user,
    isSelected,
    canSelect,
    isDeleting,
    isBatchOperating,
    currentUserId,
    onSelectChange,
    onEditClick,
    onResetPasswordClick,
    onDeleteClick,
    onToggleStatus,
}) => {
    /**
     * 格式化日期时间
     */
    const formatDateTime = (dateString: string | null): string => {
        if (!dateString) return '从未登录';
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    /**
     * 判断是否为当前用户
     */
    const isCurrentUser = user.id === currentUserId;

    /**
     * 获取角色显示
     */
    const getRoleBadge = (role: 'admin' | 'user') => {
        if (role === 'admin') {
            return (
                <Badge variant="default" className="font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                    管理员
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="font-medium">
                普通用户
            </Badge>
        );
    };

    /**
     * 获取状态显示
     */
    const getStatusBadge = (isEnabled: boolean) => {
        if (isEnabled) {
            return (
                <Badge variant="success" className="font-medium">
                    正常
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="font-medium text-gray-500">
                已禁用
            </Badge>
        );
    };

    return (
        <TableRow
            className={`
                group transition-all duration-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/50
                ${!user.is_enabled ? 'opacity-60' : ''}
                ${isCurrentUser ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
            `}
        >
            {/* 选择框 */}
            <TableCell className="w-12">
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                        onSelectChange(user.id, checked as boolean)
                    }
                    disabled={!canSelect || isBatchOperating || isDeleting || isCurrentUser}
                    aria-label={`选择用户 ${user.username}`}
                />
            </TableCell>

            {/* 用户名 */}
            <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                    <span className="text-slate-700 dark:text-slate-300">
                        {user.username}
                    </span>
                    {isCurrentUser && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            当前用户
                        </Badge>
                    )}
                </div>
            </TableCell>

            {/* 角色 */}
            <TableCell>
                {getRoleBadge(user.role)}
            </TableCell>

            {/* 创建时间 */}
            <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                {formatDateTime(user.created_at)}
            </TableCell>

            {/* 最后登录 */}
            <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                {formatDateTime(user.last_login_at)}
            </TableCell>

            {/* 状态 */}
            <TableCell>
                {getStatusBadge(user.is_enabled)}
            </TableCell>

            {/* 操作按钮 */}
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {/* 编辑按钮 */}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditClick(user)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
                            title="编辑用户"
                            disabled={isDeleting || isBatchOperating}
                        >
                            <Edit className="w-4 h-4" />
                        </Button>
                    </motion.div>

                    {/* 重置密码按钮 */}
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onResetPasswordClick(user)}
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/50"
                            title="重置密码"
                            disabled={isDeleting || isBatchOperating}
                        >
                            <KeyRound className="w-4 h-4" />
                        </Button>
                    </motion.div>

                    {/* 启用/禁用按钮 */}
                    {!isCurrentUser && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onToggleStatus(user.id, !user.is_enabled)}
                                className={`h-8 w-8 p-0 ${
                                    user.is_enabled
                                        ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/50'
                                        : 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/50'
                                }`}
                                title={user.is_enabled ? '禁用用户' : '启用用户'}
                                disabled={isDeleting || isBatchOperating}
                            >
                                {user.is_enabled ? (
                                    <PowerOff className="w-4 h-4" />
                                ) : (
                                    <Power className="w-4 h-4" />
                                )}
                            </Button>
                        </motion.div>
                    )}

                    {/* 删除按钮 */}
                    {!isCurrentUser && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteClick(user.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                                title="删除用户"
                                disabled={isDeleting || isBatchOperating}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </motion.div>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}, (prevProps, nextProps) => {
    // 自定义比较函数，只在这些属性变化时才重新渲染
    return (
        prevProps.user.id === nextProps.user.id &&
        prevProps.user.username === nextProps.user.username &&
        prevProps.user.role === nextProps.user.role &&
        prevProps.user.is_enabled === nextProps.user.is_enabled &&
        prevProps.user.last_login_at === nextProps.user.last_login_at &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.canSelect === nextProps.canSelect &&
        prevProps.isDeleting === nextProps.isDeleting &&
        prevProps.isBatchOperating === nextProps.isBatchOperating &&
        prevProps.currentUserId === nextProps.currentUserId
    );
});

UserTableRow.displayName = 'UserTableRow';

export default UserTableRow;
