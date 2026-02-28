import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { toast } from 'sonner';
import { AuthService } from '../../services/authService';
import { getErrorDataError } from '@/lib/error';
import { Loader2, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface BatchDeleteKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKeys: string[];
  onSuccess: () => void;
}

/**
 * 批量删除 API Key 对话框组件
 */
export const BatchDeleteKeysDialog: React.FC<BatchDeleteKeysDialogProps> = ({
  open,
  onOpenChange,
  selectedKeys,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (selectedKeys.length === 0) {
      toast.error('没有选中的 API Key');
      return;
    }

    setIsSubmitting(true);

    try {
      const operationResult = await AuthService.batchDeleteApiKeys(selectedKeys);

      // 显示提示
      if (operationResult.failed_count === 0) {
        toast.success(`成功删除 ${operationResult.success_count} 个 API Key`);
      } else if (operationResult.success_count === 0) {
        toast.error(`删除失败，${operationResult.failed_count} 个 API Key 无法删除`);
      } else {
        toast.warning(
          `部分成功：${operationResult.success_count} 个成功，${operationResult.failed_count} 个失败`
        );
      }

      // 如果有成功的，通知父组件刷新列表
      if (operationResult.success_count > 0) {
        onSuccess();
      }

      // 直接关闭对话框
      setIsSubmitting(false);
      onOpenChange(false);
    } catch (error) {
      console.error('批量删除 API Key 失败:', error);
      const errorMessage = getErrorDataError(error) || '批量删除失败，请稍后重试';
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  // 处理关闭
  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  // 确认删除对话框
  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            确认批量删除
          </AlertDialogTitle>
          <AlertDialogDescription>
            此操作将删除 <span className="font-semibold text-foreground">{selectedKeys.length}</span> 个 API Key，
            删除后无法恢复。请确认是否继续？
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <h4 className="mb-2 text-sm font-medium">将被删除的 API Key：</h4>
          <ScrollArea className="h-[200px] rounded-md border bg-muted/50 p-3">
            <ul className="space-y-2">
              {selectedKeys.map((key) => (
                <li
                  key={key}
                  className="rounded-md border bg-background p-2 text-sm font-mono"
                >
                  {key}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBatchDelete}
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? '删除中...' : '确认删除'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
