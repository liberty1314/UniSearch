import React, { useMemo } from 'react';
import {
  AlertCircle,
  Loader2,
  Radio,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useChannelManageController } from '@/hooks/useChannelManageController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ChannelAddDialog } from './ChannelAddDialog';
import { ApplePagination } from './ApplePagination';
import {
  AdminContentCard,
  AdminCardEmpty,
  AdminDetailDrawer,
  AdminFilterSurface,
  AdminMetricCard,
  AdminMetricGrid,
  AdminSearchInput,
  AdminSelectionBar,
  AdminStatusFilter,
  AdminWorkspaceHero,
  AdminWorkspacePageFrame,
} from './AdminWorkspacePageFrame';
import { describeChannelHealth, normalizeChannelHealth } from './channelManageDialogShared';

const CHANNEL_STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '禁用' },
  { value: 'error', label: '异常' },
] as const;

export const ChannelManagementView: React.FC = () => {
  const { token } = useAuthStore();
  const controller = useChannelManageController({
    isOpen: true,
    onClose: () => undefined,
    onSuccess: () => undefined,
    token: token || '',
    mode: 'edit',
  });

  const metrics = useMemo(() => {
    const enabledCount = controller.channels.filter((channel) => channel.is_enabled).length;
    const errorCount = controller.channels.filter((channel) => normalizeChannelHealth(channel) === 'error').length;
    const pendingCount = controller.channels.filter((channel) => !channel.is_enabled || normalizeChannelHealth(channel) === 'untested').length;

    return {
      enabledCount,
      errorCount,
      pendingCount,
    };
  }, [controller.channels]);

  const activeChannel = controller.activeDetailChannel;

  const selectionBar = controller.selectedCount > 0 ? (
    <AdminSelectionBar
      testId="channel-selection-bar"
      summary={`已选 ${controller.selectedCount} 项`}
      onClear={controller.clearSelectedChannels}
      actions={(
        <>
          <Button type="button" size="sm" variant="outline" onClick={() => void controller.handleBatchToggleChannels(true)} className="rounded-full">
            批量启用
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void controller.handleBatchToggleChannels(false)} className="rounded-full">
            批量停用
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void controller.handleBatchTest()} className="rounded-full">
            批量测试
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => controller.setBatchDeleteConfirmOpen(true)} className="rounded-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30">
            批量删除
          </Button>
        </>
      )}
    />
  ) : undefined;

  return (
    <>
      <AdminWorkspacePageFrame
        header={(
          <AdminWorkspaceHero
            icon={<Radio className="h-5 w-5" />}
            title="Telegram 频道"
            description="统一查看频道启停、健康状态与最近错误，支持搜索、批量操作和右侧详情抽屉。"
            badge="频道运营台"
            meta={<span>当前共 {controller.channels.length} 个频道</span>}
            actions={(
              <>
                <Button type="button" variant="outline" onClick={() => void controller.fetchChannels()} className="rounded-full" disabled={controller.loading}>
                  {controller.loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Zap className="mr-1 h-4 w-4" />}
                  刷新状态
                </Button>
                <Button type="button" onClick={() => controller.setAddDialogOpen(true)} className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600">
                  添加频道
                </Button>
              </>
            )}
          />
        )}
        metrics={(
          <AdminMetricGrid>
            <AdminMetricCard label="频道总数" value={controller.channels.length} hint="已接入后台监控的频道" />
            <AdminMetricCard label="启用中" value={metrics.enabledCount} hint="当前参与搜索的频道" />
            <AdminMetricCard label="异常" value={metrics.errorCount} hint="最近测试或监控发现异常" />
            <AdminMetricCard label="未测试/停用" value={metrics.pendingCount} hint="建议后续处理的频道" />
          </AdminMetricGrid>
        )}
        filters={(
          <AdminFilterSurface>
            <div className="flex flex-col gap-4">
              <AdminStatusFilter
                options={CHANNEL_STATUS_OPTIONS}
                value={controller.statusFilter}
                onChange={(v) => controller.setStatusFilter(v as typeof controller.statusFilter)}
              />
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),auto]">
                <AdminSearchInput
                  value={controller.searchKeyword}
                  onChange={controller.setSearchKeyword}
                  placeholder="搜索频道名称或错误信息"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={controller.handleToggleSelectFiltered}
                  disabled={controller.filteredItems.length === 0 || controller.isOperationBusy}
                  className="rounded-full"
                >
                  {controller.isAllFilteredSelected ? '清空筛选选择' : '全选当前筛选'}
                </Button>
              </div>
            </div>
          </AdminFilterSurface>
        )}
        selectionBar={selectionBar}
        content={(
          <div className="space-y-4">
            <AdminContentCard padding="sm">
              {controller.loading ? (
                <div className="flex min-h-[280px] items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-cyan-500" />
                </div>
              ) : controller.pagedItems.length === 0 ? (
                <AdminCardEmpty
                  icon={<Radio className="h-12 w-12 text-slate-300 dark:text-slate-600" />}
                  title="没有匹配的频道"
                  description="调整筛选条件，或先添加新的 Telegram 频道。"
                />
              ) : (
                <div className="space-y-3">
                  {controller.pagedItems.map((channel) => {
                    const health = normalizeChannelHealth(channel);
                    return (
                      <article
                        key={channel.id}
                        data-testid={`channel-row-${channel.id}`}
                        onClick={() => controller.setDetailChannelId(channel.id)}
                        className="cursor-pointer rounded-[1.3rem] border border-slate-200/70 bg-white/75 p-4 transition hover:border-slate-300 hover:shadow-md dark:border-white/10 dark:bg-slate-950/35 dark:hover:border-white/20"
                      >
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr),auto] xl:items-center">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={controller.selectedChannelIds.has(channel.id)}
                              onCheckedChange={(checked) => controller.selectKey(channel.id, Boolean(checked))}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`选择频道 ${channel.name}`}
                              className="mt-1"
                            />
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{channel.name}</h2>
                                <Badge variant={channel.is_enabled ? 'success' : 'outline'}>
                                  {channel.is_enabled ? '启用' : '禁用'}
                                </Badge>
                                {health === 'healthy' ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    <ShieldCheck className="mr-1 h-3 w-3" />
                                    正常
                                  </Badge>
                                ) : null}
                                {health === 'error' ? (
                                  <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                                    <AlertCircle className="mr-1 h-3 w-3" />
                                    异常
                                  </Badge>
                                ) : null}
                                {health === 'untested' ? <Badge variant="secondary">未测试</Badge> : null}
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {channel.last_error || '暂无错误信息'}
                              </p>
                            </div>
                          </div>
                          <div className="rounded-[1.1rem] border border-slate-200/70 bg-slate-50/80 p-3 text-sm dark:border-white/10 dark:bg-slate-900/40">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500 dark:text-slate-400">健康状态</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200">{describeChannelHealth(channel)}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <span className="text-slate-500 dark:text-slate-400">最近检查</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200">{channel.last_checked_at || '暂无'}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                controller.setDetailChannelId(channel.id);
                              }}
                              className="rounded-full"
                            >
                              详情
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                void controller.handleTestChannel(channel.name);
                              }}
                              disabled={controller.testingStatus[channel.name] === 'testing' || controller.isOperationBusy}
                              className="rounded-full"
                            >
                              {controller.testingStatus[channel.name] === 'testing' ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                              ) : (
                                <Zap className="mr-1 h-4 w-4" />
                              )}
                              测试
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                void controller.handleToggleEnabled(channel);
                              }}
                              disabled={controller.isOperationBusy}
                              className="rounded-full"
                            >
                              {channel.is_enabled ? <ToggleRight className="mr-1 h-4 w-4" /> : <ToggleLeft className="mr-1 h-4 w-4" />}
                              {channel.is_enabled ? '停用' : '启用'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                controller.setDeleteConfirm({ open: true, channel });
                              }}
                              disabled={controller.isOperationBusy}
                              className="rounded-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </AdminContentCard>

            {controller.filteredItems.length > 0 ? (
              <ApplePagination
                currentPage={controller.currentPage}
                totalPages={controller.totalPages}
                totalItems={controller.filteredItems.length}
                pageSize={controller.pageSize}
                onPageChange={controller.setCurrentPage}
                onPageSizeChange={(value) => controller.setPageSize(value)}
                isLoading={controller.loading}
              />
            ) : null}
          </div>
        )}
        drawer={(
          <AdminDetailDrawer
            open={Boolean(activeChannel)}
            title={activeChannel?.name || '频道详情'}
            description="运行状态、最近检查和操作入口"
            testId="channel-management-drawer"
            onClose={() => controller.setDetailChannelId(null)}
            emptyTitle="选择一个频道"
            emptyDescription="点击左侧频道行查看详细状态、最近错误和可执行操作。"
            footer={activeChannel ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => void controller.handleTestChannel(activeChannel.name)} className="rounded-full">
                  测试频道
                </Button>
                <Button type="button" variant="outline" onClick={() => void controller.handleToggleEnabled(activeChannel)} className="rounded-full">
                  {activeChannel.is_enabled ? '停用频道' : '启用频道'}
                </Button>
              </div>
            ) : undefined}
          >
            {activeChannel ? (
              <div className="space-y-4 text-sm">
                <div className="rounded-[1.15rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-900/30">
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{activeChannel.last_error || '当前没有记录到错误信息。'}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">启用状态</p>
                    <p className="mt-2 font-medium text-slate-900 dark:text-white">{activeChannel.is_enabled ? '已启用' : '已禁用'}</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">健康状态</p>
                    <p className="mt-2 font-medium text-slate-900 dark:text-white">{describeChannelHealth(activeChannel)}</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">最近检查</p>
                    <p className="mt-2 font-medium text-slate-900 dark:text-white">{activeChannel.last_checked_at || '暂无'}</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-white/10">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">检查来源</p>
                    <p className="mt-2 font-medium text-slate-900 dark:text-white">{activeChannel.check_source || '暂无'}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </AdminDetailDrawer>
        )}
      />

      <ChannelAddDialog
        open={controller.addDialogOpen}
        isAdding={controller.isAdding}
        newChannelName={controller.newChannelName}
        onOpenChange={controller.setAddDialogOpen}
        onChannelNameChange={controller.setNewChannelName}
        onSubmit={() => void controller.handleAddChannel()}
      />

      <ConfirmDialog
        open={controller.deleteConfirm.open}
        onOpenChange={(open) => !open && controller.setDeleteConfirm({ open: false, channel: null })}
        title="删除频道"
        description={`确定要删除频道 "${controller.deleteConfirm.channel?.name || ''}" 吗？删除后该频道将不再参与搜索。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => void controller.handleDeleteChannel()}
        isLoading={Boolean(
          controller.deleteConfirm.channel &&
            controller.deletingIds.has(controller.deleteConfirm.channel.id)
        )}
      />

      <ConfirmDialog
        open={controller.batchDeleteConfirmOpen}
        onOpenChange={controller.setBatchDeleteConfirmOpen}
        title="确认批量删除频道"
        description={`将删除 ${controller.selectedCount} 个已选频道${controller.selectedChannelPreviewText ? `（例如：${controller.selectedChannelPreviewText}）` : ''}。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => void controller.handleBatchDeleteChannels()}
        isLoading={controller.isBatchDeleting}
      />
    </>
  );
};
