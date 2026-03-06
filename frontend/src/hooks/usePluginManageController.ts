import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  AdminDialogMode,
  BatchPluginOperationResponse,
  CreatePluginRequest,
  PluginInfo,
  TestURLRequest,
  TestURLResponse,
} from '@/types/api';
import { comparePlugins } from '@/components/admin/adminListSort';
import {
  appendCustomPlugin,
  applyBatchEnabledState,
  markPluginTestResult,
  removePluginsByName,
  updateEditedPlugin,
  updatePluginEnabledState,
} from '@/components/admin/pluginManageStateUtils';
import {
  isPluginMatchesStatusFilter,
  type UnifiedStatusFilter,
} from '@/components/admin/previewFilters';
import { useAdminWorkspaceState } from '@/components/admin/useAdminWorkspaceState';
import {
  buildAuthHeaders,
  getRequestErrorMessage,
  requestAuthed,
  requestAuthedJson,
  readErrorMessage,
  toastBatchResult,
} from '@/components/admin/adminWorkspaceApi';
import {
  areAllFilteredSelected,
  buildSelectionPreviewText,
  replaceSelectedKeys,
} from '@/components/admin/workspaceSelection';
import {
  PAGE_SIZE,
  type AddPluginForm,
  type EditPluginForm,
  type TestStatus,
  type URLTestStatus,
} from '@/components/admin/pluginManageDialogShared';
import { usePluginManageDialogState } from './usePluginManageDialogState';
import { useWorkspaceTestStatus } from './useWorkspaceTestStatus';

type UsePluginManageControllerOptions = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  plugins: PluginInfo[];
  mode: AdminDialogMode;
};

export type UsePluginManageControllerResult = {
  isReadOnly: boolean;
  localPlugins: PluginInfo[];
  testingStatus: Record<string, TestStatus>;
  isBatchTesting: boolean;
  isBatchUpdating: boolean;
  isBatchDeleting: boolean;
  isAdding: boolean;
  isTestingUrl: boolean;
  addDialogOpen: boolean;
  addForm: AddPluginForm;
  urlTestResult: URLTestStatus;
  urlTestMessage: string;
  detailPluginName: string | null;
  editingPluginName: string | null;
  editForm: EditPluginForm;
  deleteConfirm: { open: boolean; pluginName: string | null };
  batchDeleteConfirmOpen: boolean;
  statusFilter: UnifiedStatusFilter;
  currentPage: number;
  filteredItems: PluginInfo[];
  pagedItems: PluginInfo[];
  totalPages: number;
  selectedPluginNames: Set<string>;
  selectedCount: number;
  selectedPluginPreviewText: string;
  isAllFilteredSelected: boolean;
  activeDetailPlugin: PluginInfo | null;
  activeEditingPlugin: PluginInfo | null;
  isOperationBusy: boolean;
  setStatusFilter: (value: UnifiedStatusFilter) => void;
  setCurrentPage: (value: number) => void;
  setAddDialogOpen: (open: boolean) => void;
  setAddForm: React.Dispatch<React.SetStateAction<AddPluginForm>>;
  setUrlTestResult: (status: URLTestStatus) => void;
  setUrlTestMessage: (message: string) => void;
  setDetailPluginName: (name: string | null) => void;
  setEditingPluginName: (name: string | null) => void;
  setEditForm: React.Dispatch<React.SetStateAction<EditPluginForm>>;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<{ open: boolean; pluginName: string | null }>>;
  setBatchDeleteConfirmOpen: (open: boolean) => void;
  selectKey: (name: string, checked: boolean) => void;
  resetAddDialogState: () => void;
  handleClose: () => void;
  openAddDialog: () => void;
  openEditDialog: (plugin: PluginInfo) => void;
  handleOpenDetail: (plugin: PluginInfo) => void;
  handleAddFormKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  handleTestAddPluginURL: () => Promise<void>;
  handleAddPlugin: () => Promise<void>;
  handleTestPlugin: (plugin: PluginInfo) => Promise<void>;
  handleBatchTest: () => Promise<void>;
  handleTogglePluginEnabled: (plugin: PluginInfo) => Promise<void>;
  handleBatchTogglePlugins: (isEnabled: boolean) => Promise<void>;
  handleToggleSelectFiltered: () => void;
  handleConfirmDeletePlugin: () => Promise<void>;
  handleBatchDeletePlugins: () => Promise<void>;
  handleSaveEdit: () => Promise<void>;
};

