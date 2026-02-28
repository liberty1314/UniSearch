import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { UserService } from '../../services/userService';
import type { UserInfo } from '../../types/api';
import { getErrorDataError } from '@/lib/error';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Shield, User } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface BatchUpdateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserInfo[];
  onSuccess: () => void;
}

/**
 * 批量修改角色对话框组件
 * 
 * 功能：
 * - 显示将被修改的用户列表
 * - 角色选择器（admin 或 user）
 * - 调用批量修改角色接口
 * - 显示操作结果（成功数量、失败数量）
 * 
 * 验证需求: 7.5, 7.6, 7.7, 7.8
 */
export const BatchUpdateRoleDialog: React.FC<BatchUpdateRoleDialogProps> = ({
  open,
  onOpenChange,
  users,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'user'>('user');
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
      setSelectedRole('user');
    }
  }, [open]);

  // 处理批量修改角色
  const handleBatchUpdateRole = async () => {
    if (users.length === 0) {
      toast.error('没有选中的用户');
      return;
    }

    if (!selectedRole) {
      toast.error('请选择目标角色');
      return;
    }

    setIsSubmitting(true);

    try {
      const userIds = users.map((user) => user.id);
      const operationResult = await UserService.batchUpdateRole(userIds, selectedRole);

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
      const roleText = selectedRole === 'admin' ? '管理员' : '普通用户';
      if (operationResult.failed_count === 0) {
        toast.success(`成功将 ${operationResult.success_count} 个用户修改为${roleText}`);
      } else if (operationResult.success_count === 0) {
        toast.error(`修改失败，${operationResult.failed_count} 个用户无法修改`);
      } else {
        toast.warning(
          `部分成功：${operationResult.success_count} 个成功，${operationResult.failed_count} 个失败`
        );
      }

      // 如果有成功的，通知父组件刷新列表
      if (operationResult.success_count > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error('批量修改角色失败:', error);
      const errorMessage = getErrorDataError(error) || '批量修改角色失败，请稍后重试';
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
    const roleText = selectedRole === 'admin' ? '管理员' : '普通用户';

    return (
      <Dialog open={open} onOpenChange={handleResultClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result.failedCount === 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  修改成功
                </>
              ) : result.successCount === 0 ? (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  修改失败
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  部分成功
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              批量修改角色操作已完成
            </DialogDescription>
          </DialogHeader>

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
                  成功修改的用户 ({result.success.length})
                </h4>
                <ScrollArea className="h-[100px] rounded-md border border-green-200 bg-green-50/50 p-2 dark:border-green-800 dark:bg-green-950/50">
                  <ul className="space-y-1">
                    {result.success.map((userId) => (
                      <li
                        key={userId}
                        className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {getUserDisplayName(userId)} → {roleText}
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
                  修改失败的用户 ({result.failed.length})
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

          <DialogFooter>
            <Button onClick={handleResultClose}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // 确认修改对话框
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            批量修改用户角色
          </DialogTitle>
          <DialogDescription>
            将以下 <span className="font-semibold text-foreground">{users.length}</span> 个用户的角色修改为指定角色
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 角色选择器 */}
          <div className="space-y-2">
            <Label htmlFor="role">目标角色</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as 'admin' | 'user')}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span>管理员</span>
                  </div>
                </SelectItem>
                <SelectItem value="user">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    <span>普通用户</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 用户列表 */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">将被修改的用户：</h4>
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
                      <span className="text-muted-foreground">→</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          selectedRole === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        }`}
                      >
                        {selectedRole === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">ID: {user.id}</span>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>

          {/* 提示信息 */}
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">注意事项：</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>无法修改当前登录用户的角色</li>
                  <li>不符合条件的用户将被跳过</li>
                  <li>修改后用户的权限将立即生效</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            onClick={handleBatchUpdateRole}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? '修改中...' : '确认修改'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
