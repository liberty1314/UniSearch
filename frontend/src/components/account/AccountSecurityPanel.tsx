import React, { useState } from 'react';
import { Eye, EyeOff, Fingerprint, LockKeyhole } from 'lucide-react';
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
  passwordPolicyText: string;
  passwordError?: string;
  confirmError?: string;
  isSaving: boolean;
  canSubmit: boolean;
  isUsingDefaultPolicy?: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: () => void;
}

const AccountSecurityPanel: React.FC<AccountSecurityPanelProps> = ({
  currentPassword,
  newPassword,
  confirmPassword,
  passwordPolicyText,
  passwordError,
  confirmError,
  isSaving,
  canSubmit,
  isUsingDefaultPolicy = false,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}) => {
  const [visibleFields, setVisibleFields] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const renderPasswordToggle = (
    field: keyof typeof visibleFields,
    visibleLabel: string
  ) => {
    const isVisible = visibleFields[field];

    return (
      <button
        type="button"
        onClick={() =>
          setVisibleFields((prev) => ({
            ...prev,
            [field]: !prev[field],
          }))
        }
        disabled={isSaving}
        aria-label={isVisible ? `隐藏${visibleLabel}` : `显示${visibleLabel}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    );
  };

  return (
    <section className="space-y-6">
      <AccountSectionHero eyebrow="ACCOUNT SECURITY" title="安全设置" badgeLabel="密码维护" />

      <div className={`${ACCOUNT_PANEL_SURFACE_CLASSES} ${ACCOUNT_PANEL_SURFACE_HOVER_CLASSES} p-6 sm:p-7`}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
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
              type={visibleFields.current ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) => onCurrentPasswordChange(event.target.value)}
              disabled={isSaving}
              placeholder="请输入当前密码"
              autoComplete="current-password"
              helperText={passwordPolicyText}
              startAdornment={<LockKeyhole className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />}
              endAdornment={renderPasswordToggle('current', '当前密码')}
              className="h-12 rounded-xl border-[0.5px] border-slate-300 bg-white shadow-sm hover:border-slate-400 focus:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all dark:border-slate-600 dark:bg-slate-900"
              containerClassName="space-y-1.5"
            />

            <AppleInput
              id="new-password"
              label="新密码"
              type={visibleFields.next ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) => onNewPasswordChange(event.target.value)}
              disabled={isSaving}
              placeholder="请输入新密码"
              autoComplete="new-password"
              error={passwordError}
              helperText={passwordPolicyText}
              startAdornment={<Fingerprint className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />}
              endAdornment={renderPasswordToggle('next', '新密码')}
              className="h-12 rounded-xl border-[0.5px] border-slate-300 bg-white shadow-sm hover:border-slate-400 focus:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all dark:border-slate-600 dark:bg-slate-900"
              containerClassName="space-y-1.5"
            />

            <AppleInput
              id="confirm-password"
              label="确认新密码"
              type={visibleFields.confirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => onConfirmPasswordChange(event.target.value)}
              disabled={isSaving}
              placeholder="再次输入新密码"
              autoComplete="new-password"
              error={confirmError}
              helperText={passwordPolicyText}
              startAdornment={<Fingerprint className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />}
              endAdornment={renderPasswordToggle('confirm', '确认新密码')}
              className="h-12 rounded-xl border-[0.5px] border-slate-300 bg-white shadow-sm hover:border-slate-400 focus:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all dark:border-slate-600 dark:bg-slate-900"
              containerClassName="space-y-1.5"
            />

            <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-end">
              {isUsingDefaultPolicy ? (
                <p className="text-sm text-amber-600 dark:text-amber-300">
                  当前使用默认密码规则。
                </p>
              ) : null}
              <Button
                type="submit"
                loading={isSaving}
                disabled={!canSubmit || isSaving}
                className="h-11 rounded-[8px] bg-[#0071e3] px-6 text-[17px] font-normal text-white shadow-none hover:bg-[#0077ED] active:bg-[#ededf2] active:text-[#1d1d1f]"
              >
                {isSaving ? '保存中...' : '更新密码'}
              </Button>
            </div>
          </form>

          <aside className="glass-panel p-5">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-300">
                  Password Notes
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-800 dark:text-white">
                  密码更新建议
                </h3>
              </div>
              <div className="space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300/90">
                <p>{passwordPolicyText}，并尽量避免和旧密码重复。</p>
                <p>完成修改后，建议在常用设备上重新确认登录状态，确保凭证已更新。</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default AccountSecurityPanel;
