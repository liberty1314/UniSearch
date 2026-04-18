import React from 'react';
import { Fingerprint, LockKeyhole } from 'lucide-react';
import AccountSectionHero from '@/components/account/AccountSectionHero';
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

      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/20 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.5)] backdrop-blur-3xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-[background-color,border-color,box-shadow] duration-500 hover:bg-white/30 hover:shadow-[0_20px_64px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:hover:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-[0_20px_64px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] group sm:p-7">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/40" />
        <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:via-white/30" />
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
              className="h-11 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-500 px-6 text-white shadow-[0_12px_28px_rgba(6,182,212,0.25)] hover:from-blue-500 hover:via-cyan-400 hover:to-sky-400 hover:shadow-[0_16px_36px_rgba(6,182,212,0.32)]"
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
