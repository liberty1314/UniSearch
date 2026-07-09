import React, { useEffect, useMemo } from 'react';
import {
  ArrowUpRight,
  Loader2,
  Radio,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useChannelManageController } from '@/hooks/useChannelManageController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Label } from '@/components/ui/label';
import { AdminTagMultiSelect } from './AdminTagMultiSelect';
import { AdminDeleteAction } from './AdminDeleteAction';
import { AdminStatusToggleAction } from './AdminStatusToggleAction';
import { AdminTestAction } from './AdminTestAction';
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
import { formatAdminHealthTime } from './adminDateFormat';
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

  const {
    detailChannelId,
    pagedItems,
    setDetailChannelId,
  } = controller;
  const activeChannel = controller.activeDetailChannel;

  useEffect(() => {
    if (detailChannelId === null) {
      return;
    }

    const hasActiveOnCurrentPage = pagedItems.some(
      (channel) => channel.id === detailChannelId
    );
    if (!hasActiveOnCurrentPage) {
      setDetailChannelId(null);
    }
  }, [detailChannelId, pagedItems, setDetailChannelId]);

  const selectionBar = controller.selectedCount > 0 ? (
    <AdminSelectionBar
      testId="channel-selection-bar"
      summary={`已选 ${controller.selectedCount} 项`}
      onClear={controller.clearSelectedChannels}
      actions={(
        <>
          <Button type="button" size="sm" variant="adminAction" onClick={() => controller.handleToggleSelectFiltered()}>
            {controller.isAllFilteredSelected ? '清空筛选选择' : '全选当前筛选'}
          </Button>
          <Button type="button" size="sm" variant="adminAction" onClick={() => void controller.handleBatchToggleChannels(true)} loading={controller.isBatchUpdating}>
            批量启用
          </Button>
          <Button type="button" size="sm" variant="adminAction" onClick={() => void controller.handleBatchToggleChannels(false)} loading={controller.isBatchUpdating}>
            批量停用
          </Button>
          <Button type="button" size="sm" variant="adminAction" onClick={() => void controller.handleBatchTest()} loading={controller.isBatchTesting}>
            批量测试
          </Button>
          <Button type="button" size="sm" variant="adminDangerAction" onClick={() => controller.setBatchDeleteConfirmOpen(true)} disabled={controller.isOperationBusy}>
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
                <Button type="button" variant="adminAction" onClick={() => void controller.fetchChannels()} disabled={controller.loading} loading={controller.loading}>
                  <Zap className="mr-1 h-4 w-4" />
                  刷新状态
                </Button>
                <Button
                  type="button"
                  variant="adminAction"
                  onClick={() => void controller.handleQuickTest()}
                  disabled={controller.channels.filter((channel) => channel.is_enabled).length === 0}
                  loading={controller.isBatchTesting}
                >
                  <Zap className="mr-1 h-4 w-4" />
                  快速测试
                </Button>
                <Button type="button" variant="adminPrimaryAction" onClick={() => controller.setAddDialogOpen(true)}>
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
            <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr),minmax(0,0.92fr),minmax(0,1.35fr)]">
              <AdminStatusFilter
                options={CHANNEL_STATUS_OPTIONS}
                value={controller.statusFilter}
                onChange={(v) => controller.setStatusFilter(v as typeof controller.statusFilter)}
                ariaLabel="频道状态筛选"
              />
              <AdminTagMultiSelect
                scope="channel"
                value={controller.selectedTagFilters}
                options={controller.tagOptions}
                loading={controller.isTagOptionsLoading}
                creating={controller.isCreatingTag}
                updatingTagId={controller.updatingTagId}
                deletingTagId={controller.deletingTagId}
                onChange={controller.setSelectedTagFilters}
                onCreateTag={controller.handleCreateTag}
                onUpdateTag={controller.handleUpdateTag}
                onDeleteTag={controller.handleDeleteTag}
                allowCreate
                allowManageOptions
                showSelectedSummary={false}
                autoSelectCreatedTag={false}
                maxSelectedVisible={2}
                searchPlaceholder="搜索频道标签筛选"
                emptyMessage="暂无频道标签词库"
                placeholder="按标签筛选"
                triggerAriaLabel="频道标签筛选"
                triggerTestId="channel-tag-filter-trigger"
                panelTestId="channel-tag-filter-panel"
              />
              <AdminSearchInput
                value={controller.searchKeyword}
                onChange={controller.setSearchKeyword}
                placeholder="搜索频道名称或错误信息"
              />
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
                  <div
                    data-testid="channel-list-header"
                    className="hidden gap-4 px-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 xl:grid xl:grid-cols-[minmax(0,1.15fr),minmax(12rem,0.65fr),auto] xl:items-center"
                  >
                    <span className="pl-9">频道</span>
                    <span>最近检查</span>
                    <span className="text-right">操作</span>
                  </div>
                  {controller.pagedItems.map((channel) => {
                    return (
                      <article
                        key={channel.id}
                        data-testid={`channel-row-${channel.id}`}
                        className="rounded-[1.3rem] border border-slate-200/70 bg-white/75 p-4 transition hover:border-slate-300 hover:shadow-md dark:border-cyan-300/[0.14] dark:bg-slate-950/[0.52] dark:hover:border-cyan-300/[0.24]"
                      >
                        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr),minmax(12rem,0.65fr),auto] xl:items-center">
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
                              </div>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {channel.last_error || '暂无错误信息'}
                              </p>
                              {channel.tags?.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {channel.tags.slice(0, 1).map((tag) => (
                                    <Badge key={`${channel.id}-${tag}`} variant="secondary">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="rounded-[1.1rem] border border-slate-200/70 bg-slate-50/80 p-3 text-sm dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.44]">
                            <div className="min-w-0">
                              <span className="block text-xs text-slate-500 dark:text-slate-400">最近检查</span>
                              <span className="mt-1 block whitespace-nowrap font-medium tabular-nums text-slate-700 dark:text-slate-200">{formatAdminHealthTime(channel.last_checked_at)}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
                            <Button
                              type="button"
                              variant="adminIconAction"
                              size="icon"
                              onClick={() => controller.setDetailChannelId(channel.id)}
                              aria-label={`查看频道 ${channel.name} 详情`}
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                            <AdminTestAction
                              compact
                              status={controller.testingStatus[channel.name] || 'idle'}
                              onClick={(event) => {
                                event.stopPropagation();
                                void controller.handleTestChannel(channel.name);
                              }}
                              disabled={controller.isOperationBusy}
                            />
                            <AdminStatusToggleAction
                              compact
                              enabled={channel.is_enabled}
                              entityLabel={`频道 ${channel.name}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                void controller.handleToggleEnabled(channel);
                              }}
                              disabled={controller.isOperationBusy}
                            />
                            <AdminDeleteAction
                              compact
                              onClick={(event) => {
                                event.stopPropagation();
                                controller.setDeleteConfirm({ open: true, channel });
                              }}
                              disabled={controller.isOperationBusy}
                              aria-label={`删除频道 ${channel.name}`}
                            />
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
            emptyDescription="点击频道行内的详情按钮查看详细状态、最近错误和可执行操作。"
            footer={activeChannel ? (
              <div className="flex flex-wrap justify-end gap-2">
                <AdminTestAction
                  status={controller.testingStatus[activeChannel.name] || 'idle'}
                  onClick={() => void controller.handleTestChannel(activeChannel.name)}
                  disabled={controller.isOperationBusy}
                />
                <AdminStatusToggleAction
                  enabled={activeChannel.is_enabled}
                  entityLabel={`频道 ${activeChannel.name}`}
                  onClick={() => void controller.handleToggleEnabled(activeChannel)}
                  disabled={controller.isOperationBusy}
                />
              </div>
            ) : undefined}
          >
            {activeChannel ? (
              <div className="space-y-4 text-sm">
                <div className="rounded-[1.15rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.40]">
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{activeChannel.last_error || '当前没有记录到错误信息。'}</p>
                </div>
                <div className="space-y-3 rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.34]">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">频道标签</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeChannel.tags?.length ? activeChannel.tags.slice(0, 1).map((tag) => (
                        <Badge key={`${activeChannel.id}-${tag}`} variant="secondary">{tag}</Badge>
                      )) : (
                        <span className="text-sm text-slate-500 dark:text-slate-400">当前未设置标签</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel-tags">编辑标签</Label>
                    <div id="channel-tags">
                      <AdminTagMultiSelect
                        scope="channel"
                        value={controller.channelTagsInput}
                        options={controller.tagOptions}
                        loading={controller.isTagOptionsLoading}
                        creating={controller.isCreatingTag}
                        updatingTagId={controller.updatingTagId}
                        deletingTagId={controller.deletingTagId}
                        onChange={controller.setChannelTagsInput}
                        onCreateTag={controller.handleCreateTag}
                        onUpdateTag={controller.handleUpdateTag}
                        onDeleteTag={controller.handleDeleteTag}
                        allowManageOptions
                        searchPlaceholder="搜索或新增频道标签"
                        placeholder="选择一个频道标签，或搜索后新增"
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      频道标签词库独立维护，不与插件标签互通。
                    </p>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="adminAction"
                        onClick={() => void controller.handleSaveChannelTags()}
                        disabled={controller.isSavingTags}
                        loading={controller.isSavingTags}
                      >
                        保存标签
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.34]">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">启用状态</p>
                    <p className="mt-2 font-medium text-slate-900 dark:text-white">{activeChannel.is_enabled ? '已启用' : '已禁用'}</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.34]">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">健康状态</p>
                    <p className="mt-2 font-medium text-slate-900 dark:text-white">{describeChannelHealth(activeChannel)}</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.34]">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">最近检查</p>
                    <p className="mt-2 font-medium tabular-nums text-slate-900 dark:text-white">{formatAdminHealthTime(activeChannel.last_checked_at)}</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.34]">
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
        newChannelTags={controller.newChannelTags}
        tagOptions={controller.tagOptions}
        isTagOptionsLoading={controller.isTagOptionsLoading}
        isCreatingTag={controller.isCreatingTag}
        updatingTagId={controller.updatingTagId}
        deletingTagId={controller.deletingTagId}
        onOpenChange={controller.setAddDialogOpen}
        onChannelNameChange={controller.setNewChannelName}
        onChannelTagsChange={controller.setNewChannelTags}
        onCreateTag={controller.handleCreateTag}
        onUpdateTag={controller.handleUpdateTag}
        onDeleteTag={controller.handleDeleteTag}
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
