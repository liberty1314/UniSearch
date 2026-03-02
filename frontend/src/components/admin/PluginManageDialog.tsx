import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  Activity,
  CheckCircle2,
  Edit3,
  Eye,
  Layers,
  Loader2,
  PlayCircle,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type {
  AdminDialogMode,
  BatchPluginOperationResponse,
  PluginInfo,
} from '@/types/api';
import { comparePlugins } from './adminListSort';
import { ConfirmDialog } from './ConfirmDialog';
import { ApplePagination } from './ApplePagination';
import {
  UNIFIED_STATUS_FILTER_OPTIONS,
  type UnifiedStatusFilter,
  isPluginMatchesStatusFilter,
} from './previewFilters';
import { useAdminWorkspaceState } from './useAdminWorkspaceState';
import {
  buildAuthHeaders,
  readErrorMessage,
  toastBatchResult,
} from './adminWorkspaceApi';

interface PluginManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  plugins: PluginInfo[];
  mode?: AdminDialogMode;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const PAGE_SIZE = 10;

const resolvePluginStatus = (plugin: PluginInfo): PluginInfo['status'] => {
  if (plugin.status === 'error') return 'error';
  if (!plugin.is_enabled) return 'inactive';
  return plugin.plugin_type === 'custom' ? 'custom' : 'active';
};

const pluginStatusText = (status: PluginInfo['status']): string => {
  if (status === 'custom') return '自定义';
  if (status === 'active') return '内置';
  if (status === 'error') return '异常';
  return '已停用';
};

