import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AuthService } from '@/services/authService';
import { AlertTriangle } from 'lucide-react';

/**
 * BatchDeleteDialog 组件属性
 */
interface BatchDeleteDialogProps {
    /** 是否打开对话框 */
    open: boolean;
    /** 对话框打开状态变化回调 */
    onOpenChange: (open: boolean) => void;
    /** 选中的 API Keys */
    selectedKeys: string[];
    /** 删除成功回调 */
    onSuccess: () => void;
}

/**
 * 批量删除 API Key 对话框组件
 * 
 * 功能：
 * - 显示将要删除的 API Key 数量
 * - 确认批量删除操作
 * - 显示删除结果
 */
export const BatchDeleteDialog: React.FC<BatchDeleteDialogProps> = ({
    open,
    onOpenChange,
    selectedKeys,
    onSuccess,
}) => {
    const [isDeleting, setIsDeleting] = useState(false);

    /**
     * 处理批量删除
     */
    const handleBatchDelete = async () => {
        if (selectedKeys.length === 0) {
            toast.error('请选择要删除的 API Key');
            return;
        }

        setIsDeleting(true);

        try {
            const result = await AuthService.batchDeleteApiKeys(selectedKeys);

            // 显示结果
            if (result.failed_count === 0) {
                toast.success(`成功删除 ${result.success_count} 个 API Key`);
            } else {
                toast.warning(
                    `删除完成：成功 ${result.success_count} 个，失败 ${result.failed_count} 个`
                );
            }

            // 关闭对话框
            onOpenChange(false);

            // 调用成功回调
            onSuccess();
        } catch (error: unknown) {
            console.error('批量删除失败:', error);

            if (error && typeof error === 'object' && 'message' in error) {
                const err = error as { message?: string };
                toast.error('批量删除失败：' + (err.message || '未知错误'));
            } else {
                toast.error('批量删除失败：未知错误');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        确认批量删除
                    </DialogTitle>
                    <DialogDescription>
                        此操作无法撤销，请确认是否要删除选中的 API Keys。
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-sm text-red-900 dark:text-red-100">
                            您即将删除 <span className="font-bold">{selectedKeys.length}</span> 个 API Key。
                        </p>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                            删除后，使用这些 Key 的用户将无法继续访问系统。
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isDeleting}
                    >
                        取消
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleBatchDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? '删除中...' : '确认删除'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
