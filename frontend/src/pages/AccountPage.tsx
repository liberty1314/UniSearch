import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import AccountErrorState from '@/components/account/AccountErrorState';
import AccountOverviewPanel from '@/components/account/AccountOverviewPanel';
import AccountPreferencesPanel from '@/components/account/AccountPreferencesPanel';
import AccountSecurityPanel from '@/components/account/AccountSecurityPanel';
import AccountWorkspaceShell from '@/components/account/AccountWorkspaceShell';
import {
  readAccountPreferences,
  writeAccountPreferences,
} from '@/components/account/accountPreferences';
import type {
  AccountPreferences,
  AccountProfile,
  AccountSection,
} from '@/components/account/accountTypes';
import {
  getPasswordPolicyHelperText,
  hasPasswordWhitespace,
  removePasswordWhitespace,
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
  const { username: cachedUsername, isAuthenticated, logout } = useAuthStore();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [activeSection, setActiveSection] = useState<AccountSection>('overview');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<AccountPreferences>(() => readAccountPreferences());
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authPolicy, setAuthPolicy] = useState(DEFAULT_AUTH_POLICY);
  const [isUsingDefaultPolicy, setIsUsingDefaultPolicy] = useState(false);
  const suppressProfileRequestsRef = useRef(false);

  const loadProfile = useCallback(async () => {
    if (!isAuthenticated || suppressProfileRequestsRef.current) {
      setIsLoadingProfile(false);
      return;
    }

    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const data = await apiClient.get<AccountProfile>('/user/me');
      setProfile(data);
    } catch (error) {
      const message = getErrorMessage(error, '加载个人中心失败');
      setProfileError(message);
      toast.error(message);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    const loadAuthPolicy = async () => {
      try {
        const settings = await SystemSettingsService.getSettings();
        setAuthPolicy(resolveAuthPolicy(settings));
        setIsUsingDefaultPolicy(false);
      } catch {
        setAuthPolicy(DEFAULT_AUTH_POLICY);
        setIsUsingDefaultPolicy(true);
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

  const canSubmitPassword = useMemo(() => {
    return Boolean(currentPassword.trim() && newPassword && confirmPassword);
  }, [confirmPassword, currentPassword, newPassword]);

  const handleSavePreferences = () => {
    writeAccountPreferences(preferences);
    toast.success('偏好设置已保存');
  };

  const normalizePasswordInput = (value: string) => {
    if (!hasPasswordWhitespace(value)) {
      return value;
    }

    toast.error('密码不能包含空格');
    return removePasswordWhitespace(value);
  };

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
      suppressProfileRequestsRef.current = true;
      await apiClient.post('/user/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('密码修改成功，下次登录请使用新密码');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      logout();
      window.location.replace('/login');
    } catch (error) {
      suppressProfileRequestsRef.current = false;
      toast.error(getErrorMessage(error, '修改密码失败'));
    } finally {
      setIsSaving(false);
    }
  };

  const passwordPolicyText = getPasswordPolicyHelperText(authPolicy);

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
            {profileError ? (
              <div className="mb-6">
                <AccountErrorState isRetrying={isLoadingProfile} onRetry={loadProfile} />
              </div>
            ) : null}
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
              ) : activeSection === 'preferences' ? (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <AccountPreferencesPanel
                    preferences={preferences}
                    onPreferencesChange={setPreferences}
                    onSave={handleSavePreferences}
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
                    canSubmit={canSubmitPassword}
                    isUsingDefaultPolicy={isUsingDefaultPolicy}
                    onCurrentPasswordChange={(value) => setCurrentPassword(normalizePasswordInput(value))}
                    onNewPasswordChange={(value) => setNewPassword(normalizePasswordInput(value))}
                    onConfirmPasswordChange={(value) => setConfirmPassword(normalizePasswordInput(value))}
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
