import React, { useEffect, useMemo } from 'react';
import {
  Activity,
  ArrowUpRight,
  CloudDownload,
  Layers,
  Loader2,
  PencilLine,
  ToggleLeft,
  ToggleRight,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePluginManageController } from '@/hooks/usePluginManageController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApplePagination } from './ApplePagination';
import { AdminTagMultiSelect } from './AdminTagMultiSelect';
import { PluginAddDialog } from './PluginAddDialog';
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
import { AdminSelectField } from './AdminSelectField';
import {
  pluginStatusBadgeClass,
  pluginStatusText,
  resolvePluginStatus,
} from './pluginManageDialogShared';
import type { PluginInfo } from '@/types/api';
const EMPTY_PAGE_PLUGINS: PluginInfo[] = [];

const PLUGIN_STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '禁用' },
  { value: 'error', label: '异常' },
] as const;

export const PluginManagementView: React.FC = () => {
  const { token } = useAuthStore();
  const controller = usePluginManageController({
    isOpen: true,
    onClose: () => undefined,
    onSuccess: () => undefined,
    token: token || '',
    plugins: EMPTY_PAGE_PLUGINS,
    mode: 'edit',
  });

  const metrics = useMemo(() => {
    const installedCount = controller.localPlugins.filter((plugin) => plugin.installed || plugin.is_local).length;
    const enabledCount = controller.localPlugins.filter((plugin) => plugin.is_enabled && (plugin.installed || plugin.is_local)).length;
    const issueCount = controller.localPlugins.filter((plugin) => plugin.status === 'error' || (plugin.is_remote && !plugin.installed)).length;

    return {
      installedCount,
      enabledCount,
      issueCount,
    };
  }, [controller.localPlugins]);

  const activePlugin = controller.activeEditingPlugin || controller.activeDetailPlugin;
  const drawerOpen = Boolean(activePlugin);
  const isEditing = Boolean(controller.activeEditingPlugin);

  useEffect(() => {
    if (controller.activeEditingPlugin) {
      return;
    }
    if (controller.pagedItems.length === 0) {
      if (controller.detailPluginName !== null) {
        controller.setDetailPluginName(null);
      }
      return;
    }

    const hasActiveOnCurrentPage = controller.pagedItems.some(
      (plugin) => plugin.name === controller.detailPluginName
    );
    if (!hasActiveOnCurrentPage) {
      controller.setDetailPluginName(controller.pagedItems[0].name);
    }
  }, [
    controller.activeEditingPlugin,
    controller.detailPluginName,
    controller.pagedItems,
    controller.setDetailPluginName,
  ]);

  const closeDrawer = () => {
    controller.setDetailPluginName(null);
    controller.setEditingPluginName(null);
  };

  const renderPluginCardActions = (plugin: PluginInfo) => {
    const testing = controller.testingStatus[plugin.name] === 'testing';
    const status = resolvePluginStatus(plugin);
    const isRemotePending = plugin.is_remote && !plugin.installed;

    if (isRemotePending) {
      return (
        <Button
          type="button"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            void controller.handleInstallPlugin(plugin);
          }}
          className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600"
        >
          <CloudDownload className="mr-1 h-4 w-4" />
          导入
        </Button>
      );
    }

    return (
      <>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            void controller.handleTestPlugin(plugin);
          }}
          disabled={testing || controller.isOperationBusy}
          className="rounded-full"
        >
          {testing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Zap className="mr-1 h-4 w-4" />}
          测试
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            void controller.handleTogglePluginEnabled(plugin);
          }}
          disabled={controller.isOperationBusy}
          className="rounded-full"
        >
          {plugin.is_enabled ? <ToggleRight className="mr-1 h-4 w-4" /> : <ToggleLeft className="mr-1 h-4 w-4" />}
          {status === 'inactive' ? '启用' : '停用'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            controller.openEditDialog(plugin);
          }}
          className="rounded-full"
        >
          <PencilLine className="mr-1 h-4 w-4" />
          配置
        </Button>
      </>
    );
  };

  return (
    <>
      <AdminWorkspacePageFrame
        header={(
          <AdminWorkspaceHero
            icon={<Layers className="h-5 w-5" />}
            title="插件中心"
            description="统一管理本地插件与远程市场目录，支持筛选、导入、启停、测试与配置。"
            badge="市场化运营台"
            meta={<span>目录版本 {controller.catalogVersion}</span>}
            actions={(
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void controller.handleBatchTest()}
                  disabled={controller.localPlugins.length === 0 || controller.isOperationBusy}
                  className="rounded-full"
                >
                  <Activity className="mr-1 h-4 w-4" />
                  快速巡检
                </Button>
                <Button
                  type="button"
                  onClick={controller.openAddDialog}
                  disabled={controller.isOperationBusy}
                  className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600"
                >
                  <CloudDownload className="mr-1 h-4 w-4" />
                  导入 URL 插件
                </Button>
              </>
            )}
          />
        )}
        metrics={(
          <AdminMetricGrid>
            <AdminMetricCard label="目录版本" value={controller.catalogVersion} hint={`共 ${controller.localPlugins.length} 个条目`} />
            <AdminMetricCard label="已安装" value={metrics.installedCount} hint="本地可直接配置与测试" />
            <AdminMetricCard label="本地启用" value={metrics.enabledCount} hint="包含内置与自定义插件" />
            <AdminMetricCard label="异常/待处理" value={metrics.issueCount} hint="异常或尚未导入的远程条目" />
          </AdminMetricGrid>
        )}
        filters={(
          <AdminFilterSurface>
            <div className="grid gap-3 xl:grid-cols-[minmax(0,0.92fr),minmax(0,0.92fr),minmax(0,0.92fr),minmax(0,0.92fr),minmax(0,0.92fr),minmax(0,1.35fr)]">
              <AdminStatusFilter
                options={PLUGIN_STATUS_OPTIONS}
                value={controller.statusFilter}
                onChange={(v) => controller.setStatusFilter(v as typeof controller.statusFilter)}
                ariaLabel="插件状态筛选"
              />
              <AdminSelectField
                value={controller.sourceFilter}
                onChange={(value) => controller.setSourceFilter(value as 'all' | 'local' | 'remote')}
                ariaLabel="插件来源筛选"
                options={[
                  { value: 'all', label: '全部来源' },
                  { value: 'local', label: '本地已安装' },
                  { value: 'remote', label: '远程市场' },
                ]}
              />
              <AdminSelectField
                value={controller.categoryFilter}
                onChange={controller.setCategoryFilter}
                ariaLabel="插件分类筛选"
                options={controller.availableCategories.map((item) => ({
                  value: item,
                  label: item === 'all' ? '全部分类' : item,
                }))}
              />
              <AdminSelectField
                value={controller.capabilityFilter}
                onChange={controller.setCapabilityFilter}
                ariaLabel="插件能力筛选"
                options={controller.availableCapabilities.map((item) => ({
                  value: item,
                  label: item === 'all' ? '全部能力' : item,
                }))}
              />
              <AdminTagMultiSelect
                scope="plugin"
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
                searchPlaceholder="搜索插件标签筛选"
                emptyMessage="暂无插件标签词库"
                placeholder="全部标签"
                triggerAriaLabel="插件标签筛选"
                triggerTestId="plugin-tag-filter-trigger"
                panelTestId="plugin-tag-filter-panel"
              />
              <AdminSearchInput
                value={controller.searchKeyword}
                onChange={controller.setSearchKeyword}
                placeholder="搜索名称、描述、能力或标签"
              />
            </div>
          </AdminFilterSurface>
        )}
        selectionBar={controller.selectedCount > 0 ? (
          <AdminSelectionBar
            testId="plugin-selection-bar"
            summary={`已选 ${controller.selectedCount} 项`}
            onClear={controller.clearSelectedPlugins}
            actions={(
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => controller.handleToggleSelectFiltered()}
                  disabled={controller.filteredItems.length === 0 || controller.isOperationBusy}
                  className="rounded-full"
                >
                  {controller.isAllFilteredSelected ? '清空筛选选择' : '全选当前筛选'}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void controller.handleBatchTogglePlugins(true)} className="rounded-full">
                  批量启用
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => void controller.handleBatchTogglePlugins(false)} className="rounded-full">
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
        ) : undefined}
        content={(
          <div className="space-y-4">
            <AdminContentCard padding="sm">
              {controller.isCatalogLoading ? (
                <div className="flex min-h-[280px] items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-cyan-500" />
                </div>
              ) : controller.pagedItems.length === 0 ? (
                <AdminCardEmpty
                  icon={<Layers className="h-12 w-12 text-slate-300 dark:text-slate-600" />}
                  title="没有匹配的插件"
                  description="调整筛选条件，或导入新的 URL 插件。"
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {controller.pagedItems.map((plugin) => {
                    const status = resolvePluginStatus(plugin);
                    return (
                      <article
                        key={plugin.name}
                        data-testid={`plugin-market-card-${plugin.name}`}
                        onClick={() => controller.handleOpenDetail(plugin)}
                        className="group cursor-pointer rounded-[1.4rem] border border-slate-200/70 bg-white/75 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-white/10 dark:bg-slate-950/35 dark:hover:border-white/20"
                      >
                        <div className="flex h-full flex-col gap-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={controller.selectedPluginNames.has(plugin.name)}
                                onCheckedChange={(checked) => controller.selectKey(plugin.name, Boolean(checked))}
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`选择插件 ${plugin.name}`}
                                className="mt-1"
                              />
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{plugin.name}</h2>
                                  <Badge className={pluginStatusBadgeClass(status)}>{pluginStatusText(status)}</Badge>
                                  <Badge variant="outline">{plugin.is_remote && !plugin.installed ? '远程市场' : '本地已安装'}</Badge>
                                </div>
                                <p className="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                  {plugin.description || '暂无描述'}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(event) => {
                                event.stopPropagation();
                                controller.handleOpenDetail(plugin);
                              }}
                              aria-label={`查看插件 ${plugin.name} 详情`}
                              className="rounded-full"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            {plugin.category ? <Badge variant="secondary">{plugin.category}</Badge> : null}
                            {(plugin.capabilities || []).slice(0, 3).map((capability) => (
                              <Badge key={capability} variant="outline">{capability}</Badge>
                            ))}
                            {(plugin.tags || []).slice(0, 1).map((tag) => (
                              <Badge key={tag} variant="outline">{tag}</Badge>
                            ))}
                          </div>

                          <div className="grid gap-3 rounded-[1.1rem] border border-slate-200/70 bg-slate-50/80 p-3 text-sm dark:border-white/10 dark:bg-slate-900/40">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500 dark:text-slate-400">来源</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200">
                                {plugin.resource?.source_label || plugin.source_type || '本地'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-slate-500 dark:text-slate-400">健康</span>
                              <span className="font-medium text-slate-700 dark:text-slate-200">
                                {plugin.health ? (plugin.health.is_healthy ? '正常' : '异常') : '未测试'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-auto flex flex-wrap gap-2">
                            {renderPluginCardActions(plugin)}
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
                isLoading={controller.isCatalogLoading}
              />
            ) : null}
          </div>
        )}
        drawer={(
          <AdminDetailDrawer
            open={drawerOpen}
            title={activePlugin?.name || '插件详情'}
            description={isEditing ? '配置与版本信息' : '来源、健康和可执行动作'}
            testId="plugin-management-drawer"
            onClose={closeDrawer}
            emptyTitle="选择一个插件"
            emptyDescription="点击左侧卡片查看详情，或进入配置表单编辑插件元数据与能力声明。"
            footer={activePlugin ? (
              <div className="flex flex-wrap justify-end gap-2">
                {isEditing ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => controller.setEditingPluginName(null)} className="rounded-full">
                      取消
                    </Button>
                    <Button type="button" onClick={() => void controller.handleSaveEdit()} className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600">
                      保存配置
                    </Button>
                  </>
                ) : activePlugin.is_remote && !activePlugin.installed ? (
                  <Button type="button" onClick={() => void controller.handleInstallPlugin(activePlugin)} className="rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600">
                    导入插件
                  </Button>
                ) : (
                  <>
                    <Button type="button" variant="outline" onClick={() => controller.openEditDialog(activePlugin)} className="rounded-full">
                      配置
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void controller.handleTestPlugin(activePlugin)} className="rounded-full">
                      测试
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void controller.handleTogglePluginEnabled(activePlugin)} className="rounded-full">
                      {activePlugin.is_enabled ? '停用' : '启用'}
                    </Button>
                  </>
                )}
              </div>
            ) : undefined}
          >
            {activePlugin ? (
              isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plugin-name">插件名称</Label>
                      <Input id="plugin-name" value={activePlugin.name} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plugin-priority">优先级</Label>
                      <Input
                        id="plugin-priority"
                        type="number"
                        value={controller.editForm.priority}
                        onChange={(event) => controller.setEditForm((prev) => ({ ...prev, priority: Number.parseInt(event.target.value, 10) || 0 }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plugin-url">URL</Label>
                    <Input
                      id="plugin-url"
                      value={controller.editForm.url}
                      disabled={activePlugin.plugin_type !== 'custom'}
                      onChange={(event) => controller.setEditForm((prev) => ({ ...prev, url: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plugin-description">描述</Label>
                    <Input
                      id="plugin-description"
                      value={controller.editForm.description}
                      onChange={(event) => controller.setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plugin-version">版本</Label>
                      <Input
                        id="plugin-version"
                        value={controller.editForm.version}
                        onChange={(event) => controller.setEditForm((prev) => ({ ...prev, version: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="plugin-category">分类</Label>
                      <Input
                        id="plugin-category"
                        value={controller.editForm.category}
                        onChange={(event) => controller.setEditForm((prev) => ({ ...prev, category: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plugin-capabilities">能力</Label>
                    <Input
                      id="plugin-capabilities"
                      value={controller.editForm.capabilitiesText}
                      onChange={(event) => controller.setEditForm((prev) => ({ ...prev, capabilitiesText: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plugin-tags">标签</Label>
                    <div id="plugin-tags">
                      <AdminTagMultiSelect
                        scope="plugin"
                        value={controller.editForm.tags}
                        options={controller.tagOptions}
                        loading={controller.isTagOptionsLoading}
                        creating={controller.isCreatingTag}
                        updatingTagId={controller.updatingTagId}
                        deletingTagId={controller.deletingTagId}
                        onChange={(nextTags) => controller.setEditForm((prev) => ({ ...prev, tags: nextTags }))}
                        onCreateTag={controller.handleCreateTag}
                        onUpdateTag={controller.handleUpdateTag}
                        onDeleteTag={controller.handleDeleteTag}
                        allowManageOptions
                        searchPlaceholder="搜索或新增插件标签"
                        placeholder="选择一个插件标签，或搜索后新增"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm">
                  <div className="rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-900/30">
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{activePlugin.description || '暂无描述'}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-white/10">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">来源</p>
                      <p className="mt-2 font-medium text-slate-900 dark:text-white">{activePlugin.resource?.source_label || activePlugin.source_type || '本地'}</p>
                      <p className="mt-1 text-slate-500 dark:text-slate-400">{activePlugin.author || '未填写作者'}</p>
                    </div>
                    <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-white/10">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">健康状态</p>
                      <p className="mt-2 font-medium text-slate-900 dark:text-white">
                        {activePlugin.health ? (activePlugin.health.is_healthy ? '正常' : '异常') : '未测试'}
                      </p>
                      <p className="mt-1 text-slate-500 dark:text-slate-400">{activePlugin.health?.last_error || '暂无错误信息'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">能力与标签</p>
                    <div className="flex flex-wrap gap-2">
                      {(activePlugin.capabilities || []).map((capability) => (
                        <Badge key={capability} variant="outline">{capability}</Badge>
                      ))}
                      {(activePlugin.tags || []).slice(0, 1).map((tag) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">安装信息</p>
                    <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-white/10">
                      <p className="font-medium text-slate-900 dark:text-white">{activePlugin.install?.type || activePlugin.plugin_type}</p>
                      {activePlugin.install?.url ? (
                        <p className="mt-2 break-all text-slate-500 dark:text-slate-400">{activePlugin.install.url}</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            ) : null}
          </AdminDetailDrawer>
        )}
      />

      <PluginAddDialog
        open={controller.addDialogOpen}
        isAdding={controller.isAdding}
        isTestingUrl={controller.isTestingUrl}
        addForm={controller.addForm}
        tagOptions={controller.tagOptions}
        isTagOptionsLoading={controller.isTagOptionsLoading}
        isCreatingTag={controller.isCreatingTag}
        updatingTagId={controller.updatingTagId}
        deletingTagId={controller.deletingTagId}
        urlTestResult={controller.urlTestResult}
        urlTestMessage={controller.urlTestMessage}
        onOpenChange={controller.setAddDialogOpen}
        onAddFormChange={(updater) => {
          controller.setAddForm((prev) => {
            const next = updater(prev);
            if (next.url !== prev.url) {
              controller.setUrlTestResult('idle');
              controller.setUrlTestMessage('');
            }
            return next;
          });
        }}
        onCreateTag={controller.handleCreateTag}
        onUpdateTag={controller.handleUpdateTag}
        onDeleteTag={controller.handleDeleteTag}
        onAddFormKeyDown={controller.handleAddFormKeyDown}
        onReset={controller.resetAddDialogState}
        onTestURL={() => void controller.handleTestAddPluginURL()}
        onSubmit={() => void controller.handleAddPlugin()}
      />

      <ConfirmDialog
        open={controller.deleteConfirm.open}
        onOpenChange={(open) => !open && controller.setDeleteConfirm({ open: false, pluginName: null })}
        title="删除插件"
        description={`确定要删除插件 "${controller.deleteConfirm.pluginName || ''}" 吗？`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => void controller.handleConfirmDeletePlugin()}
        isLoading={controller.isBatchDeleting}
      />

      <ConfirmDialog
        open={controller.batchDeleteConfirmOpen}
        onOpenChange={controller.setBatchDeleteConfirmOpen}
        title="确认批量删除插件"
        description={`将删除 ${controller.selectedCount} 个已选插件${controller.selectedPluginPreviewText ? `（例如：${controller.selectedPluginPreviewText}）` : ''}。内置插件会自动跳过。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => void controller.handleBatchDeletePlugins()}
        isLoading={controller.isBatchDeleting}
      />
    </>
  );
};
