import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StatsCard } from './StatsCard';
import {
  Activity,
  ArrowUpRight,
  RefreshCw,
  Server,
  Database,
  Zap,
  Globe,
  CheckCircle2,
  Layers,
  Radio,
  Users,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import type {
  SystemInfoResponse,
  TGChannel,
  ListTGChannelsResponse,
  SearchObservabilitySnapshot,
} from '@/types/api';
import { toast } from 'sonner';
import {
  ADMIN_PANEL_SURFACE_CLASSES,
  ADMIN_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/admin/adminDesign';
import { buildAdminUrl } from '@/lib/adminRoute';

const SYSTEM_INFO_CACHE_TTL_MS = 1500;

let systemInfoRequestInFlight: Promise<SystemInfoResponse | null> | null = null;
let systemInfoCache: { value: SystemInfoResponse | null; expiresAt: number; token: string | null } | null = null;

type CacheSettingsSummary = {
  cache_enabled: boolean;
  search_cache_ttl_seconds: number;
  hot_ranking_cache_enabled: boolean;
  hot_ranking_preload_enabled: boolean;
  hot_ranking_preload_time: string;
  hot_ranking_preload_limit: number;
  hot_ranking_cache_ttl_seconds: number;
  redis_connected: boolean;
  last_preload_result?: {
    total: number;
    success: number;
    failed: number;
  };
  last_preload_at?: string;
  last_preload_status?: string;
};

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

const fetchCacheSettingsSummary = async (token: string): Promise<CacheSettingsSummary | null> => {
  const response = await fetch('/api/admin/system-settings/cache', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取缓存配置失败');
  }

  return (await response.json()) as CacheSettingsSummary;
};

const fetchSearchObservability = async (token: string): Promise<SearchObservabilitySnapshot | null> => {
  const response = await fetch('/api/admin/search-observability', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('获取搜索观测信息失败');
  }

  return (await response.json()) as SearchObservabilitySnapshot;
};

const summaryMetricClasses = {
  neutral:
    'border-slate-200/65 bg-white/58 text-slate-700 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.48] dark:text-slate-200',
  success:
    'border-emerald-200/70 bg-emerald-50/72 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/24 dark:text-emerald-300',
  danger:
    'border-rose-200/70 bg-rose-50/70 text-rose-700 dark:border-rose-400/20 dark:bg-rose-950/24 dark:text-rose-300',
} as const;

type SummaryMetricTone = keyof typeof summaryMetricClasses;

const renderSummaryMetric = (
  label: string,
  value: number,
  tone: SummaryMetricTone = 'neutral',
) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-[1.15rem] border px-4 py-3 shadow-[0_8px_22px_rgba(15,23,42,0.045)] backdrop-blur-xl',
      summaryMetricClasses[tone],
    )}
  >
    <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/10" />
    <p className="text-xs font-medium opacity-80">{label}</p>
    <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
  </div>
);

/**
 * 系统监控视图组件
 *
 * 功能：
 * - 显示系统统计信息（插件数、频道数、缓存状态等）
 * - 显示 TG 频道和插件的摘要统计，并跳转到独立管理页
 * - 显示系统配置信息（缓存、并发、代理等）
 */
