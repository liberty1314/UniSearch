import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import SEO from '@/components/SEO';
import { apiClient } from '@/lib/api';
import { DEFAULT_AUTH_POLICY, resolveAuthPolicy } from '@/lib/authPolicy';
import { getErrorMessage } from '@/lib/error';
import { SystemSettingsService } from '@/services/systemSettingsService';
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
  const [authPolicy, setAuthPolicy] = useState(DEFAULT_AUTH_POLICY);

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

  useEffect(() => {
    const loadAuthPolicy = async () => {
      try {
        const settings = await SystemSettingsService.getSettings();
        setAuthPolicy(resolveAuthPolicy(settings));
      } catch {
        setAuthPolicy(DEFAULT_AUTH_POLICY);
      }
    };

    void loadAuthPolicy();
  }, []);

  const passwordError = useMemo(
    () =>
      validateAccountPassword(newPassword, {
        required: false,
        minLength: authPolicy.passwordMinLength,
        maxLength: authPolicy.passwordMaxLength,
      }),
    [authPolicy.passwordMaxLength, authPolicy.passwordMinLength, newPassword]
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

    const nextPasswordError = validateAccountPassword(newPassword, {
      required: true,
      minLength: authPolicy.passwordMinLength,
      maxLength: authPolicy.passwordMaxLength,
    });
    if (nextPasswordError) {
      toast.error(nextPasswordError);
      return;
    }

    const nextConfirmError = validateAccountPasswordConfirmation(
      confirmPassword,
      newPassword,
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

  const passwordPolicyText = `密码长度需控制在 ${authPolicy.passwordMinLength}-${authPolicy.passwordMaxLength} 个字符之间，首尾空格会计入密码内容`;

  return (
    <PublicPageShell contentClassName="container mx-auto px-4 py-8 pb-16 pt-24">
      <SEO title="个人中心 | UniSearch" description="管理您的 UniSearch 账号与安全设置。" />
      <div className="mx-auto max-w-7xl space-y-8">
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
            <AnimatePresence mode="wait">
              {activeSection === 'overview' ? (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <AccountOverviewPanel
                    profile={profile}
                    cachedUsername={cachedUsername}
                    isLoadingProfile={isLoadingProfile}
                    onOpenSecurity={() => setActiveSection('security')}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <AccountSecurityPanel
                    currentPassword={currentPassword}
                    newPassword={newPassword}
                    confirmPassword={confirmPassword}
                    passwordPolicyText={passwordPolicyText}
                    passwordError={passwordError}
                    confirmError={confirmError}
                    isSaving={isSaving}
                    onCurrentPasswordChange={setCurrentPassword}
                    onNewPasswordChange={setNewPassword}
                    onConfirmPasswordChange={setConfirmPassword}
                    onSubmit={handleChangePassword}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </AccountWorkspaceShell>
        </motion.div>
      </div>
    </PublicPageShell>
  );
};

export default AccountPage;
