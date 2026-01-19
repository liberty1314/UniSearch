import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import UserTableRow from './UserTableRow';
import type { UserInfo } from '@/types/api';

interface UserTableProps {
    users: UserInfo[];
    isLoading: boolean;
    selectedUsers: Set<number>;
    onSelectUser: (userId: number, checked: boolean) => void;
    onSelectAll: (checked: boolean) => void;
    onEditClick: (user: UserInfo) => void;
    onResetPasswordClick: (user: UserInfo) => void;
    onDeleteClick: (userId: number) => void;
    onToggleStatus: (userId: number, isEnabled: boolean) => void;
    currentUserId: number;
    isDeleting?: boolean;
    isBatchOperating?: boolean;
}

/**
 * 用户表格组件
 * 显示用户列表，支持选择、编辑、删除等操作
 * 验证需求: 1.1, 1.2
 */
const UserTable: React.FC<UserTableProps> = ({
    users,
    isLoading,
    selectedUsers,
    onSelectUser,
    onSelectAll,
    onEditClick,
    onResetPasswordClick,
    onDeleteClick,
    onToggleStatus,
    currentUserId,
    isDeleting = false,
    isBatchOperating = false,
}) => {
    /**
     * 判断是否全选
     * 排除当前用户（不可选）
     */
    const isAllSelected = (): boolean => {
        const selectableUsers = users.filter(user => user.id !== currentUserId);
        return selectableUsers.length > 0 && selectableUsers.every(user => selectedUsers.has(user.id));
    };

    /**
     * 判断是否部分选中
     */
    const isIndeterminate = (): boolean => {
        const selectableUsers = users.filter(user => user.id !== currentUserId);
        const selectedCount = selectableUsers.filter(user => selectedUsers.has(user.id)).length;
        return selectedCount > 0 && selectedCount < selectableUsers.length;
    };

    /**
     * 处理全选/取消全选
     */
    const handleSelectAll = (checked: boolean) => {
        onSelectAll(checked);
    };

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        {/* 全选框 */}
                        <TableHead className="w-12">
                            <Checkbox
                                checked={isAllSelected()}
                                onCheckedChange={handleSelectAll}
                                disabled={isLoading || isDeleting || isBatchOperating || users.length === 0}
                                aria-label="全选用户"
                                className={isIndeterminate() ? 'data-[state=checked]:bg-blue-600' : ''}
                            />
                        </TableHead>

                        {/* 用户名 */}
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            用户名
                        </TableHead>

                        {/* 角色 */}
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            角色
                        </TableHead>

                        {/* 创建时间 */}
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            创建时间
                        </TableHead>

                        {/* 最后登录 */}
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            最后登录
                        </TableHead>

                        {/* 状态 */}
                        <TableHead className="font-semibold text-slate-700 dark:text-slate-300">
                            状态
                        </TableHead>

                        {/* 操作 */}
                        <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300">
                            操作
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {isLoading ? (
                        // 加载状态
                        <TableRow>
                            <td colSpan={7} className="h-32 text-center">
                                <div className="flex items-center justify-center gap-2 text-slate-500">
                                    <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                                    <span>加载中...</span>
                                </div>
                            </td>
                        </TableRow>
                    ) : users.length === 0 ? (
                        // 空状态
                        <TableRow>
                            <td colSpan={7} className="h-32 text-center">
                                <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                                    <svg
                                        className="w-12 h-12 text-slate-300"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                        />
                                    </svg>
                                    <span className="text-sm">暂无用户数据</span>
                                </div>
                            </td>
                        </TableRow>
                    ) : (
                        // 用户列表
                        users.map((user) => (
                            <UserTableRow
                                key={user.id}
                                user={user}
                                isSelected={selectedUsers.has(user.id)}
                                canSelect={user.id !== currentUserId}
                                isDeleting={isDeleting}
                                isBatchOperating={isBatchOperating}
                                currentUserId={currentUserId}
                                onSelectChange={onSelectUser}
                                onEditClick={onEditClick}
                                onResetPasswordClick={onResetPasswordClick}
                                onDeleteClick={onDeleteClick}
                                onToggleStatus={onToggleStatus}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default UserTable;
