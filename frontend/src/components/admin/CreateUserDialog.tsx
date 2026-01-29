import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UserService } from '@/services/userService';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { AppleInput } from '@/components/ui/AppleInput';
import { AppleButton } from '@/components/ui/AppleButton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

/**
 * 创建用户对话框组件属性
 */
interface CreateUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

/**
 * 创建用户对话框组件
 * 
 * 允许管理员创建新用户账户，包含以下功能：
 * - 用户名输入（3-32 字符）
 * - 密码输入（6-64 字符）
 * - 确认密码输入（必须与密码一致）
 * - 角色选择（admin 或 user）
 * - 前端验证和后端错误处理
 * 
 * **验证需求: 2.1, 2.2, 2.4, 2.5, 2.7, 2.8, 9.1**
 */
export function CreateUserDialog({ open, onOpenChange, onSuccess }: CreateUserDialogProps) {
    // 表单字段状态
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [role, setRole] = useState<'admin' | 'user'>('user');

    // 加载状态
    const [isLoading, setIsLoading] = useState<boolean>(false);

    /**
     * 当对话框打开时，重置表单
     */
    useEffect(() => {
        if (open) {
            setUsername('');
            setPassword('');
            setConfirmPassword('');
            setRole('user');
        }
    }, [open]);

    /**
     * 验证表单
     * 
     * 验证规则：
     * - 用户名长度：3-32 字符
     * - 密码长度：6-64 字符
     * - 密码一致性：密码和确认密码必须相同
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

        // 验证密码
        if (!password) {
            toast.error('请输入密码');
            return false;
        }

        if (password.length < 6 || password.length > 64) {
            toast.error('密码长度必须在 6-64 字符之间');
            return false;
        }

        // 验证确认密码
        if (!confirmPassword) {
            toast.error('请确认密码');
            return false;
        }

        if (password !== confirmPassword) {
            toast.error('两次输入的密码不一致');
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
     * 处理创建用户
     */
    const handleCreate = async () => {
        // 前端验证
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            // 调用用户服务创建用户
            await UserService.createUser(username.trim(), password, role);

            // 显示成功提示
            toast.success(`用户 "${username}" 创建成功`);

            // 通知父组件刷新列表
            onSuccess();

            // 关闭对话框
            onOpenChange(false);
        } catch (error: any) {
            console.error('创建用户失败:', error);

            // 显示错误提示
            if (error.response?.status === 401) {
                toast.error('未授权：请重新登录');
            } else if (error.response?.status === 403) {
                toast.error('权限不足：需要管理员权限');
            } else if (error.response?.status === 409) {
                toast.error('用户名已存在，请使用其他用户名');
            } else if (error.response?.status === 400) {
                const errorMsg = error.response?.data?.error || '请检查输入';
                toast.error('参数错误：' + errorMsg);
            } else {
                toast.error('创建失败：' + (error.message || '未知错误'));
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
            handleCreate();
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>创建用户</DialogTitle>
                    <DialogDescription>
                        创建新的用户账户，设置用户名、密码和角色
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 用户名输入 */}
                    <AppleInput
                        label="用户名"
                        id="username"
                        type="text"
                        placeholder="请输入用户名（3-32 字符）"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        autoComplete="off"
                        helperText="用户名长度为 3-32 字符"
                        required
                    />

                    {/* 密码输入 */}
                    <AppleInput
                        label="密码"
                        id="password"
                        type="password"
                        placeholder="请输入密码（6-64 字符）"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        autoComplete="new-password"
                        helperText="密码长度为 6-64 字符"
                        required
                    />

                    {/* 确认密码输入 */}
                    <AppleInput
                        label="确认密码"
                        id="confirm-password"
                        type="password"
                        placeholder="请再次输入密码"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        autoComplete="new-password"
                        error={confirmPassword && password !== confirmPassword ? '两次输入的密码不一致' : undefined}
                        required
                    />

                    {/* 角色选择 */}
                    <div className="space-y-2">
                        <Label htmlFor="role">
                            角色 <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={role}
                            onValueChange={(value) => setRole(value as 'admin' | 'user')}
                            disabled={isLoading}
                        >
                            <SelectTrigger id="role">
                                <SelectValue placeholder="请选择角色" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">普通用户</SelectItem>
                                <SelectItem value="admin">管理员</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            管理员拥有系统管理权限，普通用户只能使用搜索功能
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <AppleButton
                        variant="secondary"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        取消
                    </AppleButton>
                    <AppleButton
                        variant="primary"
                        onClick={handleCreate}
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        创建用户
                    </AppleButton>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