const pluginStatusBadgeClass = (status: PluginInfo['status']): string => {
  if (status === 'custom') return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
  if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
  if (status === 'error') return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

export const PluginManageDialog: React.FC<PluginManageDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
  plugins,
  mode = 'edit',
}) => {
  const isReadOnly = mode === 'view';
  const [localPlugins, setLocalPlugins] = useState<PluginInfo[]>(plugins);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [testingStatus, setTestingStatus] = useState<Record<string, TestStatus>>({});
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const [detailPluginName, setDetailPluginName] = useState<string | null>(null);
  const [editingPluginName, setEditingPluginName] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ priority: number; description: string; url: string }>({
    priority: 0,
    description: '',
    url: '',
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; pluginName: string | null }>({
    open: false,
    pluginName: null,
  });
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);

  const listContainerRef = useRef<HTMLDivElement>(null);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    setLocalPlugins(plugins);
  }, [plugins]);

  useEffect(() => {
    if (isOpen) return;
    setHasPendingChanges(false);
    setTestingStatus({});
    setDeleteConfirm({ open: false, pluginName: null });
    setBatchDeleteConfirmOpen(false);
    setDetailPluginName(null);
    setEditingPluginName(null);
  }, [isOpen]);

  const clearStatusTimeouts = () => {
    timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutIdsRef.current = [];
  };

  const scheduleStatusReset = (callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      callback();
      timeoutIdsRef.current = timeoutIdsRef.current.filter((id) => id !== timeoutId);
    }, delay);
    timeoutIdsRef.current.push(timeoutId);
  };

  useEffect(() => () => clearStatusTimeouts(), []);

  const getPluginKey = useCallback((plugin: PluginInfo) => plugin.name, []);
  const matchesPluginStatus = useCallback(
    (plugin: PluginInfo, filter: UnifiedStatusFilter) =>
      isPluginMatchesStatusFilter(plugin, filter),
    []
  );

  const {
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    filteredItems,
    pagedItems,
    totalPages,
    selectedKeys: selectedPluginNames,
    selectedCount,
    selectKey,
    selectAllFiltered,
    clearSelected,
    orderedItems,
  } = useAdminWorkspaceState<PluginInfo, string>({
    isOpen,
    items: localPlugins,
    getKey: getPluginKey,
    compareItems: comparePlugins,
    matchesKeyword: () => true,
    matchesStatus: matchesPluginStatus,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;

    if (typeof container.scrollTo === 'function') {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    container.scrollTop = 0;
  }, [currentPage]);

  const isOperationBusy = isBatchTesting || isBatchUpdating || isBatchDeleting;

  const selectedPluginPreviewText = useMemo(
    () =>
      orderedItems
        .filter((plugin) => selectedPluginNames.has(plugin.name))
        .map((plugin) => plugin.name)
        .slice(0, 3)
        .join('、'),
    [orderedItems, selectedPluginNames]
  );
  const filteredPluginNames = useMemo(
    () => filteredItems.map((plugin) => plugin.name),
    [filteredItems]
  );
  const isAllFilteredSelected = useMemo(
    () =>
      filteredPluginNames.length > 0 &&
      filteredPluginNames.every((name) => selectedPluginNames.has(name)),
    [filteredPluginNames, selectedPluginNames]
  );

  const activeDetailPlugin = useMemo(
    () => localPlugins.find((plugin) => plugin.name === detailPluginName) || null,
    [detailPluginName, localPlugins]
  );

  const activeEditingPlugin = useMemo(
    () => localPlugins.find((plugin) => plugin.name === editingPluginName) || null,
    [editingPluginName, localPlugins]
  );

  const handleClose = () => {
    clearStatusTimeouts();
    if (hasPendingChanges) {
      onSuccess();
      setHasPendingChanges(false);
    }
    onClose();
  };

  const handleOpenDetail = (plugin: PluginInfo) => {
    setDetailPluginName(plugin.name);
  };

  const openEditDialog = (plugin: PluginInfo) => {
    setEditingPluginName(plugin.name);
    setEditForm({
      priority: plugin.priority,
      description: plugin.description,
      url: plugin.url || '',
    });
  };

  const handleTestPlugin = async (plugin: PluginInfo) => {
    setTestingStatus((prev) => ({ ...prev, [plugin.name]: 'testing' }));

    try {
      const response = await fetch(`/api/admin/plugins/${plugin.name}/test`, {
        method: 'POST',
        headers: buildAuthHeaders(token, true),
      });

      if (response.ok) {
        setTestingStatus((prev) => ({ ...prev, [plugin.name]: 'success' }));
        setLocalPlugins((prev) =>
          prev.map((item) =>
            item.name === plugin.name
              ? {
                  ...item,
                  status: item.is_enabled
                    ? item.plugin_type === 'custom'
                      ? 'custom'
                      : 'active'
                    : 'inactive',
                }
              : item
          )
        );
        toast.success(`插件 ${plugin.name} 连通性测试成功`);
      } else {
        setTestingStatus((prev) => ({ ...prev, [plugin.name]: 'error' }));
        setLocalPlugins((prev) =>
          prev.map((item) =>
            item.name === plugin.name ? { ...item, status: 'error' } : item
          )
        );
        toast.error(`插件 ${plugin.name} 连通性测试失败`);
      }
    } catch {
      setTestingStatus((prev) => ({ ...prev, [plugin.name]: 'error' }));
      setLocalPlugins((prev) =>
        prev.map((item) =>
          item.name === plugin.name ? { ...item, status: 'error' } : item
        )
      );
      toast.error(`插件 ${plugin.name} 测试出错`);
    }

    onSuccess();
    scheduleStatusReset(() => {
      setTestingStatus((prev) => ({ ...prev, [plugin.name]: 'idle' }));
    }, 5000);
  };

  const handleBatchTest = async () => {
    const enabledPlugins = localPlugins.filter((plugin) => plugin.is_enabled);
    if (enabledPlugins.length === 0) {
      toast.error('没有已启用的插件可供测试');
      return;
    }

    setIsBatchTesting(true);
    setTestingStatus((prev) => {
      const next = { ...prev };
      enabledPlugins.forEach((plugin) => {
        next[plugin.name] = 'testing';
      });
      return next;
    });

    const results = await Promise.allSettled(
      enabledPlugins.map(async (plugin) => {
        try {
          const response = await fetch(`/api/admin/plugins/${plugin.name}/test`, {
            method: 'POST',
            headers: buildAuthHeaders(token, true),
          });
          const ok = response.ok;

          setTestingStatus((prev) => ({
            ...prev,
            [plugin.name]: ok ? 'success' : 'error',
          }));

          setLocalPlugins((prev) =>
            prev.map((item) => {
              if (item.name !== plugin.name) return item;
              return {
                ...item,
                status: ok
                  ? item.plugin_type === 'custom'
                    ? 'custom'
                    : 'active'
                  : 'error',
              };
            })
          );

          return { name: plugin.name, ok };
        } catch {
          setTestingStatus((prev) => ({ ...prev, [plugin.name]: 'error' }));
          setLocalPlugins((prev) =>
            prev.map((item) =>
              item.name === plugin.name ? { ...item, status: 'error' } : item
            )
          );
          return { name: plugin.name, ok: false };
        }
      })
    );

    const successCount = results.filter((result) => result.status === 'fulfilled' && result.value.ok).length;
    const failCount = enabledPlugins.length - successCount;

    if (failCount === 0) {
      toast.success(`全部 ${successCount} 个插件测试通过`);
    } else {
      toast.warning(`${successCount} 个通过，${failCount} 个失败`);
    }

    setIsBatchTesting(false);
    onSuccess();
    scheduleStatusReset(() => {
      setTestingStatus({});
    }, 10000);
  };

  const handleTogglePluginEnabled = async (plugin: PluginInfo) => {
    if (isOperationBusy) return;
    const nextEnabled = !plugin.is_enabled;

    try {
      const response = await fetch(`/api/admin/plugins/${plugin.name}/status`, {
        method: 'POST',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify({ is_enabled: nextEnabled }),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, `插件 ${plugin.name} 状态更新失败`));
        return;
      }

      setLocalPlugins((prev) =>
        prev.map((item) => {
          if (item.name !== plugin.name) return item;
          return {
            ...item,
            is_enabled: nextEnabled,
            status:
              item.status === 'error'
                ? 'error'
                : nextEnabled
                  ? item.plugin_type === 'custom'
                    ? 'custom'
                    : 'active'
                  : 'inactive',
          };
        })
      );
      setHasPendingChanges(true);
      toast.success(`插件 ${plugin.name} 已${nextEnabled ? '启用' : '停用'}`);
    } catch {
      toast.error(`插件 ${plugin.name} 状态更新出错`);
    }
  };

  const handleBatchTogglePlugins = async (isEnabled: boolean) => {
    if (selectedPluginNames.size === 0) {
      toast.error('请先选择要操作的插件');
      return;
    }

    setIsBatchUpdating(true);
    try {
      const response = await fetch('/api/admin/plugins/batch-status', {
        method: 'POST',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify({
          plugin_names: Array.from(selectedPluginNames),
          is_enabled: isEnabled,
        }),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, '批量更新插件状态失败'));
        return;
      }

      const result = (await response.json()) as BatchPluginOperationResponse;
      const successSet = new Set(result.success ?? []);
      const failedSet = new Set((result.failed ?? []).map((item) => item.plugin_name));

      if (successSet.size > 0) {
        setLocalPlugins((prev) =>
          prev.map((plugin) => {
            if (!successSet.has(plugin.name)) return plugin;
            return {
              ...plugin,
              is_enabled: isEnabled,
              status:
                plugin.status === 'error'
                  ? 'error'
                  : isEnabled
                    ? plugin.plugin_type === 'custom'
                      ? 'custom'
                      : 'active'
                    : 'inactive',
            };
          })
        );
        setHasPendingChanges(true);
      }

      setSelectedPlugins(failedSet);
      toastBatchResult(`批量${isEnabled ? '启用' : '停用'}`, result);
    } catch {
      toast.error('批量更新插件状态出错');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const setSelectedPlugins = (nextSelected: Set<string>) => {
    clearSelected();
    nextSelected.forEach((name) => selectKey(name, true));
  };
  const handleToggleSelectFiltered = () => {
    if (isAllFilteredSelected) {
      clearSelected();
      return;
    }
    selectAllFiltered();
  };

  const handleConfirmDeletePlugin = async () => {
    const pluginName = deleteConfirm.pluginName;
    if (!pluginName) return;

    setIsBatchDeleting(true);
    try {
      const response = await fetch(`/api/admin/plugins/${pluginName}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(token),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, '删除插件失败'));
        return;
      }

      setLocalPlugins((prev) => prev.filter((plugin) => plugin.name !== pluginName));
      selectKey(pluginName, false);
      setHasPendingChanges(true);
      toast.success(`插件 ${pluginName} 已删除`);
      setDeleteConfirm({ open: false, pluginName: null });
    } catch {
      toast.error('删除插件出错');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleBatchDeletePlugins = async () => {
    if (selectedPluginNames.size === 0) {
      toast.error('请先选择要删除的插件');
      return;
    }

    setIsBatchDeleting(true);
    try {
      const response = await fetch('/api/admin/plugins/batch-delete', {
        method: 'POST',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify({
          plugin_names: Array.from(selectedPluginNames),
        }),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, '批量删除插件失败'));
        return;
      }

      const result = (await response.json()) as BatchPluginOperationResponse;
      const successSet = new Set(result.success ?? []);
      const failedSet = new Set((result.failed ?? []).map((item) => item.plugin_name));

      if (successSet.size > 0) {
        setLocalPlugins((prev) => prev.filter((plugin) => !successSet.has(plugin.name)));
        setHasPendingChanges(true);
      }

      setSelectedPlugins(failedSet);
      setBatchDeleteConfirmOpen(false);
      toastBatchResult('批量删除', result);
    } catch {
      toast.error('批量删除插件出错');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPluginName) return;

    try {
      const response = await fetch(`/api/admin/plugins/${editingPluginName}`, {
        method: 'PUT',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, '更新插件失败'));
        return;
      }

      setLocalPlugins((prev) =>
        prev.map((plugin) =>
          plugin.name === editingPluginName
            ? {
                ...plugin,
                priority: editForm.priority,
                description: editForm.description,
                url: editForm.url,
              }
            : plugin
        )
      );
      setHasPendingChanges(true);
      setEditingPluginName(null);
      toast.success('插件更新成功');
    } catch {
      toast.error('更新插件出错');
    }
  };

  const getTestIcon = (status: TestStatus) => {
    if (status === 'testing') return <Loader2 className="w-4 h-4 animate-spin" />;
    if (status === 'success') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'error') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Zap className="w-4 h-4" />;
  };

  if (!isOpen) return null;

  const workspaceModal = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-5xl max-h-[88vh] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 via-blue-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      插件工作台
                      <Badge variant={isReadOnly ? 'outline' : 'success'}>
                        {isReadOnly ? '只读模式' : '编辑模式'}
                      </Badge>
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      统一检索、查看与操作插件状态
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"
                    aria-label="关闭插件管理"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </button>
                </div>

              </div>

              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {UNIFIED_STATUS_FILTER_OPTIONS.map(({ value, label }) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={statusFilter === value ? 'default' : 'outline'}
                      onClick={() => setStatusFilter(value)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                {!isReadOnly && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleBatchTogglePlugins(true)}
                        disabled={isOperationBusy || selectedCount === 0}
                        className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                      >
                        批量启用
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleBatchTogglePlugins(false)}
                        disabled={isOperationBusy || selectedCount === 0}
                      >
                        批量停用
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBatchDeleteConfirmOpen(true)}
                        disabled={isOperationBusy || selectedCount === 0}
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                      >
                        批量删除
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBatchTest}
                        disabled={isOperationBusy || localPlugins.length === 0}
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                      >
                        {isBatchTesting ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <PlayCircle className="w-4 h-4 mr-1" />
                        )}
                        批量测试
                      </Button>
                      <div className="ml-auto flex items-center gap-2">
                        {selectedCount > 0 && (
                          <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            已选 {selectedCount} 项
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleToggleSelectFiltered}
                          disabled={isOperationBusy || filteredItems.length === 0}
                          className="h-8 px-3 text-xs"
                        >
                          {isAllFilteredSelected ? '清空' : '全选'}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div ref={listContainerRef} className="flex-1 overflow-y-auto p-5">
                {pagedItems.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <Activity className="w-10 h-10 mx-auto mb-2 opacity-35" />
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
                          className="bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
                        >
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {!isReadOnly && (
                                <Checkbox
                                  checked={selectedPluginNames.has(plugin.name)}
                                  onCheckedChange={(checked) => selectKey(plugin.name, Boolean(checked))}
                                  aria-label={`选择插件 ${plugin.name}`}
                                  disabled={isOperationBusy}
                                />
                              )}
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${
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
                                <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{plugin.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{plugin.description || '无描述'}</p>
                              </div>
                            </div>

                            <div className="flex items-center flex-wrap gap-2">
                              <Badge variant="outline">优先级 {plugin.priority}</Badge>
                              <Badge className={pluginStatusBadgeClass(pluginStatus)}>{pluginStatusText(pluginStatus)}</Badge>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenDetail(plugin)}
                                className="h-8 px-2"
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                详情
                              </Button>

                              {!isReadOnly && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTestPlugin(plugin)}
                                    disabled={isOperationBusy || testingStatus[plugin.name] === 'testing'}
                                    className="h-8 px-2"
                                  >
                                    {getTestIcon(testingStatus[plugin.name] || 'idle')}
                                    <span className="ml-1">测试</span>
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTogglePluginEnabled(plugin)}
                                    aria-label={`切换插件 ${plugin.name} 状态`}
                                    disabled={isOperationBusy}
                                    className={`h-8 px-2 ${
                                      plugin.is_enabled
                                        ? 'text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20'
                                        : 'text-slate-500 border-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-700/50'
                                    }`}
                                  >
                                    {plugin.is_enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                  </Button>

                                  {plugin.plugin_type === 'custom' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEditDialog(plugin)}
                                        className="h-8 px-2"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDeleteConfirm({ open: true, pluginName: plugin.name })}
                                        aria-label={`删除插件 ${plugin.name}`}
                                        disabled={isOperationBusy}
                                        className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                      >
                                        <Trash2 className="w-4 h-4" />
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

              <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60">
                <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    共 {localPlugins.length} 个插件{!isReadOnly ? `，已选 ${selectedCount} 项` : ''}
                  </span>
                  {filteredItems.length > 0 && (
                    <ApplePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredItems.length}
                      pageSize={PAGE_SIZE}
                      onPageChange={setCurrentPage}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(workspaceModal, document.body)}

      <Dialog
        open={Boolean(activeDetailPlugin)}
        onOpenChange={(open) => {
          if (!open) setDetailPluginName(null);
        }}
      >
        <DialogContent className="max-w-lg">
          {activeDetailPlugin ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  {activeDetailPlugin.name}
                </DialogTitle>
                <DialogDescription>插件详情信息</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">类型</p>
                    <p className="font-medium">{activeDetailPlugin.plugin_type === 'custom' ? '自定义插件' : '内置插件'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">优先级</p>
                    <p className="font-medium">{activeDetailPlugin.priority}</p>
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">状态</p>
                  <Badge className={pluginStatusBadgeClass(resolvePluginStatus(activeDetailPlugin))}>
                    {pluginStatusText(resolvePluginStatus(activeDetailPlugin))}
                  </Badge>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">描述</p>
                  <p className="font-medium">{activeDetailPlugin.description || '无描述'}</p>
                </div>

                {activeDetailPlugin.url && (
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">URL</p>
                    <p className="font-medium break-all">{activeDetailPlugin.url}</p>
                  </div>
                )}
              </div>

              {!isReadOnly && activeDetailPlugin.plugin_type === 'custom' && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDetailPluginName(null);
                      openEditDialog(activeDetailPlugin);
                    }}
                  >
                    <Edit3 className="w-4 h-4 mr-1" />
                    编辑该插件
                  </Button>
                </DialogFooter>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(activeEditingPlugin)}
        onOpenChange={(open) => {
          if (!open) setEditingPluginName(null);
        }}
      >
        <DialogContent className="max-w-xl">
          {activeEditingPlugin ? (
            <>
              <DialogHeader>
                <DialogTitle>编辑插件</DialogTitle>
                <DialogDescription>{activeEditingPlugin.name}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>插件名称</Label>
                    <Input value={activeEditingPlugin.name} disabled className="bg-slate-100 dark:bg-slate-800" />
                  </div>
                  <div>
                    <Label>优先级</Label>
                    <Input
                      type="number"
                      value={editForm.priority}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          priority: Number.parseInt(event.target.value, 10) || 0,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>URL</Label>
                  <Input
                    value={editForm.url}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, url: event.target.value }))}
                    disabled={activeEditingPlugin.plugin_type !== 'custom'}
                  />
                </div>

                <div>
                  <Label>描述</Label>
                  <Input
                    value={editForm.description}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingPluginName(null)}>
                  取消
                </Button>
                <Button onClick={handleSaveEdit}>
                  <Save className="w-4 h-4 mr-1" />
                  保存
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => !open && setDeleteConfirm({ open: false, pluginName: null })}
        title="删除插件"
        description={`确定要删除插件 "${deleteConfirm.pluginName || ''}" 吗？`}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleConfirmDeletePlugin}
        isLoading={isBatchDeleting}
      />

      <ConfirmDialog
        open={batchDeleteConfirmOpen}
        onOpenChange={setBatchDeleteConfirmOpen}
        title="确认批量删除插件"
        description={`将删除 ${selectedCount} 个已选插件${selectedPluginPreviewText ? `（例如：${selectedPluginPreviewText}）` : ''}。内置插件会自动跳过。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleBatchDeletePlugins}
        isLoading={isBatchDeleting}
      />
    </>
  );
};
