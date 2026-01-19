import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UserService } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { UserInfo } from '@/types/api';

/**
 * 编辑用户对话框组件属性
 */
interface EditUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: UserInfo | null;
    onSuccess: () => void;
}

/**
 * 编辑用户对话框组件
 * 
 * 允许管理员编辑现有用户信息，包含以下功能：
 * - 用户名输入（3-32 字符）
 * - 角色选择（admin 或 user）
 * - 如果是当前用户，禁用角色选择
 * - 前端验证和后端错误处理
 * 
 * **验证需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 9.1**
 */
export function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
    // 获取当前登录用户信息
    const { username: currentUsername } = useAuthStore();

    // 表单字段状态
    const [username, setUsername] = useState<string>('');
    const [role, setRole] = useState<'admin' | 'user'>('user');

    // 加载状态
    const [isLoading, setIsLoading] = useState<boolean>(false);

    /**
     * 判断是否为当前用户
     */
    const isCurrentUser = user?.username === currentUsername;

    /**
     * 当对话框打开或用户信息变化时，初始化表单
     */
    useEffect(() => {
        if (open && user) {
            setUsername(user.username);
            setRole(user.role);
        }
    }, [open, user]);

    /**
     * 验证表单
     * 
     * 验证规则：
     * - 用户名长度：3-32 字符
     * - 角色：必须为 admin 或 user
     */
    const validateForm = (): boolean => {
        // 验证用户名
        if (!username.trim()) {
            toast.error('请输入用户名');
            return false;
        }

        if (username.length < 3 || username.length > 32) {
            toast.error('用户名长度必须在 3-32 字符之间');
            return false;
        }

        // 验证角色
        if (role !== 'admin' && role !== 'user') {
            toast.error('请选择有效的角色');
            return false;
        }

        return true;
    };

    /**
     * 处理更新用户
     */
    const handleUpdate = async () => {
        if (!user) {
            toast.error('用户信息不存在');
            return;
        }

        // 前端验证
        if (!validateForm()) {
            return;
        }

        // 检查是否有修改
        if (username.trim() === user.username && role === user.role) {
            toast.info('没有任何修改');
            return;
        }

        setIsLoading(true);

        try {
            // 调用用户服务更新用户
            await UserService.updateUser(user.id, username.trim(), role);

            // 显示成功提示
            toast.success(`用户 "${username}" 更新成功`);

            // 通知父组件刷新列表
            onSuccess();

            // 关闭对话框
            onOpenChange(false);
        } catch (error: any) {
            console.error('更新用户失败:', error);

            // 显示错误提示
            if (error.response?.status === 401) {
                toast.error('未授权：请重新登录');
            } else if (error.response?.status === 403) {
                const errorMsg = error.response?.data?.error || '权限不足';
                toast.error(errorMsg);
            } else if (error.response?.status === 404) {
                toast.error('用户不存在');
            } else if (error.response?.status === 409) {
                toast.error('用户名已存在，请使用其他用户名');
            } else if (error.response?.status === 400) {
                const errorMsg = error.response?.data?.error || '请检查输入';
                toast.error('参数错误：' + errorMsg);
            } else {
                toast.error('更新失败：' + (error.message || '未知错误'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 处理对话框关闭
     */
    const handleClose = () => {
        if (!isLoading) {
            onOpenChange(false);
        }
    };

    /**
     * 处理按下 Enter 键
     */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isLoading) {
            handleUpdate();
        }
    };

    // 如果没有用户信息，不渲染对话框
    if (!user) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>编辑用户</DialogTitle>
                    <DialogDescription>
                        修改用户的基本信息和角色权限
                        {isCurrentUser && (
                            <span className="block mt-2 text-amber-600 dark:text-amber-500">
                                ⚠️ 您正在编辑自己的账户，无法修改角色
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 用户名输入 */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-username">
                            用户名 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="edit-username"
                            type="text"
                            placeholder="请输入用户名（3-32 字符）"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            autoComplete="off"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            用户名长度为 3-32 字符
                        </p>
                    </div>

                    {/* 角色选择 */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-role">
                            角色 <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={role}
                            onValueChange={(value) => setRole(value as 'admin' | 'user')}
                            disabled={isLoading || isCurrentUser}
                        >
                            <SelectTrigger id="edit-role">
                                <SelectValue placeholder="请选择角色" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">普通用户</SelectItem>
                                <SelectItem value="admin">管理员</SelectItem>
                            </SelectContent>
                        </Select>
                        {isCurrentUser ? (
                            <p className="text-xs text-amber-600 dark:text-amber-500">
                                不能修改自己的角色
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                管理员拥有系统管理权限，普通用户只能使用搜索功能
                            </p>
                        )}
                    </div>

                    {/* 用户信息显示 */}
                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">用户 ID:</span>
                            <span className="font-medium">{user.id}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">创建时间:</span>
                            <span className="font-medium">
                                {new Date(user.created_at).toLocaleString('zh-CN')}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">最后登录:</span>
                            <span className="font-medium">
                                {user.last_login_at
                                    ? new Date(user.last_login_at).toLocaleString('zh-CN')
                                    : '从未登录'}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        取消
                    </Button>
                    <Button
                        onClick={handleUpdate}
                        disabled={isLoading}
                    >
                        {isLoading ? '更新中...' : '保存修改'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
