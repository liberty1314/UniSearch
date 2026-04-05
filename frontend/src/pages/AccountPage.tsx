import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import AccountOverviewPanel from '@/components/account/AccountOverviewPanel';
import AccountSecurityPanel from '@/components/account/AccountSecurityPanel';
import AccountWorkspaceShell from '@/components/account/AccountWorkspaceShell';
import type { AccountProfile, AccountSection } from '@/components/account/accountTypes';
import {
  validateAccountPassword,
  validateAccountPasswordConfirmation,
} from '@/components/account/passwordValidation';
import PublicPageShell from '@/components/PublicPageShell';
import { apiClient } from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { useAuthStore } from '@/stores/authStore';

const AccountPage: React.FC = () => {
  const { username: cachedUsername } = useAuthStore();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [activeSection, setActiveSection] = useState<AccountSection>('overview');
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

  const passwordError = useMemo(
    () => validateAccountPassword(newPassword, { required: false }),
    [newPassword]
  );

  const confirmError = useMemo(
    () => validateAccountPasswordConfirmation(confirmPassword, newPassword, { required: false }),
    [confirmPassword, newPassword]
  );

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      toast.error('请输入当前密码');
      return;
    }

    const nextPasswordError = validateAccountPassword(newPassword.trim(), { required: true });
    if (nextPasswordError) {
      toast.error(nextPasswordError);
      return;
    }

    const nextConfirmError = validateAccountPasswordConfirmation(
      confirmPassword.trim(),
      newPassword.trim(),
      { required: true }
    );
    if (nextConfirmError) {
      toast.error(nextConfirmError);
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
    <PublicPageShell contentClassName="container mx-auto px-4 py-8 pb-16 pt-24">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.section
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[2.4rem] border border-white/60 bg-white/72 px-6 py-7 shadow-[0_24px_60px_rgba(15,23,42,0.06)] backdrop-blur-3xl dark:border-white/[0.08] dark:bg-slate-950/44 dark:shadow-[0_26px_64px_rgba(0,0,0,0.34)] sm:px-8 sm:py-8"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent dark:via-white/[0.15]" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 top-4 h-40 w-40 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-700/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-blue-200/25 blur-3xl dark:bg-blue-900/12"
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 text-white shadow-[0_20px_40px_rgba(14,165,233,0.24)] ring-2 ring-white/65">
                  <UserRound className="h-8 w-8" strokeWidth={2.3} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-400 dark:text-slate-500">
                    Account Center
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    个人中心
                  </h1>
                </div>
              </div>

              <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300/90">
                用工作台视角管理账户资料与密码安全。页面结构收束为清晰的模块导航，避免信息展示与表单操作混在同一层级。
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700 shadow-sm dark:border-white/10 dark:bg-slate-900/70 dark:text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              Workspace Mode
            </div>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5, ease: 'easeOut' }}
        >
          <AccountWorkspaceShell
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            profile={profile}
            cachedUsername={cachedUsername}
            isLoadingProfile={isLoadingProfile}
          >
            {activeSection === 'overview' ? (
              <AccountOverviewPanel
                profile={profile}
                cachedUsername={cachedUsername}
                isLoadingProfile={isLoadingProfile}
              />
            ) : (
              <AccountSecurityPanel
                currentPassword={currentPassword}
                newPassword={newPassword}
                confirmPassword={confirmPassword}
                passwordError={passwordError}
                confirmError={confirmError}
                isSaving={isSaving}
                onCurrentPasswordChange={setCurrentPassword}
                onNewPasswordChange={setNewPassword}
                onConfirmPasswordChange={setConfirmPassword}
                onSubmit={handleChangePassword}
              />
            )}
          </AccountWorkspaceShell>
        </motion.div>
      </div>
    </PublicPageShell>
  );
};

export default AccountPage;
