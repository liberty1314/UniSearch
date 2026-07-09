import React, { useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  LineChart,
  Radio,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChannelMetricsController } from '@/hooks/useChannelMetricsController';
import type { ChannelMetricStatusFilter, ChannelObservabilityRow, ChannelTrendPoint } from '@/types/channelMetrics';
import { ApplePagination } from './ApplePagination';
import { AdminDataTable, type AdminDataTableColumn } from './AdminDataTable';
import {
  AdminCardEmpty,
  AdminContentCard,
  AdminDetailDrawer,
  AdminFilterField,
  AdminFilterSurface,
  AdminFilterToolbar,
  AdminMetricCard,
  AdminMetricGrid,
  AdminSearchInput,
  AdminStatusFilter,
  AdminWorkspaceHero,
  AdminWorkspacePageFrame,
} from './AdminWorkspacePageFrame';
import { formatAdminHealthTime } from './adminDateFormat';
import {
  PERFORMANCE_TABLE_PAGE_SIZE_OPTIONS,
  useAdminClientPagination,
} from './useAdminClientPagination';

const STATUS_OPTIONS: Array<{ value: ChannelMetricStatusFilter; label: string }> = [
  { value: 'all', label: '全部状态' },
  { value: 'healthy', label: '健康' },
  { value: 'error', label: '异常' },
  { value: 'untested', label: '未测试' },
  { value: 'enabled', label: '启用中' },
  { value: 'disabled', label: '已停用' },
];

const formatMS = (value: number) => `${Math.round(value || 0)} ms`;

const formatRate = (value: number) => `${((value || 0) * 100).toFixed(1)}%`;

const formatCount = (value: number) => new Intl.NumberFormat('zh-CN').format(value || 0);

const metricValueClassName = 'whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900 dark:text-white';

const metricHintClassName = 'mt-1 whitespace-nowrap text-xs tabular-nums text-slate-500 dark:text-slate-400';

const healthSourceText = (source?: string) => {
  if (source === 'manual_test') return '手动测试';
  if (source === 'batch_test') return '批量测试';
  if (source === 'search_failure') return '搜索失败';
  if (source === 'search_success') return '搜索成功';
  if (source === 'timeout') return '搜索超时';
  if (source === 'system') return '系统检查';
  return source || '暂无来源';
};

const statusBadge = (row: ChannelObservabilityRow) => {
  if (row.healthStatus === 'healthy') {
    return {
      label: '健康',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200',
    };
  }
  if (row.healthStatus === 'error') {
    return {
      label: '异常',
      className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200',
    };
  }
  return {
    label: '未测试',
    className: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-300',
  };
};

