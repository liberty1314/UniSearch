import React from 'react';
import { Fingerprint, LockKeyhole } from 'lucide-react';
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
      <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/72 p-7 shadow-[0_20px_48px_rgba(15,23,42,0.05)] backdrop-blur-3xl dark:border-white/[0.08] dark:bg-slate-950/42 dark:shadow-[0_22px_56px_rgba(0,0,0,0.34)] sm:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/[0.15]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-cyan-200/20 blur-3xl dark:bg-cyan-700/10"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-[0_16px_32px_rgba(14,165,233,0.22)]">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
                  Security
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  安全设置
                </h2>
              </div>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300/90">
              修改密码前需要先验证当前密码。新密码应避免复用历史常用密码，并确保只有你本人掌握。
            </p>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/72 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.05)] backdrop-blur-3xl dark:border-white/[0.08] dark:bg-slate-950/42 dark:shadow-[0_20px_48px_rgba(0,0,0,0.34)] sm:p-7">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/[0.15]" />
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
