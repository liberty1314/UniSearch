import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { UserService } from '@/services/userService';
import { SystemSettingsService } from '@/services/systemSettingsService';
import { getErrorDataCode, getErrorDataError, getErrorMessage, getErrorStatus } from '@/lib/error';
import { DEFAULT_AUTH_POLICY, resolveAuthPolicy, USERNAME_CHARSET_PATTERN } from '@/lib/authPolicy';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AppleInput } from '@/components/ui/AppleInput';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    getPasswordPolicyHelperText,
    hasPasswordWhitespace,
    removePasswordWhitespace,
    validateAccountPassword,
} from '@/components/account/passwordValidation';

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
 * - 用户名输入（以后端认证策略为准，默认 3-32 字符）
 * - 密码输入（以后端认证策略为准，默认 6-64 字符）
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
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
    const [showRestoreDialog, setShowRestoreDialog] = useState<boolean>(false);
    const [authPolicy, setAuthPolicy] = useState(DEFAULT_AUTH_POLICY);

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
            setShowPassword(false);
            setShowConfirmPassword(false);
            setShowRestoreDialog(false);
        }
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const loadAuthPolicy = async () => {
            try {
                const settings = await SystemSettingsService.getSettings();
                setAuthPolicy(resolveAuthPolicy(settings));
            } catch {
                setAuthPolicy(DEFAULT_AUTH_POLICY);
            }
        };

        void loadAuthPolicy();
    }, [open]);

    /**
     * 验证表单
     * 
     * 验证规则：
     * - 用户名长度：以后端认证策略为准
     * - 密码长度：以后端认证策略为准
     * - 密码一致性：密码和确认密码必须相同
     * - 角色：必须为 admin 或 user
     */
    const validateForm = (): boolean => {
        const trimmedUsername = username.trim();

        // 验证用户名
        if (!trimmedUsername) {
            toast.error('请输入用户名');
            return false;
        }

        if (
            trimmedUsername.length < authPolicy.usernameMinLength ||
            trimmedUsername.length > authPolicy.usernameMaxLength
        ) {
            toast.error(`用户名长度必须在 ${authPolicy.usernameMinLength}-${authPolicy.usernameMaxLength} 字符之间`);
            return false;
        }
        // 用户名字符集校验，与注册路径及后端 ValidateUsernameCharset 一致。
        if (!USERNAME_CHARSET_PATTERN.test(trimmedUsername)) {
            toast.error('用户名只能包含字母、数字、下划线和连字符');
            return false;
        }

        // 验证密码
        const passwordError = validateAccountPassword(password, {
            required: true,
            minLength: authPolicy.passwordMinLength,
            maxLength: authPolicy.passwordMaxLength,
            complexityClasses: authPolicy.passwordComplexityClasses,
        });
        if (passwordError) {
            toast.error(passwordError === '请输入新密码' ? '请输入密码' : passwordError);
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

    const normalizePasswordInput = (value: string) => {
        if (!hasPasswordWhitespace(value)) {
            return value;
        }

        toast.error('密码不能包含空格');
        return removePasswordWhitespace(value);
    };

    /**
     * 处理创建用户
     */
    const submitCreate = async (restoreIfDeleted: boolean = false) => {
        // 前端验证
        if (!validateForm()) {
            return;
        }

        const trimmedUsername = username.trim();
        setIsLoading(true);

        try {
            // 调用用户服务创建用户
            const result = await UserService.createUser(trimmedUsername, password, role, restoreIfDeleted);

            // 显示成功提示
            if (result.restored) {
                toast.success(`用户 "${trimmedUsername}" 已恢复并更新密码/角色`);
            } else {
                toast.success(`用户 "${trimmedUsername}" 创建成功`);
            }

            // 通知父组件刷新列表
            onSuccess();

            // 关闭对话框
            setShowRestoreDialog(false);
            onOpenChange(false);
        } catch (error) {
            console.error('创建用户失败:', error);

            // 显示错误提示
            const status = getErrorStatus(error);
            const dataCode = getErrorDataCode(error);
            if (status === 401) {
                toast.error('未授权：请重新登录');
            } else if (status === 403) {
                toast.error('权限不足：需要管理员权限');
            } else if (status === 409 && dataCode === 'USER_SOFT_DELETED') {
                setShowRestoreDialog(true);
            } else if (status === 409) {
                toast.error(getErrorDataError(error) || '用户名已存在，请使用其他用户名');
            } else if (status === 400) {
                const errorMsg = getErrorDataError(error) || '请检查输入';
                toast.error('参数错误：' + errorMsg);
            } else {
                toast.error('创建失败：' + (getErrorDataError(error) || getErrorMessage(error)));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        await submitCreate(false);
    };

    const handleRestore = async () => {
        await submitCreate(true);
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

    const renderPasswordToggle = (
        visible: boolean,
        onToggle: () => void,
        label: string
    ) => (
        <button
            type="button"
            onClick={onToggle}
            disabled={isLoading}
            aria-label={visible ? `隐藏${label}` : `显示${label}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
    );

    return (
        <>
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
                            placeholder={`请输入用户名（${authPolicy.usernameMinLength}-${authPolicy.usernameMaxLength} 字符）`}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            autoComplete="off"
                            helperText={`用户名长度为 ${authPolicy.usernameMinLength}-${authPolicy.usernameMaxLength} 字符`}
                            required
                        />

                        {/* 密码输入 */}
                        <AppleInput
                            label="密码"
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder={`请输入密码（${authPolicy.passwordMinLength}-${authPolicy.passwordMaxLength} 字符）`}
                            value={password}
                            onChange={(e) => setPassword(normalizePasswordInput(e.target.value))}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            autoComplete="new-password"
                            helperText={getPasswordPolicyHelperText(authPolicy)}
                            endAdornment={renderPasswordToggle(showPassword, () => setShowPassword((prev) => !prev), '密码')}
                            required
                        />

                        {/* 确认密码输入 */}
                        <AppleInput
                            label="确认密码"
                            id="confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="请再次输入密码"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(normalizePasswordInput(e.target.value))}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                            autoComplete="new-password"
                            error={confirmPassword && password !== confirmPassword ? '两次输入的密码不一致' : undefined}
                            endAdornment={renderPasswordToggle(showConfirmPassword, () => setShowConfirmPassword((prev) => !prev), '确认密码')}
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
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                管理员拥有系统管理权限，普通用户只能使用搜索功能
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            取消
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleCreate}
                            loading={isLoading}
                            disabled={isLoading}
                        >
                            创建用户
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
                <AlertDialogContent closeDisabled={isLoading}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>恢复已删除账号</AlertDialogTitle>
                        <AlertDialogDescription>
                            用户名 "{username.trim()}" 对应的账号已被软删除。继续操作将恢复原账号，并使用当前填写的密码和角色覆盖原设置。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestore} disabled={isLoading}>
                            恢复账号
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
