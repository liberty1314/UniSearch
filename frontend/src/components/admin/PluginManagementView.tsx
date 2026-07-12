import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Activity,
  ArrowUpRight,
  Layers,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { usePluginManageController } from '@/hooks/usePluginManageController';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ApplePagination } from './ApplePagination';
import { AdminDataTable, type AdminDataTableColumn } from './AdminDataTable';
import { AdminTagMultiSelect } from './AdminTagMultiSelect';
import { AdminStatusToggleAction } from './AdminStatusToggleAction';
import { AdminTestAction } from './AdminTestAction';
import {
  AdminDetailDrawer,
  AdminFilterField,
  AdminFilterSurface,
  AdminFilterToolbar,
  AdminMetricCard,
  AdminMetricGrid,
  AdminSearchInput,
  AdminSelectionBar,
  AdminStatusFilter,
  AdminWorkspaceHero,
  AdminWorkspacePageFrame,
} from './AdminWorkspacePageFrame';
import { formatAdminHealthTime } from './adminDateFormat';
import {
  pluginStatusBadgeClass,
  pluginStatusText,
  resolvePluginStatus,
  type TestStatus,
} from './pluginManageDialogShared';
import type { PluginInfo } from "@/types/plugin";
const EMPTY_PAGE_PLUGINS: PluginInfo[] = [];

const PLUGIN_STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '禁用' },
  { value: 'error', label: '异常' },
] as const;

const healthSourceText = (source?: string) => {
  if (source === 'manual_test') return '手动测试';
  if (source === 'search_failure') return '搜索失败';
  if (source === 'timeout') return '搜索超时';
  if (source === 'batch_test') return '批量测试';
  if (source === 'system') return '系统检查';
  return source || '暂无来源';
};

function PluginInfoCell({ plugin }: { plugin: PluginInfo }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{plugin.name}</p>
        {(plugin.tags || []).slice(0, 1).map((tag) => (
          <Badge key={tag} variant="outline">{tag}</Badge>
        ))}
      </div>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {plugin.description || '暂无描述'}
      </p>
    </div>
  );
}

function PluginStateCell({ plugin }: { plugin: PluginInfo }) {
  const status = resolvePluginStatus(plugin);
  return <Badge className={pluginStatusBadgeClass(status)}>{pluginStatusText(status)}</Badge>;
}

function PluginHealthCell({ plugin }: { plugin: PluginInfo }) {
  const healthText = plugin.health
    ? `${plugin.health.is_healthy ? '正常' : '异常'} · ${healthSourceText(plugin.health.check_source)}`
    : '未测试';

  return (
    <div className="min-w-0 text-sm" title={plugin.health?.last_error || healthText}>
      <p className="truncate font-medium text-slate-700 dark:text-slate-200">{healthText}</p>
    </div>
  );
}

