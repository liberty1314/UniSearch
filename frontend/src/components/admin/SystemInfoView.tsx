import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatsCard } from './StatsCard';
import { PluginManageDialog } from './PluginManageDialog';
import { ChannelManageDialog } from './ChannelManageDialog';
import {
  Activity,
  RefreshCw,
  Server,
  Database,
  Zap,
  Globe,
  CheckCircle2,
  Layers,
  Radio,
  Edit,
  Users,
  TrendingUp,
  Eye,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import type { AdminDialogMode, SystemInfoResponse, TGChannel, ListTGChannelsResponse } from '@/types/api';
import { toast } from 'sonner';

const SYSTEM_INFO_CACHE_TTL_MS = 1500;

let systemInfoRequestInFlight: Promise<SystemInfoResponse | null> | null = null;
let systemInfoCache: { value: SystemInfoResponse | null; expiresAt: number; token: string | null } | null = null;

const fetchSystemInfoSingleFlight = async (token: string | null, force = false): Promise<SystemInfoResponse | null> => {
  if (!token) {
    return null;
  }

  const now = Date.now();
  const hasFreshCache =
    systemInfoCache &&
    systemInfoCache.token === token &&
    systemInfoCache.expiresAt > now;

  if (!force && hasFreshCache) {
    return systemInfoCache.value;
  }

  if (!force && systemInfoRequestInFlight) {
    return systemInfoRequestInFlight;
  }

  systemInfoRequestInFlight = (async () => {
    const response = await fetch('/api/admin/system-info', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('获取系统信息失败');
    }

    return (await response.json()) as SystemInfoResponse;
  })();

  try {
    const result = await systemInfoRequestInFlight;
    systemInfoCache = {
      value: result,
      expiresAt: Date.now() + SYSTEM_INFO_CACHE_TTL_MS,
      token,
    };
    return result;
  } finally {
    systemInfoRequestInFlight = null;
  }
};

const fetchChannelSummary = async (token: string): Promise<{ total: number; enabled: number; disabled: number; error: number }> => {
  const response = await fetch('/api/admin/channels', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取频道统计失败');
  }

  const data = (await response.json()) as ListTGChannelsResponse;
  const channels: TGChannel[] = Array.isArray(data?.channels) ? data.channels : [];
  const total = channels.length;
  const enabled = channels.filter((channel) => channel.is_enabled).length;
  const healthSummary = data?.health_summary;
  const fallbackError = channels.filter((channel) => (channel.health_status || 'untested') === 'error').length;

  return {
    total,
    enabled,
    disabled: total - enabled,
    error: typeof healthSummary?.error === 'number' ? healthSummary.error : fallbackError,
  };
};

/**
 * 系统监控视图组件
 *
 * 功能：
 * - 显示系统统计信息（插件数、频道数、缓存状态等）
 * - 显示 TG 频道和插件的摘要统计，并通过只读弹窗查看全量
 * - 显示系统配置信息（缓存、并发、代理等）
 */
export const SystemInfoView: React.FC = () => {
  const { token } = useAuthStore();
  const [systemInfo, setSystemInfo] = useState<SystemInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPluginManageDialogOpen, setIsPluginManageDialogOpen] = useState<boolean>(false);
  const [isChannelManageDialogOpen, setIsChannelManageDialogOpen] = useState<boolean>(false);
  const [pluginDialogMode, setPluginDialogMode] = useState<AdminDialogMode>('edit');
  const [channelDialogMode, setChannelDialogMode] = useState<AdminDialogMode>('edit');
  const [channelSummary, setChannelSummary] = useState({
    total: 0,
    enabled: 0,
    disabled: 0,
    error: 0,
  });
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshChannelSummary = useCallback(async () => {
    if (!token) return;

    try {
      const summary = await fetchChannelSummary(token);
      if (isMountedRef.current) {
        setChannelSummary(summary);
      }
    } catch (error: unknown) {
      console.warn('获取频道统计失败，使用系统信息兜底:', error);
    }
  }, [token]);

  /**
   * 加载系统信息
   */
  const loadSystemInfo = useCallback(async (force = false, silent = false) => {
    if (!silent && isMountedRef.current) {
      setIsLoading(true);
    }

    try {
      const data = await fetchSystemInfoSingleFlight(token, force);
      if (isMountedRef.current) {
        setSystemInfo(data);

        if (data) {
          const enabledFromConfig = data.config.channels.length;
          const totalFromStats = Math.max(data.stats.channel_count, enabledFromConfig);
          setChannelSummary({
            total: totalFromStats,
            enabled: enabledFromConfig,
            disabled: Math.max(totalFromStats - enabledFromConfig, 0),
            error: 0,
          });
        }
      }

      void refreshChannelSummary();
    } catch (error: unknown) {
      console.error('加载系统信息失败:', error);
      toast.error('加载系统信息失败');
    } finally {
      if (!silent && isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [refreshChannelSummary, token]);

  /**
   * 初始加载
   */
  useEffect(() => {
    loadSystemInfo();
  }, [loadSystemInfo]);

  /**
   * 格式化代理 URL（隐藏敏感信息）
   */
  const formatProxyUrl = (url: string): string => {
    if (!url) return '未配置';
    return url.replace(/(:\/\/)([^:]+):([^@]+)@/, '$1***:***@');
  };

  /**
   * 插件/频道管理成功后的回调
   */
  const handleManageSuccess = () => {
    loadSystemInfo(true, true);
  };

  const pluginSummary = useMemo(() => {
    const plugins = systemInfo?.plugins ?? [];
    const active = plugins.filter((plugin) => plugin.is_enabled && (plugin.status === 'active' || plugin.status === 'custom')).length;
    const error = plugins.filter((plugin) => plugin.status === 'error').length;
    const inactive = plugins.filter((plugin) => plugin.status !== 'error' && (!plugin.is_enabled || plugin.status === 'inactive')).length;

    return {
      total: plugins.length,
      active,
      error,
      inactive,
    };
  }, [systemInfo?.plugins]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="inline-block"
        >
          <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </motion.div>
        <p className="mt-4 text-slate-500 dark:text-slate-400">加载中...</p>
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">暂无系统信息</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard
          title="插件总数"
          value={systemInfo.stats.plugin_count}
          icon={Layers}
          color="nebula"
          index={0}
        />
        <StatsCard
          title="活跃插件"
          value={systemInfo.stats.active_plugin_count}
          icon={CheckCircle2}
          color="emerald"
          index={1}
        />
        <StatsCard
          title="频道数量"
          value={systemInfo.stats.channel_count}
          icon={Radio}
          color="purple"
          index={2}
        />
        <StatsCard
          title="缓存状态"
          value={systemInfo.stats.cache_enabled ? '已启用' : '已禁用'}
          icon={Database}
          color={systemInfo.stats.cache_enabled ? 'emerald' : 'amber'}
          index={3}
        />
        <StatsCard
          title="今日活跃"
          value={systemInfo.stats.dau}
          icon={Users}
          color="emerald"
          index={4}
        />
        <StatsCard
          title="月活跃"
          value={systemInfo.stats.mau}
          icon={TrendingUp}
          color="purple"
          index={5}
        />
      </div>

      <Card className="border-gray-100 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b border-gray-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Telegram 频道摘要
                <Badge variant="outline" className="ml-1 text-xs">
                  {channelSummary.total}
                </Badge>
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                首页已折叠展示，点击查看全部查看完整列表
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setChannelDialogMode('view');
                    setIsChannelManageDialogOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  查看全部
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setChannelDialogMode('edit');
                    setIsChannelManageDialogOpen(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  编辑
                </Button>
              </motion.div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-4 py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">总频道（数据库）</p>
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{channelSummary.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-900/20 px-4 py-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">已启用</p>
              <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">{channelSummary.enabled}</p>
            </div>
            <div className="rounded-xl border border-red-100 dark:border-red-900 bg-red-50/70 dark:bg-red-900/20 px-4 py-3">
              <p className="text-xs text-red-700 dark:text-red-300">异常</p>
              <p className="text-xl font-semibold text-red-700 dark:text-red-300">{channelSummary.error}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-4 py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">已禁用</p>
              <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">{channelSummary.disabled}</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            口径说明：总频道来自数据库，启用/禁用根据频道开关状态统计，异常包含启用与禁用频道。
          </p>
        </CardContent>
      </Card>

      <Card className="border-gray-100 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b border-gray-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                插件状态摘要
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                首页已折叠展示，点击查看全部查看完整列表
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPluginDialogMode('view');
                    setIsPluginManageDialogOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  查看全部
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setPluginDialogMode('edit');
                    setIsPluginManageDialogOpen(true);
                  }}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  编辑
                </Button>
              </motion.div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-4 py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">总插件</p>
              <p className="text-xl font-semibold text-slate-800 dark:text-slate-100">{pluginSummary.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-900/20 px-4 py-3">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">活跃</p>
              <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">{pluginSummary.active}</p>
            </div>
            <div className="rounded-xl border border-red-100 dark:border-red-900 bg-red-50/70 dark:bg-red-900/20 px-4 py-3">
              <p className="text-xs text-red-700 dark:text-red-300">异常</p>
              <p className="text-xl font-semibold text-red-700 dark:text-red-300">{pluginSummary.error}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-4 py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">不活跃</p>
              <p className="text-xl font-semibold text-slate-700 dark:text-slate-200">{pluginSummary.inactive}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-100 dark:border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b border-gray-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50">
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
            <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            系统配置
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            查看当前系统的运行配置参数
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                缓存配置
              </div>
              <div className="space-y-2 pl-6 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-slate-500 dark:text-slate-400">缓存路径:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono text-xs break-all">
                    {systemInfo.config.cache_path}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">最大大小:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {systemInfo.config.cache_max_size_mb} MB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">TTL:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {systemInfo.config.cache_ttl_minutes} 分钟
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                并发配置
              </div>
              <div className="space-y-2 pl-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">默认并发数:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {systemInfo.config.default_concurrency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">最大连接数:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {systemInfo.config.http_max_conns}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Globe className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                代理配置
              </div>
              <div className="space-y-2 pl-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">代理状态:</span>
                  <Badge variant={systemInfo.stats.proxy_enabled ? 'success' : 'outline'}>
                    {systemInfo.stats.proxy_enabled ? '已启用' : '未启用'}
                  </Badge>
                </div>
                {systemInfo.stats.proxy_enabled && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">代理地址:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono text-xs break-all">
                      {formatProxyUrl(systemInfo.config.proxy_url)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                异步插件配置
              </div>
              <div className="space-y-2 pl-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">异步插件:</span>
                  <Badge variant={systemInfo.config.async_plugin_enabled ? 'success' : 'outline'}>
                    {systemInfo.config.async_plugin_enabled ? '已启用' : '未启用'}
                  </Badge>
                </div>
                {systemInfo.config.async_plugin_enabled && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">响应超时:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {systemInfo.config.async_response_timeout} 秒
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">最大工作者:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {systemInfo.config.async_max_background_workers}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">最大任务:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {systemInfo.config.async_max_background_tasks}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <PluginManageDialog
        isOpen={isPluginManageDialogOpen}
        onClose={() => setIsPluginManageDialogOpen(false)}
        onSuccess={handleManageSuccess}
        token={token || ''}
        plugins={systemInfo.plugins}
        mode={pluginDialogMode}
      />

      <ChannelManageDialog
        isOpen={isChannelManageDialogOpen}
        onClose={() => setIsChannelManageDialogOpen(false)}
        onSuccess={handleManageSuccess}
        token={token || ''}
        mode={channelDialogMode}
      />
    </motion.div>
  );
};
