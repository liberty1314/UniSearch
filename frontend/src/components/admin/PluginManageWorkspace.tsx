import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  Eye,
  Layers,
  Search,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AdminStatusToggleAction } from './AdminStatusToggleAction';
import { AdminTestAction } from './AdminTestAction';
import { AdminWorkspaceFooter } from './AdminWorkspaceFooter';
import { AdminWorkspaceToolbar } from './AdminWorkspaceToolbar';
import { AdminSelectField } from './AdminSelectField';
import {
  ADMIN_PANEL_SURFACE_CLASSES,
  ADMIN_PANEL_SURFACE_HOVER_CLASSES,
} from '@/components/admin/adminDesign';
import {
  dialogShellCloseClassName,
  dialogShellOverlayClassName,
  dialogShellOverlayMotionProps,
  dialogShellPanelClassName,
  dialogShellViewportClassName,
  getDialogShellSurfaceMotionProps,
} from '@/components/ui/dialog-shell';
import { type UnifiedStatusFilter } from './previewFilters';
import {
  PAGE_SIZE,
  pluginStatusBadgeClass,
  pluginStatusText,
  resolvePluginStatus,
  type TestStatus,
} from './pluginManageDialogShared';
import type { PluginInfo } from "@/types/plugin";

export interface PluginManageWorkspaceViewModel {
  isOpen: boolean;
  presentation?: 'modal' | 'page';
  isReadOnly: boolean;
  isOperationBusy: boolean;
  isBatchTesting: boolean;
  localPluginsCount: number;
  searchKeyword: string;
  statusFilter: UnifiedStatusFilter;
  categoryFilter: string;
  capabilityFilter: string;
  availableCategories: string[];
  availableCapabilities: string[];
  isCatalogLoading: boolean;
  catalogVersion: string;
  filteredItemsCount: number;
  currentPage: number;
  totalPages: number;
  selectedPluginNames: Set<string>;
  selectedCount: number;
  isAllFilteredSelected: boolean;
  pagedItems: PluginInfo[];
  testingStatus: Record<string, TestStatus>;
  listContainerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSetSearchKeyword: (value: string) => void;
  onSetStatusFilter: (value: UnifiedStatusFilter) => void;
  onSetCategoryFilter: (value: string) => void;
  onSetCapabilityFilter: (value: string) => void;
  onBatchToggle: (isEnabled: boolean) => void;
  onBatchTest: () => void;
  onToggleSelectFiltered: () => void;
  onSelectPlugin: (pluginName: string, checked: boolean) => void;
  onOpenDetail: (plugin: PluginInfo) => void;
  onTestPlugin: (plugin: PluginInfo) => void;
  onTogglePluginEnabled: (plugin: PluginInfo) => void;
  onPageChange: (page: number) => void;
}

interface PluginManageWorkspaceProps {
  workspace: PluginManageWorkspaceViewModel;
}

