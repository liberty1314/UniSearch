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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Clock, Loader2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

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
 * - 提供延长小时数输入框
 * - 实现表单验证
 * - 显示操作进度
 */
export function BatchExtendDialog({
    open,
    onOpenChange,
    selectedKeys,
    onSuccess,
}: BatchExtendDialogProps) {
    // 延长小时数
    const [extendHours, setExtendHours] = useState<string>('720'); // 默认 30 天

    // 加载状态
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // 确认对话框状态
    const [showConfirm, setShowConfirm] = useState<boolean>(false);

    /**
     * 当对话框打开时，重置表单
     */
    useEffect(() => {
        if (open) {
            setExtendHours('720'); // 重置为默认值
            setShowConfirm(false); // 重置确认对话框状态
        }
    }, [open]);

    /**
     * 验证表单
     */
    const validateForm = (): boolean => {
        if (!extendHours || isNaN(Number(extendHours)) || Number(extendHours) <= 0) {
            toast.error('请输入有效的延长小时数（大于 0）');
            return false;
        }

        if (selectedKeys.length === 0) {
            toast.error('请至少选择一个 API Key');
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
                Number(extendHours)
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

    /**
     * 计算延长后的天数
     */
    const calculateDays = (): number => {
        const hours = Number(extendHours);
        if (isNaN(hours) || hours <= 0) return 0;
        return Math.floor(hours / 24);
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
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <div className="text-sm text-blue-900 dark:text-blue-100">
                            <span className="font-medium">已选中 {selectedKeys.length} 个 API Key</span>
                        </div>
                    </div>

                    {/* 延长小时数输入 */}
                    <div className="space-y-2">
                        <Label htmlFor="extend-hours">延长小时数</Label>
                        <Input
                            id="extend-hours"
                            type="number"
                            min="1"
                            placeholder="例如：720（30天）"
                            value={extendHours}
                            onChange={(e) => setExtendHours(e.target.value)}
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            在当前过期时间基础上延长指定小时数
                        </p>
                        {extendHours && !isNaN(Number(extendHours)) && Number(extendHours) > 0 && (
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                将延长约 {calculateDays()} 天
                            </p>
                        )}
                    </div>

                    {/* 操作进度提示 */}
                    {isLoading && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                正在处理，请稍候...
                            </span>
                        </div>
                    )}
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
                        onClick={handleBatchExtendClick}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                处理中...
                            </>
                        ) : (
                            '确认延长'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>

            {/* 确认对话框 */}
            <ConfirmDialog
                open={showConfirm}
                onOpenChange={setShowConfirm}
                title="确认批量延长"
                description={`您确定要为选中的 ${selectedKeys.length} 个 API Key 延长 ${extendHours} 小时（约 ${calculateDays()} 天）的有效期吗？`}
                confirmText="确认延长"
                cancelText="取消"
                onConfirm={handleBatchExtend}
                isLoading={isLoading}
            />
        </Dialog>
    );
}