function TrendChart({ points }: { points: ChannelTrendPoint[] }) {
  const pathData = useMemo(() => {
    if (points.length === 0) {
      return '';
    }
    const maxValue = Math.max(...points.map((point) => point.avgResponseMS), 1);
    return points
      .map((point, index) => {
        const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
        const y = 88 - (point.avgResponseMS / maxValue) * 70;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [points]);

  if (points.length === 0) {
    return (
      <AdminCardEmpty
        icon={<LineChart className="h-12 w-12 text-slate-300 dark:text-slate-600" />}
        title="暂无频道响应趋势"
        description="频道搜索产生指标后，这里会展示最近窗口的响应时间走势。"
      />
    );
  }

  const lastPoint = points[points.length - 1];
  const peakPoint = points.reduce((peak, point) => (point.avgResponseMS > peak.avgResponseMS ? point : peak), points[0]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-h-[220px] rounded-[1.25rem] border border-slate-200/70 bg-white/60 p-4 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]">
        <svg viewBox="0 0 100 100" role="img" aria-label="频道响应时间趋势图" className="h-56 w-full overflow-visible">
          <defs>
            <linearGradient id="channel-trend-stroke" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#0284c7" />
              <stop offset="52%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          {[18, 40, 62, 84].map((line) => (
            <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="currentColor" strokeWidth="0.35" className="text-slate-200 dark:text-slate-800" />
          ))}
          <path d={pathData} fill="none" stroke="url(#channel-trend-stroke)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
          {points.map((point, index) => {
            const maxValue = Math.max(...points.map((item) => item.avgResponseMS), 1);
            const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
            const y = 88 - (point.avgResponseMS / maxValue) * 70;
            return (
              <circle
                key={`${point.bucketStartedAt}-${index}`}
                cx={x}
                cy={y}
                r="1.8"
                className="fill-white stroke-cyan-600 dark:fill-slate-950 dark:stroke-cyan-300"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
      <div className="grid gap-3 text-sm">
        <div className="rounded-[1.1rem] border border-slate-200/70 bg-white/65 p-4 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">最近窗口</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatMS(lastPoint.avgResponseMS)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">请求 {formatCount(lastPoint.requestCount)} 次</p>
        </div>
        <div className="rounded-[1.1rem] border border-slate-200/70 bg-white/65 p-4 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">峰值窗口</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{formatMS(peakPoint.avgResponseMS)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">错误 {formatCount(peakPoint.errorCount)} 次</p>
        </div>
      </div>
    </div>
  );
}

function ChannelStatusCell({ row }: { row: ChannelObservabilityRow }) {
  const badge = statusBadge(row);
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <Badge variant="outline" className={cn('whitespace-nowrap rounded-full px-2.5 py-1', badge.className)}>
        {badge.label}
      </Badge>
      {row.enabled ? (
        <Badge variant="outline" className="whitespace-nowrap rounded-full border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
          启用
        </Badge>
      ) : (
        <Badge variant="outline" className="whitespace-nowrap rounded-full border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-500 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-300">
          停用
        </Badge>
      )}
    </div>
  );
}

function ResponseMetricCell({ row }: { row: ChannelObservabilityRow }) {
  return (
    <div className="min-w-0">
      <p className={metricValueClassName}>{formatMS(row.avgResponseMS)}</p>
      <p className={metricHintClassName}>P95 {formatMS(row.p95ResponseMS)}</p>
    </div>
  );
}

function QualityMetricCell({ row }: { row: ChannelObservabilityRow }) {
  return (
    <div className="min-w-0">
      <p className={metricValueClassName}>{formatRate(row.successRate)}</p>
      <p className={metricHintClassName}>超时 {formatRate(row.timeoutRate)}</p>
    </div>
  );
}

function ChannelMobileItem({
  row,
  onOpenDetail,
}: {
  row: ChannelObservabilityRow;
  onOpenDetail: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{row.displayName}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">P95 {formatMS(row.p95ResponseMS)} · 成功率 {formatRate(row.successRate)}</p>
        </div>
        <ChannelStatusCell row={row} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <span className="rounded-xl bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">平均 {formatMS(row.avgResponseMS)}</span>
        <span className="rounded-xl bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">结果 {formatCount(row.resultCount)}</span>
        <span className="rounded-xl bg-slate-100 px-3 py-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">错误 {formatCount(row.errorCount)}</span>
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="adminIconAction"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetail();
          }}
          aria-label={`查看频道 ${row.channelName} 详情（移动端）`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export const ChannelPerformancePanel: React.FC = () => {
  const controller = useChannelMetricsController();
  const { setSelectedChannelName } = controller;
  const pagination = useAdminClientPagination(controller.filteredRows);
  const { resetPage } = pagination;

  const columns = useMemo<AdminDataTableColumn<ChannelObservabilityRow>[]>(() => [
    {
      key: 'displayName',
      title: '频道',
      sortable: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{row.displayName}</p>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{row.tags.length > 0 ? row.tags.join(' / ') : row.channelName}</p>
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      render: (row) => <ChannelStatusCell row={row} />,
    },
    {
      key: 'avgResponseMS',
      title: '响应',
      sortable: true,
      align: 'right',
      render: (row) => <ResponseMetricCell row={row} />,
    },
    {
      key: 'successRate',
      title: '质量',
      sortable: true,
      align: 'right',
      render: (row) => <QualityMetricCell row={row} />,
    },
    {
      key: 'resultCount',
      title: '结果',
      sortable: true,
      align: 'right',
      render: (row) => <span className={metricValueClassName}>{formatCount(row.resultCount)}</span>,
    },
    {
      key: 'errorCount',
      title: '错误',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className={cn(
          'inline-flex min-w-10 justify-end whitespace-nowrap tabular-nums',
          row.errorCount > 0 ? 'font-semibold text-rose-600 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'
        )}>
          {formatCount(row.errorCount)}
        </span>
      ),
    },
    {
      key: 'detailAction',
      title: '详情',
      align: 'center',
      render: (row) => (
        <Button
          type="button"
          variant="adminIconAction"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedChannelName(row.channelName);
          }}
          aria-label={`查看频道 ${row.channelName} 详情`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      ),
    },
  ], [setSelectedChannelName]);

  const drawerOpen = Boolean(controller.selectedRow);
  const selected = controller.selectedRow;
  const hasAnyData = controller.rows.length > 0 || controller.errorLogs.length > 0 || controller.trendPoints.length > 0;
  const snapshotSourceText = controller.snapshot.items.length > 0 ? '实时内存窗口' : '最近聚合窗口';

  useEffect(() => {
    resetPage();
  }, [controller.searchKeyword, controller.statusFilter, resetPage]);

  return (
    <AdminWorkspacePageFrame
      header={(
        <AdminWorkspaceHero
          icon={<Radio className="h-5 w-5" />}
          title="频道性能监控"
          description="查看 Telegram 频道实时性能、聚合趋势、错误日志和健康状态，定位拖慢 TG 搜索链路的来源。"
          badge="频道观测台"
          meta={(
            <>
              <span>自动刷新 {controller.autoRefreshMs / 1000} 秒</span>
              <span>最后更新 {controller.lastUpdatedAt ? formatAdminHealthTime(controller.lastUpdatedAt.toISOString()) : '暂无数据'}</span>
            </>
          )}
          actions={(
            <Button
              type="button"
              variant="adminAction"
              onClick={() => void controller.refresh()}
              loading={controller.refreshing}
            >
              <RefreshCw className="mr-1 h-4 w-4" />
              刷新
            </Button>
          )}
        />
      )}
      metrics={(
        <AdminMetricGrid>
          <AdminMetricCard label="活跃频道" value={formatCount(controller.snapshot.active_channel_count)} hint={`当前窗口 ${formatCount(controller.rows.length)} 个频道`} />
          <AdminMetricCard label="平均响应" value={formatMS(controller.snapshot.avg_response_ms)} hint={snapshotSourceText} />
          <AdminMetricCard label="成功率" value={formatRate(controller.snapshot.success_rate)} hint={`超时率 ${formatRate(controller.snapshot.timeout_rate)}`} />
          <AdminMetricCard label="错误数" value={formatCount(controller.snapshot.error_count)} hint={`${snapshotSourceText}累计`} />
        </AdminMetricGrid>
      )}
      filters={(
        <AdminFilterSurface>
          <AdminFilterToolbar className="lg:grid-cols-[minmax(12rem,0.7fr),minmax(18rem,1.3fr)] xl:grid-cols-[minmax(12rem,0.7fr),minmax(22rem,1.3fr)]">
            <AdminFilterField label="状态">
              <AdminStatusFilter
                options={STATUS_OPTIONS}
                value={controller.statusFilter}
                onChange={(value) => controller.setStatusFilter(value as ChannelMetricStatusFilter)}
                ariaLabel="频道观测状态筛选"
                variant="toolbar"
              />
            </AdminFilterField>
            <AdminFilterField label="搜索">
              <AdminSearchInput
                value={controller.searchKeyword}
                onChange={controller.setSearchKeyword}
                placeholder="搜索频道名称、标签或错误信息"
                variant="toolbar"
              />
            </AdminFilterField>
          </AdminFilterToolbar>
          {controller.errorMessage ? (
            <div className="mt-3 flex items-start gap-2 rounded-[1.1rem] border border-rose-200/70 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{controller.errorMessage}</span>
            </div>
          ) : null}
        </AdminFilterSurface>
      )}
      content={(
        <div className="space-y-4">
          <AdminContentCard padding="md">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">响应时间趋势</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">按当前筛选频道聚合最近 24 个指标窗口。</p>
              </div>
              <Badge variant="outline" className="rounded-full border-slate-200 bg-white px-3 py-1 text-slate-600 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-300">
                5 分钟粒度
              </Badge>
            </div>
            <TrendChart points={controller.trendPoints} />
          </AdminContentCard>

          <AdminContentCard padding="sm">
            {!controller.loading && !hasAnyData ? (
              <AdminCardEmpty
                icon={<Activity className="h-12 w-12 text-slate-300 dark:text-slate-600" />}
                title="暂无频道性能数据"
                description="频道搜索产生指标后，性能对比和错误日志会出现在这里。"
              />
            ) : (
              <AdminDataTable
                data={pagination.pagedItems}
                columns={columns}
                rowKey={(row) => row.channelName}
                loading={controller.loading}
                emptyText="没有匹配的频道指标"
                countLabel="个频道"
                renderMobileItem={(row) => (
                  <ChannelMobileItem
                    row={row}
                    onOpenDetail={() => setSelectedChannelName(row.channelName)}
                  />
                )}
                desktopVariant="management-grid"
                desktopGridGapClassName="gap-4"
                desktopGridTemplateColumns="minmax(220px,1.45fr) 92px 104px 104px 72px 64px 64px"
                desktopGridMinWidth="920px"
              />
            )}
          </AdminContentCard>

          {controller.filteredRows.length > 0 ? (
            <ApplePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.setCurrentPage}
              onPageSizeChange={pagination.setPageSize}
              isLoading={controller.loading}
              pageSizeOptions={[...PERFORMANCE_TABLE_PAGE_SIZE_OPTIONS]}
            />
          ) : null}
        </div>
      )}
      drawer={(
        <AdminDetailDrawer
          open={drawerOpen}
          title={selected?.displayName || '频道详情'}
          description={selected ? `${selected.requestCount} 次请求 · ${formatRate(selected.successRate)} 成功率` : undefined}
          testId="channel-performance-drawer"
          onClose={() => controller.setSelectedChannelName(null)}
          emptyTitle="选择频道查看详情"
          emptyDescription="点击表格中的频道后，会展示错误日志、健康状态和最近性能摘要。"
        >
          {selected ? (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm">
                <div className="rounded-[1.1rem] border border-slate-200/70 bg-white/65 p-4 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]">
                  <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    <ShieldAlert className="h-4 w-4" />
                    健康状态
                  </div>
                  <div className="space-y-2 text-slate-600 dark:text-slate-300">
                    <p>当前状态：{statusBadge(selected).label}</p>
                    <p>最近检查：{formatAdminHealthTime(selected.lastCheckedAt)}</p>
                    <p>检查来源：{healthSourceText(selected.checkSource)}</p>
                    <p>最近错误：{selected.lastError || '暂无错误'}</p>
                  </div>
                </div>
                <div className="rounded-[1.1rem] border border-slate-200/70 bg-white/65 p-4 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48]">
                  <div className="mb-3 flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                    <Clock3 className="h-4 w-4" />
                    性能摘要
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span>平均响应：{formatMS(selected.avgResponseMS)}</span>
                    <span>P95：{formatMS(selected.p95ResponseMS)}</span>
                    <span>P99：{formatMS(selected.p99ResponseMS)}</span>
                    <span>最大并发：{formatCount(selected.maxConcurrentRequests)}</span>
                    <span>缓存命中：{formatCount(selected.cacheHitCount)}</span>
                    <span>结果数量：{formatCount(selected.resultCount)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">最近错误日志</h3>
                {controller.selectedErrorLogs.length === 0 ? (
                  <div className="rounded-[1.1rem] border border-slate-200/70 bg-white/65 p-4 text-sm text-slate-500 dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.48] dark:text-slate-400">
                    暂无错误日志
                  </div>
                ) : (
                  controller.selectedErrorLogs.map((log) => (
                    <div key={log.id} className="rounded-[1.1rem] border border-rose-200/60 bg-rose-50/70 p-4 text-sm dark:border-rose-400/20 dark:bg-rose-400/10">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="outline" className="rounded-full border-rose-200 bg-white px-2.5 py-1 text-rose-700 dark:border-rose-400/20 dark:bg-slate-950/40 dark:text-rose-200">
                          {log.error_type}
                        </Badge>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{formatAdminHealthTime(log.occurred_at)}</span>
                      </div>
                      <p className="mt-3 text-rose-700 dark:text-rose-200">{log.error_message || '频道搜索失败'}</p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">耗时 {formatMS(log.duration_ms)} · 关键词 {log.keyword_hash}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </AdminDetailDrawer>
      )}
    />
  );
};

export default ChannelPerformancePanel;
