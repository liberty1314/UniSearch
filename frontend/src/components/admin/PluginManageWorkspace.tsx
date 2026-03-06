import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  Edit3,
  Eye,
  Layers,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AdminWorkspaceFooter } from './AdminWorkspaceFooter';
import { AdminWorkspaceToolbar } from './AdminWorkspaceToolbar';
import { type UnifiedStatusFilter } from './previewFilters';
import {
  PAGE_SIZE,
  pluginStatusBadgeClass,
  pluginStatusText,
  resolvePluginStatus,
  type TestStatus,
} from './pluginManageDialogShared';
import type { PluginInfo } from '@/types/api';

export interface PluginManageWorkspaceViewModel {
  isOpen: boolean;
  isReadOnly: boolean;
  isOperationBusy: boolean;
  isBatchTesting: boolean;
  localPluginsCount: number;
  statusFilter: UnifiedStatusFilter;
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
  onSetStatusFilter: (value: UnifiedStatusFilter) => void;
  onOpenAddDialog: () => void;
  onBatchToggle: (isEnabled: boolean) => void;
  onOpenBatchDeleteConfirm: () => void;
  onBatchTest: () => void;
  onToggleSelectFiltered: () => void;
  onSelectPlugin: (pluginName: string, checked: boolean) => void;
  onOpenDetail: (plugin: PluginInfo) => void;
  onTestPlugin: (plugin: PluginInfo) => void;
  onTogglePluginEnabled: (plugin: PluginInfo) => void;
  onOpenEditDialog: (plugin: PluginInfo) => void;
  onOpenDeleteConfirm: (pluginName: string) => void;
  onPageChange: (page: number) => void;
}

interface PluginManageWorkspaceProps {
  workspace: PluginManageWorkspaceViewModel;
}

const getTestIcon = (status: TestStatus) => {
  if (status === 'testing') return <Loader2 className="h-4 w-4 animate-spin" />;
  if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
  return <Zap className="h-4 w-4" />;
};

export function PluginManageWorkspace({ workspace }: PluginManageWorkspaceProps) {
  const {
    isOpen,
    isReadOnly,
    isOperationBusy,
    isBatchTesting,
    localPluginsCount,
    statusFilter,
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
    onSetStatusFilter,
    onOpenAddDialog,
    onBatchToggle,
    onOpenBatchDeleteConfirm,
    onBatchTest,
    onToggleSelectFiltered,
    onSelectPlugin,
    onOpenDetail,
    onTestPlugin,
    onTogglePluginEnabled,
    onOpenEditDialog,
    onOpenDeleteConfirm,
    onPageChange,
  } = workspace;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-blue-50 to-cyan-50 px-6 py-4 dark:border-slate-700 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                      <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      插件工作台
                      <Badge variant={isReadOnly ? 'outline' : 'success'}>
                        {isReadOnly ? '只读模式' : '编辑模式'}
                      </Badge>
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      统一检索、查看与操作插件状态
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                    aria-label="关闭插件管理"
                  >
                    <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  </button>
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
                addButtonClassName="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-700 hover:to-cyan-700 lg:ml-auto"
                batchTestClassName="border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                batchTestDisabled={isOperationBusy || localPluginsCount === 0}
                onSetStatusFilter={onSetStatusFilter}
                onOpenAddDialog={onOpenAddDialog}
                onBatchToggle={onBatchToggle}
                onOpenBatchDeleteConfirm={onOpenBatchDeleteConfirm}
                onBatchTest={onBatchTest}
                onToggleSelectFiltered={onToggleSelectFiltered}
              />

              <div ref={listContainerRef} className="flex-1 overflow-y-auto p-5">
                {pagedItems.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                    <Activity className="mx-auto mb-2 h-10 w-10 opacity-35" />
                    <p>无匹配数据</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pagedItems.map((plugin, index) => {
                      const pluginStatus = resolvePluginStatus(plugin);
                      return (
                        <motion.div
                          key={plugin.name}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="rounded-lg border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300 dark:border-slate-600 dark:bg-slate-700/30 dark:hover:border-slate-500"
                        >
                          <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              {!isReadOnly && (
                                <Checkbox
                                  checked={selectedPluginNames.has(plugin.name)}
                                  onCheckedChange={(checked) => onSelectPlugin(plugin.name, Boolean(checked))}
                                  aria-label={`选择插件 ${plugin.name}`}
                                  disabled={isOperationBusy}
                                />
                              )}
                              <div
                                className={`h-2.5 w-2.5 rounded-full ${
                                  pluginStatus === 'error'
                                    ? 'bg-red-500'
                                    : pluginStatus === 'custom'
                                      ? 'bg-blue-500'
                                      : pluginStatus === 'active'
                                        ? 'bg-green-500'
                                        : 'bg-slate-400'
                                }`}
                              />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-800 dark:text-slate-100">{plugin.name}</p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {plugin.description || '无描述'}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">优先级 {plugin.priority}</Badge>
                              <Badge className={pluginStatusBadgeClass(pluginStatus)}>
                                {pluginStatusText(pluginStatus)}
                              </Badge>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenDetail(plugin)}
                                className="h-8 px-2"
                              >
                                <Eye className="mr-1 h-4 w-4" />
                                详情
                              </Button>

                              {!isReadOnly && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onTestPlugin(plugin)}
                                    disabled={isOperationBusy || testingStatus[plugin.name] === 'testing'}
                                    className="h-8 px-2"
                                  >
                                    {getTestIcon(testingStatus[plugin.name] || 'idle')}
                                    <span className="ml-1">测试</span>
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onTogglePluginEnabled(plugin)}
                                    aria-label={`切换插件 ${plugin.name} 状态`}
                                    disabled={isOperationBusy}
                                    className={`h-8 px-2 ${
                                      plugin.is_enabled
                                        ? 'border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20'
                                        : 'border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700/50'
                                    }`}
                                  >
                                    {plugin.is_enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                  </Button>

                                  {plugin.plugin_type === 'custom' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onOpenEditDialog(plugin)}
                                        className="h-8 px-2"
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onOpenDeleteConfirm(plugin.name)}
                                        aria-label={`删除插件 ${plugin.name}`}
                                        disabled={isOperationBusy}
                                        className="h-8 px-2 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
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
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