function PluginMobileItem({
  plugin,
  selected,
  testingStatus,
  isOperationBusy,
  onSelect,
  onOpenDetail,
  onTest,
  onToggleEnabled,
}: {
  plugin: PluginInfo;
  selected: boolean;
  testingStatus: TestStatus;
  isOperationBusy: boolean;
  onSelect: (checked: boolean) => void;
  onOpenDetail: () => void;
  onTest: () => void;
  onToggleEnabled: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(Boolean(checked))}
            onClick={(event) => event.stopPropagation()}
            aria-label={`选择插件 ${plugin.name}（移动端）`}
            className="mt-1"
          />
          <PluginInfoCell plugin={plugin} />
        </div>
        <PluginStateCell plugin={plugin} />
      </div>
      <div className="rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.44]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">健康</span>
          <PluginHealthCell plugin={plugin} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">最近检查</span>
          <span className="text-right text-slate-600 dark:text-slate-300">{formatAdminHealthTime(plugin.health?.last_checked_at)}</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="adminIconAction"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetail();
          }}
          aria-label={`查看插件 ${plugin.name} 详情（移动端）`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Button>
        <AdminTestAction
          compact
          status={testingStatus}
          onClick={(event) => {
            event.stopPropagation();
            onTest();
          }}
          disabled={isOperationBusy}
        />
        <AdminStatusToggleAction
          compact
          enabled={plugin.is_enabled}
          entityLabel={`插件 ${plugin.name}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleEnabled();
          }}
          disabled={isOperationBusy}
        />
      </div>
    </div>
  );
}

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
    const enabledCount = controller.localPlugins.filter((plugin) => plugin.is_enabled).length;
    const disabledCount = controller.localPlugins.filter((plugin) => !plugin.is_enabled).length;
    const issueCount = controller.localPlugins.filter(
      (plugin) => plugin.is_enabled && resolvePluginStatus(plugin) === 'error'
    ).length;

    return {
      enabledCount,
      disabledCount,
      issueCount,
    };
  }, [controller.localPlugins]);

  const {
    detailPluginName,
    pagedItems,
    setDetailPluginName,
  } = controller;
  const activePlugin = controller.activeDetailPlugin;
  const drawerOpen = Boolean(activePlugin);
  const abnormalPlugins = useMemo(
    () => controller.localPlugins.filter((plugin) => plugin.is_enabled && resolvePluginStatus(plugin) === 'error'),
    [controller.localPlugins],
  );

  useEffect(() => {
    if (detailPluginName === null) {
      return;
    }

    const hasActiveOnCurrentPage = pagedItems.some(
      (plugin) => plugin.name === detailPluginName
    );
    if (!hasActiveOnCurrentPage) {
      setDetailPluginName(null);
    }
  }, [
    detailPluginName,
    pagedItems,
    setDetailPluginName,
  ]);

  const closeDrawer = () => {
    controller.setDetailPluginName(null);
  };

  const handleTestAbnormalPlugins = async () => {
    if (abnormalPlugins.length === 0) {
      return;
    }
    for (const plugin of abnormalPlugins) {
      await controller.handleTestPlugin(plugin);
    }
  };

  const renderPluginRowActions = useCallback((plugin: PluginInfo) => {
    return (
      <>
        <Button
          type="button"
          variant="adminIconAction"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            controller.handleOpenDetail(plugin);
          }}
          aria-label={`查看插件 ${plugin.name} 详情`}
        >
          <ArrowUpRight className="h-4 w-4" />
        </Button>
        <AdminTestAction
          compact
          status={controller.testingStatus[plugin.name] || 'idle'}
          onClick={(event) => {
            event.stopPropagation();
            void controller.handleTestPlugin(plugin);
          }}
          disabled={controller.isOperationBusy}
        />
        <AdminStatusToggleAction
          compact
          enabled={plugin.is_enabled}
          entityLabel={`插件 ${plugin.name}`}
          onClick={(event) => {
            event.stopPropagation();
            void controller.handleTogglePluginEnabled(plugin);
          }}
          disabled={controller.isOperationBusy}
        />
      </>
    );
  }, [controller]);

  const columns = useMemo<AdminDataTableColumn<PluginInfo>[]>(() => [
    {
      key: 'select',
      title: '选择',
      align: 'center',
      render: (plugin) => (
        <Checkbox
          checked={controller.selectedPluginNames.has(plugin.name)}
          onCheckedChange={(checked) => controller.selectKey(plugin.name, Boolean(checked))}
          onClick={(event) => event.stopPropagation()}
          aria-label={`选择插件 ${plugin.name}`}
        />
      ),
    },
    {
      key: 'name',
      title: '插件',
      sortable: true,
      render: (plugin) => <PluginInfoCell plugin={plugin} />,
    },
    {
      key: 'status',
      title: '状态',
      align: 'center',
      render: (plugin) => <PluginStateCell plugin={plugin} />,
    },
    {
      key: 'health',
      title: '健康',
      render: (plugin) => <PluginHealthCell plugin={plugin} />,
    },
    {
      key: 'lastChecked',
      title: '最近检查',
      align: 'right',
      render: (plugin) => (
        <span className="whitespace-nowrap tabular-nums text-slate-600 dark:text-slate-300">
          {formatAdminHealthTime(plugin.health?.last_checked_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      align: 'right',
      render: (plugin) => (
        <div className="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
          {renderPluginRowActions(plugin)}
        </div>
      ),
    },
  ], [
    controller,
    renderPluginRowActions,
  ]);

  return (
    <>
      <AdminWorkspacePageFrame
        header={(
          <AdminWorkspaceHero
            icon={<Layers className="h-5 w-5" />}
            title="插件中心"
            description="统一管理源码注册的内置插件，支持筛选、启停、测试与详情查看。"
            badge="内置插件台"
            meta={<span>目录版本 {controller.catalogVersion}</span>}
            actions={(
              <>
                <Button
                  type="button"
                  variant="adminAction"
                  onClick={() => void controller.handleBatchTest()}
                  disabled={controller.localPlugins.length === 0 || controller.isOperationBusy}
                  loading={controller.isBatchTesting}
                >
                  <Activity className="mr-1 h-4 w-4" />
                  快速测试
                </Button>
                <Button
                  type="button"
                  variant="adminAction"
                  onClick={() => void handleTestAbnormalPlugins()}
                  disabled={abnormalPlugins.length === 0 || controller.isOperationBusy}
                  loading={controller.isBatchTesting}
                >
                  <Zap className="mr-1 h-4 w-4" />
                  仅测试异常插件
                </Button>
              </>
            )}
          />
        )}
        metrics={(
          <AdminMetricGrid>
            <AdminMetricCard label="总数" value={controller.localPlugins.length} hint="源码注册的内置插件" />
            <AdminMetricCard label="启用" value={metrics.enabledCount} hint="当前参与搜索的插件" />
            <AdminMetricCard label="停用" value={metrics.disabledCount} hint="当前未参与搜索的插件" />
            <AdminMetricCard label="异常" value={metrics.issueCount} hint="启用且最近测试异常的插件" />
          </AdminMetricGrid>
        )}
        filters={(
          <AdminFilterSurface>
            <AdminFilterToolbar className="xl:grid-cols-[minmax(12rem,0.75fr),minmax(13rem,0.85fr),minmax(18rem,1.4fr)]">
              <AdminFilterField label="状态">
                <AdminStatusFilter
                  options={PLUGIN_STATUS_OPTIONS}
                  value={controller.statusFilter}
                  onChange={(v) => controller.setStatusFilter(v as typeof controller.statusFilter)}
                  ariaLabel="插件状态筛选"
                  variant="toolbar"
                />
              </AdminFilterField>
              <AdminFilterField label="标签">
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
                  variant="toolbar"
                />
              </AdminFilterField>
              <AdminFilterField label="搜索">
                <AdminSearchInput
                  value={controller.searchKeyword}
                  onChange={controller.setSearchKeyword}
                  placeholder="搜索名称、描述或标签"
                  variant="toolbar"
                />
              </AdminFilterField>
            </AdminFilterToolbar>
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
                  variant="adminAction"
                  onClick={() => controller.handleToggleSelectFiltered()}
                  disabled={controller.filteredItems.length === 0 || controller.isOperationBusy}
                >
                  {controller.isAllFilteredSelected ? '清空筛选选择' : '全选当前筛选'}
                </Button>
                <Button type="button" size="sm" variant="adminAction" onClick={() => void controller.handleBatchTogglePlugins(true)} loading={controller.isBatchUpdating}>
                  批量启用
                </Button>
                <Button type="button" size="sm" variant="adminAction" onClick={() => void controller.handleBatchTogglePlugins(false)} loading={controller.isBatchUpdating}>
                  批量停用
                </Button>
                <Button type="button" size="sm" variant="adminAction" onClick={() => void controller.handleBatchTest()} loading={controller.isBatchTesting}>
                  批量测试
                </Button>
              </>
            )}
          />
        ) : undefined}
        content={(
          <div className="space-y-4">
            <AdminDataTable
              data={controller.pagedItems}
              columns={columns}
              rowKey={(plugin) => plugin.name}
              loading={controller.isCatalogLoading}
              emptyText="没有匹配的插件"
              countLabel="个插件"
              desktopVariant="management-grid"
              desktopGridGapClassName="gap-4"
              desktopGridTemplateColumns="44px minmax(260px,1.45fr) 76px minmax(150px,0.8fr) 132px 248px"
              desktopGridMinWidth="980px"
              getRowTestId={(plugin) => `plugin-market-row-${plugin.name}`}
              renderMobileItem={(plugin) => (
                <PluginMobileItem
                  plugin={plugin}
                  selected={controller.selectedPluginNames.has(plugin.name)}
                  testingStatus={controller.testingStatus[plugin.name] || 'idle'}
                  isOperationBusy={controller.isOperationBusy}
                  onSelect={(checked) => controller.selectKey(plugin.name, checked)}
                  onOpenDetail={() => controller.handleOpenDetail(plugin)}
                  onTest={() => void controller.handleTestPlugin(plugin)}
                  onToggleEnabled={() => void controller.handleTogglePluginEnabled(plugin)}
                />
              )}
            />

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
            description="来源、健康和可执行动作"
            testId="plugin-management-drawer"
            onClose={closeDrawer}
            emptyTitle="选择一个插件"
            emptyDescription="点击表格行内的详情按钮查看插件详情。"
            footer={activePlugin ? (
              <div className="flex flex-wrap justify-end gap-2">
                <AdminTestAction
                  status={controller.testingStatus[activePlugin.name] || 'idle'}
                  onClick={() => void controller.handleTestPlugin(activePlugin)}
                  disabled={controller.isOperationBusy}
                />
                <AdminStatusToggleAction
                  enabled={activePlugin.is_enabled}
                  entityLabel={`插件 ${activePlugin.name}`}
                  onClick={() => void controller.handleTogglePluginEnabled(activePlugin)}
                  disabled={controller.isOperationBusy}
                />
              </div>
            ) : undefined}
          >
            {activePlugin ? (
              <div className="space-y-4 text-sm">
                <div className="rounded-[1.2rem] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.40]">
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{activePlugin.description || '暂无描述'}</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.34]">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">来源</p>
                    <p className="mt-2 font-medium text-slate-900 dark:text-white">{activePlugin.resource?.source_label || activePlugin.source_type || '本地'}</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">{activePlugin.author || '未填写作者'}</p>
                  </div>
                  <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.34]">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">健康状态</p>
                    <p className="mt-2 font-medium text-slate-900 dark:text-white">
                      {activePlugin.health ? (activePlugin.health.is_healthy ? '正常' : '异常') : '未测试'}
                    </p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      来源：{healthSourceText(activePlugin.health?.check_source)}
                    </p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      最近检查：{formatAdminHealthTime(activePlugin.health?.last_checked_at)}
                    </p>
                    <p className="mt-1 break-words text-slate-500 dark:text-slate-400">{activePlugin.health?.last_error || '暂无错误信息'}</p>
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
                {activePlugin.config_schema?.length ? (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">插件配置</p>
                    <div className="space-y-2 rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.34]">
                      {activePlugin.config_schema.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-900 dark:text-white">{field.label || field.key}</p>
                            <Badge variant="outline">{field.type}</Badge>
                          </div>
                          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {field.description || field.key}
                          </p>
                          {field.type === 'number' || field.type === 'string' ? (
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                              {field.label || field.key}
                              <input
                                aria-label={field.label || field.key}
                                type={field.type === 'number' ? 'number' : 'text'}
                                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={String(controller.pluginConfigValues[field.key] ?? field.default ?? '')}
                                disabled={controller.isReadOnly || controller.isPluginConfigLoading || controller.isPluginConfigSaving}
                                onChange={(event) =>
                                  controller.handlePluginConfigValueChange(field.key, event.target.value)
                                }
                              />
                            </label>
                          ) : null}
                        </div>
                      ))}
                      {!controller.isReadOnly ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="adminPrimaryAction"
                          className="mt-1"
                          onClick={() => void controller.handleSavePluginConfig()}
                          disabled={controller.isPluginConfigLoading || controller.isPluginConfigSaving}
                          loading={controller.isPluginConfigSaving}
                        >
                          保存配置
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">安装信息</p>
                  <div className="rounded-[1.15rem] border border-slate-200/70 p-4 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.34]">
                    <p className="font-medium text-slate-900 dark:text-white">{activePlugin.install?.type || activePlugin.plugin_type}</p>
                    {activePlugin.install?.url ? (
                      <p className="mt-2 break-all text-slate-500 dark:text-slate-400">{activePlugin.install.url}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </AdminDetailDrawer>
        )}
      />

    </>
  );
};
