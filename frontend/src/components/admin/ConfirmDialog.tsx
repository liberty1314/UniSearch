import React from 'react';
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

/**
 * 确认对话框组件属性
 */
interface ConfirmDialogProps {
    /** 是否打开 */
    open: boolean;
    /** 打开状态变化回调 */
    onOpenChange: (open: boolean) => void;
    /** 对话框标题 */
    title: string;
    /** 对话框描述 */
    description: string;
    /** 确认按钮文本 */
    confirmText?: string;
    /** 取消按钮文本 */
    cancelText?: string;
    /** 确认按钮样式（危险操作使用 destructive） */
    variant?: 'default' | 'destructive';
    /** 确认回调 */
    onConfirm: () => void;
    /** 是否正在处理 */
    isLoading?: boolean;
}

/**
 * 确认对话框组件
 * 
 * 用于需要用户确认的操作，如批量操作、删除等
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    open,
    onOpenChange,
    title,
    description,
    confirmText = '确认',
    cancelText = '取消',
    variant = 'default',
    onConfirm,
    isLoading = false,
}) => {
    /**
     * 处理确认
     */
    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={
                            variant === 'destructive'
                                ? 'bg-red-500 hover:bg-red-600'
                                : ''
                        }
                    >
                        {isLoading ? '处理中...' : confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
