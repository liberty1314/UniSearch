import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogIn, RefreshCw, Save, ShieldAlert, Shield, UserPlus } from 'lucide-react';
import { AppleSwitch } from '@/components/ui/apple-switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SavingState } from '@/hooks/useSystemSettingsController';
import { SETTINGS_GROUP_TITLE_CLASSES, SETTINGS_PANEL_CLASSES } from './panelStyles';

interface AccountAccessSettingsPanelProps {
  enableUserAuth: boolean;
  enableUserLogin: boolean;
  enableUserSignup: boolean;
  signupAutobanEnabled: boolean;
  signupAutobanThreshold: number;
  signupAutobanWindowMin: number;
  signupAutobanDurationMin: number;
  enableSignupCaptcha: boolean;
  isSaving: SavingState;
  onToggleAuth: (checked: boolean) => void;
  onToggleLogin: (checked: boolean) => void;
  onToggleSignup: (checked: boolean) => void;
  onToggleSignupAutoban: (checked: boolean) => void;
  onChangeSignupAutobanThreshold: (value: number) => void;
  onChangeSignupAutobanWindowMin: (value: number) => void;
  onChangeSignupAutobanDurationMin: (value: number) => void;
  onSaveSignupAutoban: () => void;
  onToggleSignupCaptcha: (checked: boolean) => void;
}

export const AccountAccessSettingsPanel: React.FC<AccountAccessSettingsPanelProps> = ({
  enableUserAuth,
  enableUserLogin,
  enableUserSignup,
  signupAutobanEnabled,
  signupAutobanThreshold,
  signupAutobanWindowMin,
  signupAutobanDurationMin,
  enableSignupCaptcha,
  isSaving,
  onToggleAuth,
  onToggleLogin,
  onToggleSignup,
  onToggleSignupAutoban,
  onChangeSignupAutobanThreshold,
  onChangeSignupAutobanWindowMin,
  onChangeSignupAutobanDurationMin,
  onSaveSignupAutoban,
  onToggleSignupCaptcha,
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
            <div className="ml-16 border-t border-slate-100 dark:border-white/5">
              <div className="py-4 pr-5 sm:pr-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label
                      className="flex cursor-pointer items-center gap-2 text-[15px] font-medium text-slate-800 dark:text-slate-200"
                      onClick={() => onToggleSignupAutoban(!signupAutobanEnabled)}
                    >
                      <ShieldAlert className="h-4 w-4 text-slate-400" />
                      注册防刷 / 自动封禁
                    </Label>
                    <p className="mt-0.5 text-sm text-slate-500">
                      统计窗口内某个 IP 的注册请求数超过阈值时自动封禁该 IP
                    </p>
                  </div>
                  <AppleSwitch
                    aria-label="启用注册自动封禁"
                    checked={signupAutobanEnabled}
                    onCheckedChange={onToggleSignupAutoban}
                    disabled={isSaving === 'signup_autoban'}
                  />
                </div>

                <AnimatePresence>
                  {signupAutobanEnabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="signup-autoban-threshold">触发阈值（次）</Label>
                          <Input
                            id="signup-autoban-threshold"
                            aria-label="注册自动封禁触发阈值"
                            type="number"
                            min={1}
                            step={1}
                            value={signupAutobanThreshold}
                            disabled={isSaving === 'signup_autoban'}
                            onChange={(event) =>
                              onChangeSignupAutobanThreshold(Number(event.target.value))
                            }
                          />
                          <p className="text-xs text-slate-500">
                            窗口内注册请求数超过该值即封禁
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-autoban-window">统计窗口（分钟）</Label>
                          <Input
                            id="signup-autoban-window"
                            aria-label="注册自动封禁统计窗口"
                            type="number"
                            min={1}
                            step={1}
                            value={signupAutobanWindowMin}
                            disabled={isSaving === 'signup_autoban'}
                            onChange={(event) =>
                              onChangeSignupAutobanWindowMin(Number(event.target.value))
                            }
                          />
                          <p className="text-xs text-slate-500">
                            统计注册请求数的时间窗口
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signup-autoban-duration">封禁时长（分钟）</Label>
                          <Input
                            id="signup-autoban-duration"
                            aria-label="注册自动封禁时长"
                            type="number"
                            min={0}
                            step={1}
                            value={signupAutobanDurationMin}
                            disabled={isSaving === 'signup_autoban'}
                            onChange={(event) =>
                              onChangeSignupAutobanDurationMin(Number(event.target.value))
                            }
                          />
                          <p className="text-xs text-slate-500">
                            填 0 表示永久封禁
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          onClick={onSaveSignupAutoban}
                          disabled={isSaving === 'signup_autoban'}
                        >
                          {isSaving === 'signup_autoban' ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          保存防刷设置
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="ml-16 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between py-4 pr-5 sm:pr-6">
                <div>
                  <Label
                    className="flex cursor-pointer items-center gap-2 text-[15px] font-medium text-slate-800 dark:text-slate-200"
                    onClick={() => onToggleSignupCaptcha(!enableSignupCaptcha)}
                  >
                    <ShieldAlert className="h-4 w-4 text-slate-400" />
                    注册人机验证
                  </Label>
                  <p className="mt-0.5 text-sm text-slate-500">
                    开启后注册需通过 Cloudflare Turnstile 验证（站点公钥与密钥通过环境变量配置）
                  </p>
                </div>
                <AppleSwitch
                  aria-label="启用注册人机验证"
                  checked={enableSignupCaptcha}
                  onCheckedChange={onToggleSignupCaptcha}
                  disabled={isSaving === 'signup_captcha'}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);
