import React from 'react';
import { Fingerprint, LockKeyhole } from 'lucide-react';
import AccountSectionHero from '@/components/account/AccountSectionHero';
import {
  ACCOUNT_PANEL_SURFACE_CLASSES,
  ACCOUNT_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/account/accountDesign';
import { AppleInput } from '@/components/ui/AppleInput';
import { Button } from '@/components/ui/button';

interface AccountSecurityPanelProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordError?: string;
  confirmError?: string;
  isSaving: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

const AccountSecurityPanel: React.FC<AccountSecurityPanelProps> = ({
  currentPassword,
  newPassword,
  confirmPassword,
  passwordError,
  confirmError,
  isSaving,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}) => {
  return (
    <section className="space-y-6">
      <AccountSectionHero
        eyebrow="Security"
        title="安全设置"
        badgeLabel="ACCOUNT SECURITY"
        accentClassName="bg-cyan-200/20 dark:bg-cyan-700/10"
      />

      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <form
          className="relative space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <AppleInput
            id="current-password"
            label="当前密码"
            type="password"
            value={currentPassword}
            onChange={(event) => onCurrentPasswordChange(event.target.value)}
            placeholder="请输入当前密码"
            autoComplete="current-password"
            startAdornment={<LockKeyhole className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />}
            className="h-12 rounded-2xl border-white/60 bg-white/75 dark:border-white/10 dark:bg-slate-900/55"
            containerClassName="space-y-2"
          />

          <AppleInput
            id="new-password"
            label="新密码"
            type="password"
            value={newPassword}
            onChange={(event) => onNewPasswordChange(event.target.value)}
            placeholder="请输入新密码"
            autoComplete="new-password"
            error={passwordError}
            helperText="密码长度需控制在 6-64 个字符之间"
            startAdornment={<Fingerprint className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />}
            className="h-12 rounded-2xl border-white/60 bg-white/75 dark:border-white/10 dark:bg-slate-900/55"
            containerClassName="space-y-2"
          />

          <AppleInput
            id="confirm-password"
            label="确认新密码"
            type="password"
            value={confirmPassword}
            onChange={(event) => onConfirmPasswordChange(event.target.value)}
            placeholder="再次输入新密码"
            autoComplete="new-password"
            error={confirmError}
            startAdornment={<Fingerprint className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />}
            className="h-12 rounded-2xl border-white/60 bg-white/75 dark:border-white/10 dark:bg-slate-900/55"
            containerClassName="space-y-2"
          />

          <div className="flex flex-col gap-3 border-t border-white/60 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              保存后将立即使用新密码生效。
            </p>
            <Button
              type="submit"
              loading={isSaving}
              className="h-11 rounded-[8px] bg-[#0071e3] px-6 text-[17px] font-normal text-white shadow-none hover:bg-[#0077ED] active:bg-[#ededf2] active:text-[#1d1d1f]"
            >
              {isSaving ? '保存中...' : '更新密码'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default AccountSecurityPanel;
