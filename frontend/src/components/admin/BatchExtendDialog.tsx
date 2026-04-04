import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
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
import { Clock, Loader2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    API_KEY_EXTENSION_OPTIONS,
    convertDaysToHours,
    CUSTOM_EXTENSION_OPTION,
    getExtensionDaysLabel,
    isValidPositiveIntegerDays,
    resolveExtensionDays,
} from './apiKeyExtensionOptions';

/**
 * 批量延长对话框组件属性
 */
interface BatchExtendDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedKeys: string[];
    onSuccess: () => void;
}

/**
 * 批量延长 API Key 有效期对话框组件
 * 
 * 功能：
 * - 显示选中的密钥数量
 * - 提供按天延长的选择器
 * - 实现表单验证
 * - 显示操作进度
 */
export function BatchExtendDialog({
    open,
    onOpenChange,
    selectedKeys,
    onSuccess,
}: BatchExtendDialogProps) {
    // 延长天数选项
    const [extendOption, setExtendOption] = useState<string>('');

    // 自定义延长天数
    const [customExtendDays, setCustomExtendDays] = useState<string>('');

    // 加载状态
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // 确认对话框状态
    const [showConfirm, setShowConfirm] = useState<boolean>(false);

    /**
     * 当对话框打开时，重置表单
     */
    useEffect(() => {
        if (open) {
            setExtendOption('');
            setCustomExtendDays('');
            setShowConfirm(false); // 重置确认对话框状态
        }
    }, [open]);

    const resolvedExtendDays = resolveExtensionDays(extendOption, customExtendDays);
    const isCustomExtend = extendOption === CUSTOM_EXTENSION_OPTION;

    /**
     * 验证表单
     */
    const validateForm = (): boolean => {
        if (!extendOption) {
            toast.error('请选择要延长的天数');
            return false;
        }

        if (selectedKeys.length === 0) {
            toast.error('请至少选择一个 API Key');
            return false;
        }

        if (isCustomExtend && !isValidPositiveIntegerDays(customExtendDays)) {
            toast.error('请输入有效的自定义天数（大于 0 的整数）');
            return false;
        }

        if (resolvedExtendDays === null || resolvedExtendDays <= 0) {
            toast.error('请选择有效的延长天数');
            return false;
        }

        return true;
    };

    /**
     * 处理批量延长按钮点击 - 显示确认对话框
     */
    const handleBatchExtendClick = () => {
        if (!validateForm()) {
            return;
        }
        setShowConfirm(true);
    };

    /**
     * 处理批量延长确认
     */
    const handleBatchExtend = async () => {
        setShowConfirm(false);
        setIsLoading(true);

        try {
            // 调用批量延长 API
            const result = await AuthService.batchExtendApiKeys(
                selectedKeys,
                convertDaysToHours(resolvedExtendDays)
            );

            // 显示操作结果
            if (result.failed_count === 0) {
                toast.success(`成功延长 ${result.success_count} 个 API Key 的有效期`);
            } else {
                toast.warning(
                    `批量延长完成：成功 ${result.success_count} 个，失败 ${result.failed_count} 个`
                );
            }

            // 通知父组件刷新列表
            onSuccess();

            // 关闭对话框
            onOpenChange(false);
        } catch (error: unknown) {
            console.error('批量延长失败:', error);

            // 显示错误提示
            if (error && typeof error === 'object' && 'response' in error) {
                const err = error as { response?: { status?: number; data?: { error?: string } }; message?: string };
                if (err.response?.status === 401) {
                    toast.error('未授权：请重新登录');
                } else if (err.response?.status === 403) {
                    toast.error('权限不足：需要管理员权限');
                } else if (err.response?.status === 400) {
                    toast.error('参数错误：' + (err.response?.data?.error || '请检查输入'));
                } else {
                    toast.error('批量延长失败：' + (err.message || '未知错误'));
                }
            } else {
                toast.error('批量延长失败：未知错误');
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

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        批量延长有效期
                    </DialogTitle>
                    <DialogDescription>
                        为选中的 API Key 批量延长有效期
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 显示选中数量 */}
                    <div className="p-3 bg-blue-50 dark:bg-cyan-950/30 border border-blue-200 dark:border-cyan-800/70 rounded-md">
                        <div className="text-sm text-blue-900 dark:text-cyan-100">
                            <span className="font-medium">已选中 {selectedKeys.length} 个 API Key</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                            延长天数
                        </label>
                        <Select
                            value={extendOption}
                            onValueChange={setExtendOption}
                            disabled={isLoading}
                        >
                            <SelectTrigger aria-label="批量延长天数">
                                <SelectValue placeholder="请选择延长天数" />
                            </SelectTrigger>
                            <SelectContent>
                                {API_KEY_EXTENSION_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            会按各 Key 当前有效期续期；已过期 Key 会从当前时间开始计算
                        </p>
                        {extendOption ? (
                            <button
                                type="button"
                                className="text-sm text-blue-600 transition-colors hover:text-blue-500 dark:text-cyan-300 dark:hover:text-cyan-200"
                                onClick={() => {
                                    setExtendOption('');
                                    setCustomExtendDays('');
                                }}
                                disabled={isLoading}
                            >
                                清除延长设置
                            </button>
                        ) : null}
                    </div>

                    {isCustomExtend ? (
                        <AppleInput
                            label="自定义延长天数"
                            id="batch-custom-extend-days"
                            type="number"
                            min="1"
                            step="1"
                            placeholder="请输入天数"
                            value={customExtendDays}
                            onChange={(e) => setCustomExtendDays(e.target.value)}
                            disabled={isLoading}
                            helperText="仅支持大于 0 的整数天数"
                        />
                    ) : null}

                    {resolvedExtendDays !== null && resolvedExtendDays > 0 ? (
                        <p className="text-xs text-blue-600 dark:text-cyan-300">
                            当前将统一延长 {getExtensionDaysLabel(resolvedExtendDays)}
                        </p>
                    ) : null}

                    {/* 操作进度提示 */}
                    {isLoading && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-md">
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                            <span className="text-sm text-gray-600 dark:text-slate-400">
                                正在处理，请稍候...
                            </span>
                        </div>
                    )}
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
                        onClick={handleBatchExtendClick}
                        loading={isLoading}
                        disabled={isLoading}
                    >
                        确认延长
                    </AppleButton>
                </DialogFooter>
            </DialogContent>

            {/* 确认对话框 */}
            <ConfirmDialog
                open={showConfirm}
                onOpenChange={setShowConfirm}
                title="确认批量延长"
                description={`您确定要为选中的 ${selectedKeys.length} 个 API Key 延长 ${resolvedExtendDays !== null && resolvedExtendDays > 0 ? getExtensionDaysLabel(resolvedExtendDays) : '指定天数'} 的有效期吗？已过期 Key 将从当前时间开始计算。`}
                confirmText="确认延长"
                cancelText="取消"
                onConfirm={handleBatchExtend}
                isLoading={isLoading}
            />
        </Dialog>
    );
}
