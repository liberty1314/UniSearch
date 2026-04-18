import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import AccountOverviewPanel from '@/components/account/AccountOverviewPanel';
import AccountSecurityPanel from '@/components/account/AccountSecurityPanel';
import AccountWorkspaceShell from '@/components/account/AccountWorkspaceShell';
import type { AccountProfile, AccountSection } from '@/components/account/accountTypes';
import {
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/account/accountDesign';
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
          className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} px-6 py-7 sm:px-8 sm:py-8`}
        >

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border-[0.5px] border-slate-200/50 bg-white/40 text-slate-700 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-200">
                  <UserRound className="h-8 w-8" strokeWidth={2} />
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
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full border-[0.5px] border-slate-200/50 bg-white/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-[0_4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md transition-all dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-300">
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
