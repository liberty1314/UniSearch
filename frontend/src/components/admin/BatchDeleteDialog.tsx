import React, { useState, useEffect } from 'react';
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
import { UserService } from '../../services/userService';
import type { UserInfo } from '../../types/api';
import { Loader2, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface BatchDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserInfo[];
  onSuccess: () => void;
}

/**
 * 批量删除用户对话框组件
 * 
 * 功能：
 * - 显示将被删除的用户列表
 * - 显示警告信息
 * - 调用批量删除接口
 * - 显示操作结果（成功数量、失败数量）
 * 
 * 验证需求: 7.2, 7.3, 7.4, 7.8
 */
export const BatchDeleteDialog: React.FC<BatchDeleteDialogProps> = ({
  open,
  onOpenChange,
  users,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{
    successCount: number;
    failedCount: number;
    success: number[];
    failed: Array<{ id: number; error: string }>;
  } | null>(null);

  // 重置状态
  useEffect(() => {
    if (!open) {
      setShowResult(false);
      setResult(null);
    }
  }, [open]);

  // 处理批量删除
  const handleBatchDelete = async () => {
    if (users.length === 0) {
      toast.error('没有选中的用户');
      return;
    }

    setIsSubmitting(true);

    try {
      const userIds = users.map((user) => user.id);
      const operationResult = await UserService.batchDeleteUsers(userIds);

      // 保存结果
      setResult({
        successCount: operationResult.success_count,
        failedCount: operationResult.failed_count,
        success: operationResult.success || [],
        failed: operationResult.failed || [],
      });

      // 显示结果
      setShowResult(true);

      // 显示提示
      if (operationResult.failed_count === 0) {
        toast.success(`成功删除 ${operationResult.success_count} 个用户`);
      } else if (operationResult.success_count === 0) {
        toast.error(`删除失败，${operationResult.failed_count} 个用户无法删除`);
      } else {
        toast.warning(
          `部分成功：${operationResult.success_count} 个成功，${operationResult.failed_count} 个失败`
        );
      }

      // 如果有成功的，通知父组件刷新列表
      if (operationResult.success_count > 0) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('批量删除用户失败:', error);
      const errorMessage = error.response?.data?.error || '批量删除失败，请稍后重试';
      toast.error(errorMessage);
      setIsSubmitting(false);
    } finally {
      // 不在这里设置 isSubmitting 为 false，等待用户关闭结果对话框
    }
  };

  // 处理关闭
  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  // 处理结果对话框关闭
  const handleResultClose = () => {
    setIsSubmitting(false);
    onOpenChange(false);
  };

  // 获取用户显示名称
  const getUserDisplayName = (userId: number): string => {
    const user = users.find((u) => u.id === userId);
    return user ? user.username : `用户 #${userId}`;
  };

  // 如果正在显示结果
  if (showResult && result) {
    return (
      <AlertDialog open={open} onOpenChange={handleResultClose}>
        <AlertDialogContent className="sm:max-w-[500px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {result.failedCount === 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  删除成功
                </>
              ) : result.successCount === 0 ? (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  删除失败
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  部分成功
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              批量删除操作已完成
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                <div className="text-sm text-green-600 dark:text-green-400">成功</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {result.successCount}
                </div>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                <div className="text-sm text-red-600 dark:text-red-400">失败</div>
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {result.failedCount}
                </div>
              </div>
            </div>

            {/* 成功列表 */}
            {result.success.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-green-700 dark:text-green-400">
                  成功删除的用户 ({result.success.length})
                </h4>
                <ScrollArea className="h-[100px] rounded-md border border-green-200 bg-green-50/50 p-2 dark:border-green-800 dark:bg-green-950/50">
                  <ul className="space-y-1">
                    {result.success.map((userId) => (
                      <li
                        key={userId}
                        className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {getUserDisplayName(userId)}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {/* 失败列表 */}
            {result.failed.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-700 dark:text-red-400">
                  删除失败的用户 ({result.failed.length})
                </h4>
                <ScrollArea className="h-[120px] rounded-md border border-red-200 bg-red-50/50 p-2 dark:border-red-800 dark:bg-red-950/50">
                  <ul className="space-y-2">
                    {result.failed.map((item) => (
                      <li key={item.id} className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                          <XCircle className="h-3 w-3" />
                          {getUserDisplayName(item.id)}
                        </div>
                        <div className="ml-5 text-xs text-red-600 dark:text-red-400">
                          {item.error}
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogAction onClick={handleResultClose}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

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
            此操作将删除以下 <span className="font-semibold text-foreground">{users.length}</span> 个用户，
            删除后无法恢复。请确认是否继续？
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <h4 className="mb-2 text-sm font-medium">将被删除的用户：</h4>
          <ScrollArea className="h-[200px] rounded-md border bg-muted/50 p-3">
            <ul className="space-y-2">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between rounded-md border bg-background p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.username}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      }`}
                    >
                      {user.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">ID: {user.id}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>

          {/* 警告信息 */}
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">注意事项：</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>无法删除当前登录的用户</li>
                  <li>必须保留至少一个管理员账户</li>
                  <li>删除操作无法撤销</li>
                  <li>不符合条件的用户将被跳过</li>
                </ul>
              </div>
            </div>
          </div>
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