export function PluginManageWorkspace({ workspace }: PluginManageWorkspaceProps) {
  const shouldReduceMotion = useReducedMotion();
  const {
    isOpen,
    presentation = 'modal',
    isReadOnly,
    isOperationBusy,
    isBatchTesting,
    localPluginsCount,
    searchKeyword,
    statusFilter,
    categoryFilter,
    capabilityFilter,
    availableCategories = ['all'],
    availableCapabilities = ['all'],
    catalogVersion,
    filteredItemsCount,
    currentPage,
    totalPages,
    selectedPluginNames,
    selectedCount,
    isAllFilteredSelected,
    pagedItems,
    testingStatus,
    listContainerRef,
    onClose,
    onSetSearchKeyword,
    onSetStatusFilter,
    onSetCategoryFilter,
    onSetCapabilityFilter,
    onBatchToggle,
    onBatchTest,
    onToggleSelectFiltered,
    onSelectPlugin,
    onOpenDetail,
    onTestPlugin,
    onTogglePluginEnabled,
    onPageChange,
  } = workspace;

  if (presentation === 'modal' && !isOpen) {
    return null;
  }

  const content = (
    <>
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-blue-50 to-cyan-50 px-6 py-4 dark:border-slate-700 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Layers className="h-5 w-5 text-blue-600 dark:text-cyan-300" />
              插件工作台
              <Badge variant={isReadOnly ? 'outline' : 'success'}>
                {isReadOnly ? '只读模式' : '编辑模式'}
              </Badge>
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              统一检索、查看与操作插件状态
            </p>
          </div>
          {presentation === 'modal' ? (
            <button
              onClick={onClose}
              className={dialogShellCloseClassName}
              aria-label="关闭插件管理"
            >
              <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-slate-100 px-6 py-5 dark:border-slate-800">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">目录版本</div>
            <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{catalogVersion}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">插件总数</div>
            <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{localPluginsCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">当前筛选</div>
            <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{filteredItemsCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">批量已选</div>
            <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedCount}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.4fr),repeat(3,minmax(0,0.8fr))]">
          <Input
            value={searchKeyword}
            onChange={(event) => onSetSearchKeyword(event.target.value)}
            placeholder="搜索名称、描述、能力、标签"
            aria-label="搜索插件"
            reserveMessageSpace={false}
            className="h-10 rounded-2xl bg-white/80 py-2 text-sm dark:bg-white/[0.03]"
            startAdornment={<Search className="h-4 w-4 text-slate-400" />}
          />

          <AdminSelectField
            value={categoryFilter}
            onChange={onSetCategoryFilter}
            ariaLabel="插件分类筛选"
            options={availableCategories.map((item) => ({
              value: item,
              label: item === 'all' ? '全部分类' : item,
            }))}
          />

          <AdminSelectField
            value={capabilityFilter}
            onChange={onSetCapabilityFilter}
            ariaLabel="插件能力筛选"
            options={availableCapabilities.map((item) => ({
              value: item,
              label: item === 'all' ? '全部能力' : item,
            }))}
          />

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onToggleSelectFiltered}
              disabled={isOperationBusy || filteredItemsCount === 0}
              className="h-10 rounded-2xl px-3 text-sm"
            >
              {isAllFilteredSelected ? '清空选择' : '全选当前筛选'}
            </Button>
          </div>
        </div>

        <AdminWorkspaceToolbar
          isReadOnly={isReadOnly}
          isOperationBusy={isOperationBusy}
          isBatchTesting={isBatchTesting}
          selectedCount={selectedCount}
          filteredItemsCount={filteredItemsCount}
          isAllFilteredSelected={isAllFilteredSelected}
          statusFilter={statusFilter}
          addButtonLabel="添加插件"
          addButtonAriaLabel="添加插件"
          addButtonClassName="hidden"
          showAddButton={false}
          showBatchDelete={false}
          batchTestClassName="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-cyan-800/70 dark:text-cyan-300 dark:hover:bg-cyan-950/30"
          batchTestDisabled={isOperationBusy || localPluginsCount === 0}
          onSetStatusFilter={onSetStatusFilter}
          onBatchToggle={onBatchToggle}
          onBatchTest={onBatchTest}
          onToggleSelectFiltered={onToggleSelectFiltered}
        />
      </div>

      <div ref={listContainerRef} className="flex-1 overflow-y-auto p-5">
        {pagedItems.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <Activity className="mx-auto mb-2 h-10 w-10 opacity-35" />
            <p>无匹配数据</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {pagedItems.map((plugin, index) => {
              const pluginStatus = resolvePluginStatus(plugin);
              return (
                <motion.div
                  key={plugin.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  data-testid={`plugin-card-${plugin.name}`}
                  className="rounded-[24px] border border-slate-200 bg-white/80 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-colors hover:border-slate-300 dark:border-cyan-300/[0.12] dark:bg-slate-950/[0.48] dark:hover:border-cyan-300/[0.22]"
                >
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      {!isReadOnly ? (
                        <Checkbox
                          checked={selectedPluginNames.has(plugin.name)}
                          onCheckedChange={(checked) => onSelectPlugin(plugin.name, Boolean(checked))}
                          aria-label={`选择插件 ${plugin.name}`}
                          disabled={isOperationBusy}
                        />
                      ) : null}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{plugin.name}</p>
                          <Badge className={pluginStatusBadgeClass(pluginStatus)}>
                            {pluginStatusText(pluginStatus)}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                          {plugin.description || '无描述'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {plugin.version ? <Badge variant="outline">v{plugin.version}</Badge> : null}
                      {plugin.category ? <Badge variant="secondary">{plugin.category}</Badge> : null}
                      <Badge variant="outline">优先级 {plugin.priority}</Badge>
                      {(plugin.capabilities || []).slice(0, 3).map((capability) => (
                        <Badge key={capability} variant="outline" className="max-w-full truncate">
                          {capability}
                        </Badge>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 text-xs text-slate-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-slate-300">
                      <div className="flex items-center justify-between gap-2">
                        <span>来源</span>
                        <span className="font-medium">{plugin.source_type || plugin.plugin_type}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span>健康</span>
                        <span className="font-medium">
                          {plugin.health
                            ? plugin.health.is_healthy
                              ? '健康'
                              : '异常'
                            : '未测试'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenDetail(plugin)}
                        className="h-8 px-2"
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        详情
                      </Button>

                      {!isReadOnly ? (
                        <>
                          <AdminTestAction
                            compact
                            status={testingStatus[plugin.name] || 'idle'}
                            onClick={() => onTestPlugin(plugin)}
                            disabled={isOperationBusy}
                          />

                          <AdminStatusToggleAction
                            compact
                            enabled={plugin.is_enabled}
                            entityLabel={`插件 ${plugin.name}`}
                            onClick={() => onTogglePluginEnabled(plugin)}
                            disabled={isOperationBusy}
                          />

                        </>
                      ) : null}

                      {plugin.homepage ? (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 px-2"
                        >
                          <a href={plugin.homepage} target="_blank" rel="noreferrer">
                            <ArrowUpRight className="mr-1 h-4 w-4" />
                            主页
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AdminWorkspaceFooter
        totalCount={localPluginsCount}
        itemLabel="插件"
        isReadOnly={isReadOnly}
        selectedCount={selectedCount}
        showPagination={filteredItemsCount > 0}
        currentPage={currentPage}
        totalPages={totalPages}
        filteredItemsCount={filteredItemsCount}
        pageSize={PAGE_SIZE}
        onPageChange={onPageChange}
      />
    </>
  );

  if (presentation === 'page') {
    return (
      <div
        className={cn(
          ADMIN_PANEL_SURFACE_CLASSES,
          ADMIN_PANEL_SURFACE_HOVER_CLASSES,
          'flex w-full flex-col overflow-hidden'
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            {...dialogShellOverlayMotionProps}
            className={dialogShellOverlayClassName}
            onClick={onClose}
          />

          <div className={dialogShellViewportClassName}>
            <motion.div
              {...getDialogShellSurfaceMotionProps(shouldReduceMotion)}
              onClick={(event) => event.stopPropagation()}
              className={`${dialogShellPanelClassName} flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden`}
            >
              {content}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
