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
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { UserService } from '../../services/userService';
import { SystemSettingsService } from '@/services/systemSettingsService';
import type { UserInfo } from '../../types/api';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import {
  validateAccountPassword,
  validateAccountPasswordConfirmation,
} from '@/components/account/passwordValidation';
import { DEFAULT_AUTH_POLICY, resolveAuthPolicy } from '@/lib/authPolicy';
import { getErrorDataError } from '@/lib/error';

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserInfo | null;
  onSuccess: () => void;
}

/**
 * 密码重置对话框组件
 * 
 * 功能：
 * - 重置用户密码
 * - 前端验证：密码长度、密码一致性
 * - 显示密码强度提示
 * 
 * 验证需求: 4.1, 4.2, 4.4, 4.5, 9.1
 */
export const ResetPasswordDialog: React.FC<ResetPasswordDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authPolicy, setAuthPolicy] = useState(DEFAULT_AUTH_POLICY);
  const [errors, setErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // 重置表单
  useEffect(() => {
    if (!open) {
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setErrors({});
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

  // 处理新密码输入
  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    
    // 实时验证
    if (errors.newPassword) {
      const error = validateAccountPassword(value, {
        required: true,
        minLength: authPolicy.passwordMinLength,
        maxLength: authPolicy.passwordMaxLength,
      });
      setErrors((prev) => ({ ...prev, newPassword: error }));
    }
    
    // 如果确认密码已输入，重新验证一致性
    if (confirmPassword && errors.confirmPassword) {
      const confirmError = validateAccountPasswordConfirmation(confirmPassword, value, { required: true });
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  // 处理确认密码输入
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    
    // 实时验证
    if (errors.confirmPassword) {
      const error = validateAccountPasswordConfirmation(value, newPassword, { required: true });
      setErrors((prev) => ({ ...prev, confirmPassword: error }));
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      return;
    }

    // 验证所有字段
    const newPasswordError = validateAccountPassword(newPassword, {
      required: true,
      minLength: authPolicy.passwordMinLength,
      maxLength: authPolicy.passwordMaxLength,
    });
    const confirmPasswordError = validateAccountPasswordConfirmation(confirmPassword, newPassword, {
      required: true,
    });

    if (newPasswordError || confirmPasswordError) {
      setErrors({
        newPassword: newPasswordError,
        confirmPassword: confirmPasswordError,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await UserService.resetPassword(user.id, newPassword);
      toast.success('密码重置成功');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('重置密码失败:', error);
      const errorMessage = getErrorDataError(error) || '重置密码失败，请稍后重试';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>
            为用户 <span className="font-semibold text-foreground">{user?.username}</span> 设置新密码
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 新密码 */}
            <div className="grid gap-2">
              <Label htmlFor="newPassword">
                新密码 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  placeholder={`请输入新密码（${authPolicy.passwordMinLength}-${authPolicy.passwordMaxLength} 个字符）`}
                  className={errors.newPassword ? 'border-destructive' : ''}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isSubmitting}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-destructive">{errors.newPassword}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {`密码长度应在 ${authPolicy.passwordMinLength}-${authPolicy.passwordMaxLength} 个字符之间，首尾空格会计入密码内容`}
              </p>
            </div>

            {/* 确认密码 */}
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">
                确认密码 <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  placeholder="请再次输入新密码"
                  className={errors.confirmPassword ? 'border-destructive' : ''}
                  disabled={isSubmitting}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              重置密码
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