export const SystemInfoView: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [systemInfo, setSystemInfo] = useState<SystemInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [channelSummary, setChannelSummary] = useState({
    total: 0,
    enabled: 0,
    disabled: 0,
    error: 0,
  });
  const [cacheSettings, setCacheSettings] = useState<CacheSettingsSummary | null>(null);
  const [searchObservability, setSearchObservability] = useState<SearchObservabilitySnapshot | null>(null);
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
      const [data, cacheConfig, searchMetrics] = await Promise.all([
        fetchSystemInfoSingleFlight(token, force),
        token ? fetchCacheSettingsSummary(token) : Promise.resolve(null),
        token
          ? fetchSearchObservability(token).catch((error: unknown) => {
              console.warn('获取搜索观测信息失败，系统信息页继续使用基础摘要:', error);
              return null;
            })
          : Promise.resolve(null),
      ]);
      if (isMountedRef.current) {
        setSystemInfo(data);
        setCacheSettings(cacheConfig);
        setSearchObservability(searchMetrics);

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

  const searchHealthSummary = useMemo(() => {
    const metrics = searchObservability;
    const searchCount = metrics
      ? Object.values(metrics.search_count || {}).reduce((sum, value) => sum + value, 0)
      : 0;
    const durationValues = metrics ? Object.values(metrics.average_duration_ms || {}) : [];
    const averageDuration = durationValues.length > 0
      ? Math.round(durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length)
      : 0;
    const hitRates = metrics ? Object.values(metrics.cache_hit_rate || {}) : [];
    const cacheHitRate = hitRates.length > 0
      ? Math.round((hitRates.reduce((sum, value) => sum + value, 0) / hitRates.length) * 100)
      : 0;

    return {
      searchCount,
      averageDuration,
      cacheHitRate,
      timeoutCount: metrics?.timeout_count ?? 0,
      warningCount: metrics?.warning_count ?? 0,
      topKeywords: metrics?.top_keywords ?? [],
      recentErrors: metrics?.recent_errors ?? [],
    };
  }, [searchObservability]);

  const createCardNavigationProps = useCallback((targetView: 'channel_management' | 'plugin_management') => {
    const targetUrl = buildAdminUrl(targetView);

    return {
      role: 'button' as const,
      tabIndex: 0,
      onClick: () => navigate(targetUrl),
      onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(targetUrl);
        }
      },
    };
  }, [navigate]);

  const handleOpenRuntimeSettings = useCallback(() => {
    navigate(`${buildAdminUrl('system_settings')}&section=runtime`);
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="inline-block"
        >
          <RefreshCw className="w-8 h-8 text-blue-600 dark:text-cyan-300" />
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
          title="可用插件"
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
          title="今日活跃用户"
          value={systemInfo.stats.dau}
          icon={Users}
          color="emerald"
          index={4}
        />
        <StatsCard
          title="本月活跃用户"
          value={systemInfo.stats.mau}
          icon={TrendingUp}
          color="purple"
          index={5}
        />
      </div>

      <Card
        className={cn(
          ADMIN_PANEL_SURFACE_CLASSES,
          ADMIN_PANEL_SURFACE_HOVER_CLASSES,
          'overflow-hidden cursor-pointer transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60',
        )}
        aria-label="进入 Telegram 频道管理页"
        {...createCardNavigationProps('channel_management')}
      >
        <CardHeader className="border-b border-slate-200/50 bg-[linear-gradient(135deg,rgba(236,254,255,0.66),rgba(255,255,255,0.34))] backdrop-blur-md dark:border-cyan-300/[0.08] dark:bg-[linear-gradient(135deg,rgba(8,47,73,0.38),rgba(2,6,23,0.38))]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-100/80 bg-cyan-50/80 text-cyan-700 shadow-sm dark:border-cyan-300/[0.16] dark:bg-cyan-950/30 dark:text-cyan-200">
                  <Radio className="w-4 h-4" />
                </span>
                Telegram 频道摘要
                <Badge variant="outline" className="ml-1 text-xs">
                  {channelSummary.total}
                </Badge>
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                系统监控仅保留摘要，点击进入完整管理页
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-white/70 px-3 py-1 text-xs font-medium text-cyan-700 shadow-sm dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.52] dark:text-cyan-200">
              点击进入管理页
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {renderSummaryMetric('总频道（数据库）', channelSummary.total)}
            {renderSummaryMetric('已启用', channelSummary.enabled, 'success')}
            {renderSummaryMetric('异常', channelSummary.error, 'danger')}
            {renderSummaryMetric('已禁用', channelSummary.disabled)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            口径说明：总频道来自数据库，启用/禁用根据频道开关状态统计，异常包含启用与禁用频道。
          </p>
        </CardContent>
      </Card>

      <Card
        className={cn(
          ADMIN_PANEL_SURFACE_CLASSES,
          ADMIN_PANEL_SURFACE_HOVER_CLASSES,
          'overflow-hidden cursor-pointer transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60',
        )}
        aria-label="进入插件中心管理页"
        {...createCardNavigationProps('plugin_management')}
      >
        <CardHeader className="border-b border-slate-200/50 bg-[linear-gradient(135deg,rgba(236,254,255,0.66),rgba(255,255,255,0.34))] backdrop-blur-md dark:border-cyan-300/[0.08] dark:bg-[linear-gradient(135deg,rgba(8,47,73,0.38),rgba(2,6,23,0.38))]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-100/80 bg-cyan-50/80 text-cyan-700 shadow-sm dark:border-cyan-300/[0.16] dark:bg-cyan-950/30 dark:text-cyan-200">
                  <Activity className="w-4 h-4" />
                </span>
                插件状态摘要
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                系统监控仅保留摘要，点击进入完整管理页
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/70 bg-white/70 px-3 py-1 text-xs font-medium text-cyan-700 shadow-sm dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.52] dark:text-cyan-200">
              点击进入管理页
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {renderSummaryMetric('总插件', pluginSummary.total)}
            {renderSummaryMetric('活跃', pluginSummary.active, 'success')}
            {renderSummaryMetric('异常', pluginSummary.error, 'danger')}
            {renderSummaryMetric('不活跃', pluginSummary.inactive)}
          </div>
        </CardContent>
      </Card>

      <Card className={cn(ADMIN_PANEL_SURFACE_CLASSES, ADMIN_PANEL_SURFACE_HOVER_CLASSES, 'overflow-hidden')}>
        <CardHeader className="border-b border-slate-200/50 bg-[linear-gradient(135deg,rgba(236,254,255,0.66),rgba(255,255,255,0.34))] backdrop-blur-md dark:border-cyan-300/[0.08] dark:bg-[linear-gradient(135deg,rgba(8,47,73,0.38),rgba(2,6,23,0.38))]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-100/80 bg-cyan-50/80 text-cyan-700 shadow-sm dark:border-cyan-300/[0.16] dark:bg-cyan-950/30 dark:text-cyan-200">
                  <Zap className="w-4 h-4" />
                </span>
                搜索健康摘要
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                最近搜索耗时、缓存命中和异常来源统计
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadSystemInfo(true, true)}
              className="rounded-full"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {renderSummaryMetric('最近搜索数', searchHealthSummary.searchCount)}
            {renderSummaryMetric('平均耗时 ms', searchHealthSummary.averageDuration)}
            {renderSummaryMetric('缓存命中率 %', searchHealthSummary.cacheHitRate, searchHealthSummary.cacheHitRate > 0 ? 'success' : 'neutral')}
            {renderSummaryMetric('插件超时', searchHealthSummary.timeoutCount, searchHealthSummary.timeoutCount > 0 ? 'danger' : 'neutral')}
            {renderSummaryMetric('Warning', searchHealthSummary.warningCount, searchHealthSummary.warningCount > 0 ? 'danger' : 'neutral')}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.15rem] border border-slate-200/70 bg-slate-50/70 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.40]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Top 关键词</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {searchHealthSummary.topKeywords.length > 0 ? searchHealthSummary.topKeywords.slice(0, 8).map((item) => (
                  <Badge key={item.keyword} variant="outline">
                    {item.keyword} · {item.count}
                  </Badge>
                )) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">暂无关键词记录</span>
                )}
              </div>
            </div>
            <div className="rounded-[1.15rem] border border-slate-200/70 bg-slate-50/70 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.40]">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">最近异常</p>
              <div className="mt-3 space-y-2">
                {searchHealthSummary.recentErrors.length > 0 ? searchHealthSummary.recentErrors.slice(0, 3).map((item, index) => (
                  <div key={`${item.scope}-${item.keyword}-${index}`} className="rounded-xl border border-rose-200/60 bg-white/70 px-3 py-2 text-xs text-rose-700 dark:border-rose-300/20 dark:bg-white/[0.04] dark:text-rose-200">
                    <span className="font-medium">{item.scope}</span>
                    {item.keyword ? <span> · {item.keyword}</span> : null}
                    <span>：{item.message}</span>
                  </div>
                )) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">暂无异常记录</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(ADMIN_PANEL_SURFACE_CLASSES, ADMIN_PANEL_SURFACE_HOVER_CLASSES, 'overflow-hidden')}>
        <CardHeader className="border-b border-slate-200/50 bg-white/20 backdrop-blur-md dark:border-cyan-300/[0.08] dark:bg-slate-950/[0.38]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
                <Server className="w-5 h-5 text-blue-600 dark:text-cyan-300" />
                系统配置
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                查看当前系统的运行配置参数
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-label="前往运行配置设置"
              onClick={handleOpenRuntimeSettings}
              className="self-start"
            >
              前往设置
              <ArrowUpRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Database className="w-4 h-4 text-blue-600 dark:text-cyan-300" />
                缓存配置
              </div>
              <div className="space-y-2 pl-6 text-sm">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="text-slate-500 dark:text-slate-400">Redis 状态:</span>
                  <Badge variant={cacheSettings?.redis_connected ? 'success' : 'outline'}>
                    {cacheSettings?.redis_connected ? '已连接' : '未连接'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">搜索缓存 TTL:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {cacheSettings?.search_cache_ttl_seconds ?? '--'} 秒
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">榜单预热时间:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {cacheSettings?.hot_ranking_preload_time ?? '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">榜单预热条数:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {cacheSettings?.hot_ranking_preload_limit ?? '--'} 条
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">榜单缓存 TTL:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {cacheSettings?.hot_ranking_cache_ttl_seconds ?? '--'} 秒
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500 dark:text-slate-400">最近预热结果:</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {cacheSettings?.last_preload_status === 'cleared'
                      ? `缓存已被清理 (${(() => {
                          if (!cacheSettings.last_preload_at) return '暂无时间';
                          const d = new Date(cacheSettings.last_preload_at);
                          if (isNaN(d.getTime())) return cacheSettings.last_preload_at;
                          const pad = (n: number) => n.toString().padStart(2, '0');
                          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
                        })()})`
                      : cacheSettings?.last_preload_result
                        ? `任务 ${cacheSettings.last_preload_result.total} / 成功 ${cacheSettings.last_preload_result.success} / 失败 ${cacheSettings.last_preload_result.failed}`
                        : '暂无记录'}
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
                <Globe className="w-4 h-4 text-cyan-700 dark:text-cyan-300" />
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

    </motion.div>
  );
};
