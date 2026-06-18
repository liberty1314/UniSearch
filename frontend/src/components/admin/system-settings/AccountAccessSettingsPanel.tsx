import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogIn, Shield, UserPlus } from 'lucide-react';
import { AppleSwitch } from '@/components/ui/apple-switch';
import { Label } from '@/components/ui/label';
import type { SavingState } from '@/hooks/useSystemSettingsController';
import { SETTINGS_GROUP_TITLE_CLASSES, SETTINGS_PANEL_CLASSES } from './panelStyles';

interface AccountAccessSettingsPanelProps {
  enableUserAuth: boolean;
  enableUserLogin: boolean;
  enableUserSignup: boolean;
  isSaving: SavingState;
  onToggleAuth: (checked: boolean) => void;
  onToggleLogin: (checked: boolean) => void;
  onToggleSignup: (checked: boolean) => void;
}

export const AccountAccessSettingsPanel: React.FC<AccountAccessSettingsPanelProps> = ({
  enableUserAuth,
  enableUserLogin,
  enableUserSignup,
  isSaving,
  onToggleAuth,
  onToggleLogin,
  onToggleSignup,
}) => (
  <div className="space-y-3">
    <h2 className={SETTINGS_GROUP_TITLE_CLASSES}>账号与访问</h2>
    <div className={SETTINGS_PANEL_CLASSES}>
      <div className="flex items-center justify-between p-5 transition-colors hover:bg-slate-50/50 sm:px-6 dark:hover:bg-cyan-400/[0.06]">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <Label
              className="cursor-pointer text-base font-semibold text-slate-900 dark:text-white"
              onClick={() => onToggleAuth(!enableUserAuth)}
            >
              启用用户功能
            </Label>
            <p className="mt-1 text-sm text-slate-500">
              主开关：全局控制是否开启任何用户相关的认证体系
            </p>
          </div>
        </div>
        <AppleSwitch
          checked={enableUserAuth}
          onCheckedChange={onToggleAuth}
          disabled={isSaving === 'auth'}
        />
      </div>

      <AnimatePresence>
        {enableUserAuth && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50/30 dark:bg-slate-950/[0.36]"
          >
            <div className="ml-16 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between py-4 pr-5 sm:pr-6">
                <div>
                  <Label
                    className="flex cursor-pointer items-center gap-2 text-[15px] font-medium text-slate-800 dark:text-slate-200"
                    onClick={() => onToggleLogin(!enableUserLogin)}
                  >
                    <LogIn className="h-4 w-4 text-slate-400" />
                    允许登录
                  </Label>
                  <p className="mt-0.5 text-sm text-slate-500">
                    允许已存在的用户进行密码或授权登录
                  </p>
                </div>
                <AppleSwitch
                  checked={enableUserLogin}
                  onCheckedChange={onToggleLogin}
                  disabled={isSaving === 'login'}
                />
              </div>
            </div>
            <div className="ml-16 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between py-4 pr-5 sm:pr-6">
                <div>
                  <Label
                    className="flex cursor-pointer items-center gap-2 text-[15px] font-medium text-slate-800 dark:text-slate-200"
                    onClick={() => onToggleSignup(!enableUserSignup)}
                  >
                    <UserPlus className="h-4 w-4 text-slate-400" />
                    允许注册
                  </Label>
                  <p className="mt-0.5 text-sm text-slate-500">
                    开放公共注册通道允许新用户注册账号
                  </p>
                </div>
                <AppleSwitch
                  checked={enableUserSignup}
                  onCheckedChange={onToggleSignup}
                  disabled={isSaving === 'signup'}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);

