import React from 'react';
import { Activity, Globe, RefreshCw, Save, Server, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppleSwitch } from '@/components/ui/apple-switch';
import { Label } from '@/components/ui/label';
import type { RuntimeSettingsResponse } from '@/services/systemSettingsService';
import {
  SETTINGS_GROUP_TITLE_CLASSES,
  SETTINGS_PANEL_PADDED_CLASSES,
} from './panelStyles';

interface RuntimeSettingsPanelProps {
  runtimeSettings: RuntimeSettingsResponse;
  isSavingRuntime: boolean;
  onUpdateRuntimeField: <K extends keyof RuntimeSettingsResponse>(
    field: K,
    value: RuntimeSettingsResponse[K],
  ) => void;
  onSaveRuntimeSettings: () => void;
}

type RuntimeNumberField =
  | 'default_concurrency'
  | 'http_max_conns'
  | 'async_response_timeout'
  | 'async_max_background_workers'
  | 'async_max_background_tasks';

const NUMBER_INPUT_CLASSES =
  'h-11 bg-white/80 text-[15px] focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/80';

export const RuntimeSettingsPanel: React.FC<RuntimeSettingsPanelProps> = ({
  runtimeSettings,
  isSavingRuntime,
  onUpdateRuntimeField,
  onSaveRuntimeSettings,
}) => {
  const updateNumberField = (field: RuntimeNumberField, value: string) => {
    onUpdateRuntimeField(field, Number(value) as RuntimeSettingsResponse[typeof field]);
  };

  return (
    <div className="space-y-3">
      <h2 className={SETTINGS_GROUP_TITLE_CLASSES}>运行配置</h2>
      <div className={SETTINGS_PANEL_PADDED_CLASSES}>
        <div className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              并发配置
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="runtime-default-concurrency">默认并发数</Label>
                <Input
                  id="runtime-default-concurrency"
                  type="number"
                  min={1}
                  max={500}
                  value={runtimeSettings.default_concurrency}
                  onChange={(event) => updateNumberField('default_concurrency', event.target.value)}
                  disabled={isSavingRuntime}
                  className={NUMBER_INPUT_CLASSES}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="runtime-http-max-conns">最大连接数</Label>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    重启后生效
                  </span>
                </div>
                <Input
                  id="runtime-http-max-conns"
                  type="number"
                  min={1}
                  max={100000}
                  value={runtimeSettings.http_max_conns}
                  onChange={(event) => updateNumberField('http_max_conns', event.target.value)}
                  disabled={isSavingRuntime}
                  className={NUMBER_INPUT_CLASSES}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              异步插件配置
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50/80 p-3 dark:bg-slate-950/40">
                <div>
                  <Label className="text-sm font-semibold text-slate-900 dark:text-white">
                    启用异步插件
                  </Label>
                  <p className="mt-1 text-xs text-slate-500">插件 Web 路由需重启后完全生效</p>
                </div>
                <AppleSwitch
                  checked={runtimeSettings.async_plugin_enabled}
                  onCheckedChange={(checked) => onUpdateRuntimeField('async_plugin_enabled', checked)}
                  disabled={isSavingRuntime}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="runtime-async-response-timeout">响应超时</Label>
                <Input
                  id="runtime-async-response-timeout"
                  type="number"
                  min={1}
                  max={120}
                  value={runtimeSettings.async_response_timeout}
                  onChange={(event) => updateNumberField('async_response_timeout', event.target.value)}
                  disabled={isSavingRuntime}
                  className={NUMBER_INPUT_CLASSES}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="runtime-async-workers">最大工作者</Label>
                <Input
                  id="runtime-async-workers"
                  type="number"
                  min={1}
                  max={1000}
                  value={runtimeSettings.async_max_background_workers}
                  onChange={(event) => updateNumberField('async_max_background_workers', event.target.value)}
                  disabled={isSavingRuntime}
                  className={NUMBER_INPUT_CLASSES}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="runtime-async-tasks">最大任务</Label>
                <Input
                  id="runtime-async-tasks"
                  type="number"
                  min={1}
                  max={100000}
                  value={runtimeSettings.async_max_background_tasks}
                  onChange={(event) => updateNumberField('async_max_background_tasks', event.target.value)}
                  disabled={isSavingRuntime}
                  className={NUMBER_INPUT_CLASSES}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Globe className="h-4 w-4 text-cyan-700 dark:text-cyan-300" />
              代理配置
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-slate-50/80 p-3 dark:bg-slate-950/40">
                <div>
                  <Label className="text-sm font-semibold text-slate-900 dark:text-white">
                    启用代理
                  </Label>
                  <p className="mt-1 text-xs text-slate-500">保存后会重新加载 HTTP 客户端</p>
                </div>
                <AppleSwitch
                  checked={runtimeSettings.proxy_enabled}
                  onCheckedChange={(checked) => onUpdateRuntimeField('proxy_enabled', checked)}
                  disabled={isSavingRuntime}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="runtime-proxy-url">代理地址</Label>
                <Input
                  id="runtime-proxy-url"
                  value={runtimeSettings.proxy_url}
                  onChange={(event) => onUpdateRuntimeField('proxy_url', event.target.value)}
                  placeholder="socks5://127.0.0.1:7890"
                  disabled={isSavingRuntime || !runtimeSettings.proxy_enabled}
                  className={NUMBER_INPUT_CLASSES}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Server className="h-4 w-4" />
            运行配置保存后会影响新的请求和任务，标注项需要重启服务。
          </div>
          <Button onClick={onSaveRuntimeSettings} disabled={isSavingRuntime}>
            {isSavingRuntime ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存运行配置
          </Button>
        </div>
      </div>
    </div>
  );
};