export function usePluginManageController({
  isOpen,
  onClose,
  onSuccess,
  token,
  plugins,
  mode,
}: UsePluginManageControllerOptions): UsePluginManageControllerResult {
  const isReadOnly = mode === 'view';
  const [localPlugins, setLocalPlugins] = useState<PluginInfo[]>(plugins);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const {
    testingStatus,
    clearTestingStatus,
    clearTestingTimers,
    markTesting,
    markBatchTesting,
    markResult,
    resetKeyLater,
    resetAllLater,
  } = useWorkspaceTestStatus<TestStatus>();

  useEffect(() => {
    setLocalPlugins(plugins);
  }, [plugins]);

  useEffect(() => {
    if (isOpen) return;
    setHasPendingChanges(false);
    clearTestingStatus();
    setIsAdding(false);
    setIsTestingUrl(false);
  }, [clearTestingStatus, isOpen]);

  const dialogState = usePluginManageDialogState(isOpen, localPlugins, isReadOnly);

  const getPluginKey = useCallback((plugin: PluginInfo) => plugin.name, []);
  const matchesPluginStatus = useCallback(
    (plugin: PluginInfo, filter: UnifiedStatusFilter) => isPluginMatchesStatusFilter(plugin, filter),
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

  const isOperationBusy = isBatchTesting || isBatchUpdating || isBatchDeleting || isAdding;

  const selectedPluginPreviewText = useMemo(
    () => buildSelectionPreviewText(orderedItems, selectedPluginNames, (plugin) => plugin.name, (plugin) => plugin.name),
    [orderedItems, selectedPluginNames]
  );

  const isAllFilteredSelected = useMemo(
    () => areAllFilteredSelected(filteredItems, selectedPluginNames, (plugin) => plugin.name),
    [filteredItems, selectedPluginNames]
  );

  const handleClose = useCallback(() => {
    clearTestingTimers();
    if (hasPendingChanges) {
      onSuccess();
      setHasPendingChanges(false);
    }
    onClose();
  }, [clearTestingTimers, hasPendingChanges, onClose, onSuccess]);

  const handleAddPlugin = useCallback(async () => {
    const normalizedName = dialogState.addForm.name.trim();
    const normalizedURL = dialogState.addForm.url.trim();

    if (!normalizedName) {
      toast.error('请输入插件名称');
      return;
    }
    if (!normalizedURL) {
      toast.error('请输入插件 URL');
      return;
    }

    const duplicated = localPlugins.some(
      (plugin) => plugin.name.trim().toLowerCase() === normalizedName.toLowerCase()
    );
    if (duplicated) {
      toast.error('插件名称已存在，请更换名称');
      return;
    }

    setIsAdding(true);
    try {
      const payload: CreatePluginRequest = {
        name: normalizedName,
        url: normalizedURL,
        priority: dialogState.addForm.priority,
        description: dialogState.addForm.description.trim(),
      };

      await requestAuthed('/api/admin/plugins', token, '添加插件失败', {
        method: 'POST',
        body: payload,
      });

      setLocalPlugins((prev) =>
        appendCustomPlugin(prev, {
          name: normalizedName,
          url: normalizedURL,
          priority: dialogState.addForm.priority,
          description: dialogState.addForm.description.trim(),
        })
      );
      setStatusFilter('all');
      setCurrentPage(1);
      setHasPendingChanges(true);
      toast.success(`插件 ${normalizedName} 添加成功`);
      dialogState.resetAddDialogState();
      onSuccess();
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '添加插件出错'));
    } finally {
      setIsAdding(false);
    }
  }, [dialogState, localPlugins, onSuccess, setCurrentPage, setStatusFilter, token]);

  const handleAddFormKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    if (isAdding || !dialogState.addForm.name.trim() || !dialogState.addForm.url.trim()) return;
    event.preventDefault();
    void handleAddPlugin();
  }, [dialogState.addForm.name, dialogState.addForm.url, handleAddPlugin, isAdding]);

  const handleTestAddPluginURL = useCallback(async () => {
    const normalizedURL = dialogState.addForm.url.trim();
    if (!normalizedURL) {
      toast.error('请输入插件 URL');
      return;
    }

    setIsTestingUrl(true);
    dialogState.setUrlTestResult('idle');
    dialogState.setUrlTestMessage('');
    try {
      const payload: TestURLRequest = { url: normalizedURL };
      const response = await fetch('/api/admin/test-url', {
        method: 'POST',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await readErrorMessage(response, 'URL 连通性测试失败');
        dialogState.setUrlTestResult('error');
        dialogState.setUrlTestMessage(message);
        toast.error(message);
        return;
      }

      const result = (await response.json()) as TestURLResponse;
      if (result.success) {
        const message = result.message || 'URL 连通性测试成功';
        dialogState.setUrlTestResult('success');
        dialogState.setUrlTestMessage(message);
        toast.success(message);
        return;
      }

      const message = result.error || result.message || 'URL 连通性测试失败';
      dialogState.setUrlTestResult('error');
      dialogState.setUrlTestMessage(message);
      toast.error(message);
    } catch {
      dialogState.setUrlTestResult('error');
      dialogState.setUrlTestMessage('URL 连通性测试出错');
      toast.error('URL 连通性测试出错');
    } finally {
      setIsTestingUrl(false);
    }
  }, [dialogState, token]);

  const handleTestPlugin = useCallback(async (plugin: PluginInfo) => {
    markTesting(plugin.name);

    try {
      const response = await fetch(`/api/admin/plugins/${plugin.name}/test`, {
        method: 'POST',
        headers: buildAuthHeaders(token, true),
      });

      if (response.ok) {
        markResult(plugin.name, 'success');
        setLocalPlugins((prev) => markPluginTestResult(prev, plugin.name, true));
        toast.success(`插件 ${plugin.name} 连通性测试成功`);
      } else {
        markResult(plugin.name, 'error');
        setLocalPlugins((prev) => markPluginTestResult(prev, plugin.name, false));
        toast.error(`插件 ${plugin.name} 连通性测试失败`);
      }
    } catch {
      markResult(plugin.name, 'error');
      setLocalPlugins((prev) => markPluginTestResult(prev, plugin.name, false));
      toast.error(`插件 ${plugin.name} 测试出错`);
    }

    onSuccess();
    resetKeyLater(plugin.name, 5000);
  }, [markResult, markTesting, onSuccess, resetKeyLater, token]);

  const handleBatchTest = useCallback(async () => {
    const enabledPlugins = localPlugins.filter((plugin) => plugin.is_enabled);
    if (enabledPlugins.length === 0) {
      toast.error('没有已启用的插件可供测试');
      return;
    }

    setIsBatchTesting(true);
    markBatchTesting(enabledPlugins.map((plugin) => plugin.name));

    const results = await Promise.allSettled(
      enabledPlugins.map(async (plugin) => {
        try {
          const response = await fetch(`/api/admin/plugins/${plugin.name}/test`, {
            method: 'POST',
            headers: buildAuthHeaders(token, true),
          });
          const ok = response.ok;

          markResult(plugin.name, ok ? 'success' : 'error');

          setLocalPlugins((prev) => markPluginTestResult(prev, plugin.name, ok));

          return { name: plugin.name, ok };
        } catch {
          markResult(plugin.name, 'error');
          setLocalPlugins((prev) => markPluginTestResult(prev, plugin.name, false));
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
    resetAllLater(10000);
  }, [localPlugins, markBatchTesting, markResult, onSuccess, resetAllLater, token]);

  const handleTogglePluginEnabled = useCallback(async (plugin: PluginInfo) => {
    if (isOperationBusy) return;
    const nextEnabled = !plugin.is_enabled;

    try {
      await requestAuthed(
        `/api/admin/plugins/${plugin.name}/status`,
        token,
        `插件 ${plugin.name} 状态更新失败`,
        {
        method: 'POST',
          body: { is_enabled: nextEnabled },
        }
      );

      setLocalPlugins((prev) => updatePluginEnabledState(prev, plugin.name, nextEnabled));
      setHasPendingChanges(true);
      toast.success(`插件 ${plugin.name} 已${nextEnabled ? '启用' : '停用'}`);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, `插件 ${plugin.name} 状态更新出错`));
    }
  }, [isOperationBusy, token]);

  const setSelectedPlugins = useCallback((nextSelected: Set<string>) => {
    replaceSelectedKeys(clearSelected, selectKey, nextSelected);
  }, [clearSelected, selectKey]);

  const handleBatchTogglePlugins = useCallback(async (isEnabled: boolean) => {
    if (selectedPluginNames.size === 0) {
      toast.error('请先选择要操作的插件');
      return;
    }

    setIsBatchUpdating(true);
    try {
      const result = await requestAuthedJson<BatchPluginOperationResponse>(
        '/api/admin/plugins/batch-status',
        token,
        '批量更新插件状态失败',
        {
        method: 'POST',
          body: {
          plugin_names: Array.from(selectedPluginNames),
          is_enabled: isEnabled,
          },
        }
      );
      const successSet = new Set(result.success ?? []);
      const failedSet = new Set((result.failed ?? []).map((item) => item.plugin_name));

      if (successSet.size > 0) {
        setLocalPlugins((prev) => applyBatchEnabledState(prev, successSet, isEnabled));
        setHasPendingChanges(true);
      }

      setSelectedPlugins(failedSet);
      toastBatchResult(`批量${isEnabled ? '启用' : '停用'}`, result);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '批量更新插件状态出错'));
    } finally {
      setIsBatchUpdating(false);
    }
  }, [selectedPluginNames, setSelectedPlugins, token]);

  const handleToggleSelectFiltered = useCallback(() => {
    if (isAllFilteredSelected) {
      clearSelected();
      return;
    }
    selectAllFiltered();
  }, [clearSelected, isAllFilteredSelected, selectAllFiltered]);

  const handleConfirmDeletePlugin = useCallback(async () => {
    const pluginName = dialogState.deleteConfirm.pluginName;
    if (!pluginName) return;

    setIsBatchDeleting(true);
    try {
      await requestAuthed(`/api/admin/plugins/${pluginName}`, token, '删除插件失败', {
        method: 'DELETE',
      });

      setLocalPlugins((prev) => removePluginsByName(prev, new Set([pluginName])));
      selectKey(pluginName, false);
      setHasPendingChanges(true);
      toast.success(`插件 ${pluginName} 已删除`);
      dialogState.setDeleteConfirm({ open: false, pluginName: null });
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '删除插件出错'));
    } finally {
      setIsBatchDeleting(false);
    }
  }, [dialogState, selectKey, token]);

  const handleBatchDeletePlugins = useCallback(async () => {
    if (selectedPluginNames.size === 0) {
      toast.error('请先选择要删除的插件');
      return;
    }

    setIsBatchDeleting(true);
    try {
      const result = await requestAuthedJson<BatchPluginOperationResponse>(
        '/api/admin/plugins/batch-delete',
        token,
        '批量删除插件失败',
        {
        method: 'POST',
          body: {
          plugin_names: Array.from(selectedPluginNames),
          },
        }
      );
      const successSet = new Set(result.success ?? []);
      const failedSet = new Set((result.failed ?? []).map((item) => item.plugin_name));

      if (successSet.size > 0) {
        setLocalPlugins((prev) => removePluginsByName(prev, successSet));
        setHasPendingChanges(true);
      }

      setSelectedPlugins(failedSet);
      dialogState.setBatchDeleteConfirmOpen(false);
      toastBatchResult('批量删除', result);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '批量删除插件出错'));
    } finally {
      setIsBatchDeleting(false);
    }
  }, [dialogState, selectedPluginNames, setSelectedPlugins, token]);

  const handleSaveEdit = useCallback(async () => {
    if (!dialogState.editingPluginName) return;

    try {
      await requestAuthed(
        `/api/admin/plugins/${dialogState.editingPluginName}`,
        token,
        '更新插件失败',
        {
        method: 'PUT',
          body: dialogState.editForm,
        }
      );

      setLocalPlugins((prev) =>
        updateEditedPlugin(prev, dialogState.editingPluginName!, dialogState.editForm)
      );
      setHasPendingChanges(true);
      dialogState.setEditingPluginName(null);
      toast.success('插件更新成功');
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '更新插件出错'));
    }
  }, [dialogState, token]);

  return {
    isReadOnly,
    localPlugins,
    testingStatus,
    isBatchTesting,
    isBatchUpdating,
    isBatchDeleting,
    isAdding,
    isTestingUrl,
    addDialogOpen: dialogState.addDialogOpen,
    addForm: dialogState.addForm,
    urlTestResult: dialogState.urlTestResult,
    urlTestMessage: dialogState.urlTestMessage,
    detailPluginName: dialogState.detailPluginName,
    editingPluginName: dialogState.editingPluginName,
    editForm: dialogState.editForm,
    deleteConfirm: dialogState.deleteConfirm,
    batchDeleteConfirmOpen: dialogState.batchDeleteConfirmOpen,
    statusFilter,
    currentPage,
    filteredItems,
    pagedItems,
    totalPages,
    selectedPluginNames,
    selectedCount,
    selectedPluginPreviewText,
    isAllFilteredSelected,
    activeDetailPlugin: dialogState.activeDetailPlugin,
    activeEditingPlugin: dialogState.activeEditingPlugin,
    isOperationBusy,
    setStatusFilter,
    setCurrentPage,
    setAddDialogOpen: dialogState.setAddDialogOpen,
    setAddForm: dialogState.setAddForm,
    setUrlTestResult: dialogState.setUrlTestResult,
    setUrlTestMessage: dialogState.setUrlTestMessage,
    setDetailPluginName: dialogState.setDetailPluginName,
    setEditingPluginName: dialogState.setEditingPluginName,
    setEditForm: dialogState.setEditForm,
    setDeleteConfirm: dialogState.setDeleteConfirm,
    setBatchDeleteConfirmOpen: dialogState.setBatchDeleteConfirmOpen,
    selectKey,
    resetAddDialogState: dialogState.resetAddDialogState,
    handleClose,
    openAddDialog: dialogState.openAddDialog,
    openEditDialog: dialogState.openEditDialog,
    handleOpenDetail: dialogState.handleOpenDetail,
    handleAddFormKeyDown,
    handleTestAddPluginURL,
    handleAddPlugin,
    handleTestPlugin,
    handleBatchTest,
    handleTogglePluginEnabled,
    handleBatchTogglePlugins,
    handleToggleSelectFiltered,
    handleConfirmDeletePlugin,
    handleBatchDeletePlugins,
    handleSaveEdit,
  };
}
