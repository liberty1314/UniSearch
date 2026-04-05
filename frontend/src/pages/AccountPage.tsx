import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, UserRound, LockKeyhole, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { getErrorMessage } from '@/lib/error';

interface AccountProfile {
  id: number;
  username: string;
  role: string;
  is_enabled: boolean;
  last_login_at?: string | null;
  created_at?: string;
}

const formatDate = (value?: string | null) => {
  if (!value) {
    return '暂无记录';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无记录';
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AccountPage: React.FC = () => {
  const { username: cachedUsername } = useAuthStore();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await apiClient.get<AccountProfile>('/user/me');
        setProfile(data);
      } catch (error) {
        toast.error(getErrorMessage(error, '加载个人中心失败'));
      } finally {
        setIsLoadingProfile(false);
      }
    };

    void loadProfile();
  }, []);

  const passwordError = useMemo(() => {
    if (!newPassword) {
      return '';
    }
    if (newPassword.length < 6 || newPassword.length > 64) {
      return '新密码长度必须在 6-64 个字符之间';
    }
    return '';
  }, [newPassword]);

  const confirmError = useMemo(() => {
    if (!confirmPassword) {
      return '';
    }
    if (confirmPassword !== newPassword) {
      return '两次输入的新密码不一致';
    }
    return '';
  }, [confirmPassword, newPassword]);

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      toast.error('请输入当前密码');
      return;
    }
    if (passwordError) {
      toast.error(passwordError);
      return;
    }
    if (confirmError) {
      toast.error(confirmError);
      return;
    }
    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast.error('请完整填写修改密码表单');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.post('/user/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('密码修改成功');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(getErrorMessage(error, '修改密码失败'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container mx-auto px-4 py-8 pt-24 pb-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
              Account
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">个人中心</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              管理您的账号信息，并在需要时安全地更新登录密码。
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-slate-200/80 bg-white/80 shadow-[0_18px_48px_rgba(15,23,42,0.05)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <UserRound className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                  账号信息
                </CardTitle>
                <CardDescription>这里展示当前登录账号的基础资料与状态。</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/60">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">用户名</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      {profile?.username || cachedUsername || '加载中'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/60">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">角色</div>
                    <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      {profile?.role === 'admin' ? '管理员' : '普通用户'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/60">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">最近登录</div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                      <CalendarClock className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                      {isLoadingProfile ? '加载中...' : formatDate(profile?.last_login_at)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-950/60">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">账号创建时间</div>
                    <div className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
                      {isLoadingProfile ? '加载中...' : formatDate(profile?.created_at)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/80 bg-white/80 shadow-[0_18px_48px_rgba(15,23,42,0.05)] backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
                  <LockKeyhole className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
                  修改密码
                </CardTitle>
                <CardDescription>修改密码时必须先验证当前密码。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">当前密码</Label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">新密码</Label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                  />
                  {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">确认新密码</Label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-400 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
                  />
                  {confirmError && <p className="text-xs text-red-500">{confirmError}</p>}
                </div>
                <Button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 text-white hover:from-blue-500 hover:via-cyan-400 hover:to-sky-400"
                >
                  {isSaving ? '保存中...' : '更新密码'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
