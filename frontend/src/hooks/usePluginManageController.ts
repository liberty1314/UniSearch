import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  AdminTagListResponse,
  AdminTagOption,
  AdminTagScope,
  AdminDialogMode,
  BatchPluginOperationResponse,
  CreateAdminTagRequest,
  CreateAdminTagResponse,
  DeleteAdminTagResponse,
  PluginCatalogResponse,
  PluginInfo,
  UpdateAdminTagRequest,
  UpdateAdminTagResponse,
} from '@/types/api';
import { comparePlugins } from '@/components/admin/adminListSort';
import {
  applyBatchEnabledState,
  markPluginTestResult,
  updatePluginEnabledState,
} from '@/components/admin/pluginManageStateUtils';
import {
  matchesAnyTagFilter,
  normalizeSingleTagSelection,
  removeTagName,
  removeTagOption,
  replaceTagName,
  replaceTagOption,
} from '@/components/admin/adminTagUtils';
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
  toastBatchResult,
} from '@/components/admin/adminWorkspaceApi';
import {
  areAllFilteredSelected,
  buildSelectionPreviewText,
  replaceSelectedKeys,
} from '@/components/admin/workspaceSelection';
import { type TestStatus } from '@/components/admin/pluginManageDialogShared';
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
  detailPluginName: string | null;
  statusFilter: UnifiedStatusFilter;
  currentPage: number;
  pageSize: number;
  searchKeyword: string;
  filteredItems: PluginInfo[];
  pagedItems: PluginInfo[];
  totalPages: number;
  categoryFilter: string;
  capabilityFilter: string;
  availableCategories: string[];
  availableCapabilities: string[];
  tagOptions: AdminTagOption[];
  isTagOptionsLoading: boolean;
  isCreatingTag: boolean;
  updatingTagId: number | null;
  deletingTagId: number | null;
  selectedTagFilters: string[];
  selectedPluginNames: Set<string>;
  selectedCount: number;
  selectedPluginPreviewText: string;
  isAllFilteredSelected: boolean;
  activeDetailPlugin: PluginInfo | null;
  isOperationBusy: boolean;
  isCatalogLoading: boolean;
  catalogVersion: string;
  clearSelectedPlugins: () => void;
  setStatusFilter: (value: UnifiedStatusFilter) => void;
  setCurrentPage: (value: number) => void;
  setPageSize: (value: number) => void;
  setSearchKeyword: (value: string) => void;
  setCategoryFilter: (value: string) => void;
  setCapabilityFilter: (value: string) => void;
  setSelectedTagFilters: (value: string[]) => void;
  setDetailPluginName: (name: string | null) => void;
  selectKey: (name: string, checked: boolean) => void;
  handleClose: () => void;
  handleOpenDetail: (plugin: PluginInfo) => void;
  handleTestPlugin: (plugin: PluginInfo) => Promise<void>;
  handleBatchTest: () => Promise<void>;
  handleTogglePluginEnabled: (plugin: PluginInfo) => Promise<void>;
  handleBatchTogglePlugins: (isEnabled: boolean) => Promise<void>;
  handleToggleSelectFiltered: () => void;
  handleCreateTag: (name: string) => Promise<AdminTagOption | null>;
  handleUpdateTag: (id: number, name: string) => Promise<AdminTagOption | null>;
  handleDeleteTag: (id: number) => Promise<boolean>;
};

const PLUGIN_TAG_SCOPE: AdminTagScope = 'plugin';

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
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [capabilityFilter, setCapabilityFilter] = useState('all');
  const [tagOptions, setTagOptions] = useState<AdminTagOption[]>([]);
  const [isTagOptionsLoading, setIsTagOptionsLoading] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [updatingTagId, setUpdatingTagId] = useState<number | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<number | null>(null);
  const [selectedTagFilters, setSelectedTagFiltersState] = useState<string[]>([]);
  const [catalogVersion, setCatalogVersion] = useState('local');
  const [pageSize, setPageSize] = useState(10);
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

  const fetchCatalog = useCallback(async () => {
    setIsCatalogLoading(true);
    try {
      const response = await requestAuthedJson<PluginCatalogResponse>(
        '/api/admin/plugin-center/catalog?refresh=false',
        token,
        '获取插件中心目录失败'
      );
      setCatalogVersion(response.version || 'local');
      setLocalPlugins(response.items || []);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '获取插件中心目录出错'));
    } finally {
      setIsCatalogLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isOpen) return;
    void fetchCatalog();
  }, [fetchCatalog, isOpen]);

  const fetchTagOptions = useCallback(async () => {
    setIsTagOptionsLoading(true);
    try {
      const response = await requestAuthedJson<AdminTagListResponse>(
        `/api/admin/tags?scope=${PLUGIN_TAG_SCOPE}`,
        token,
        '获取插件标签词库失败'
      );
      setTagOptions(response.items || []);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '获取插件标签词库出错'));
    } finally {
      setIsTagOptionsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isOpen) return;
    void fetchTagOptions();
  }, [fetchTagOptions, isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setHasPendingChanges(false);
    clearTestingStatus();
    setCategoryFilter('all');
    setCapabilityFilter('all');
    setTagOptions([]);
    setSelectedTagFiltersState([]);
    setCatalogVersion('local');
  }, [clearTestingStatus, isOpen]);

  const dialogState = usePluginManageDialogState(isOpen, localPlugins);

  const availableCategories = useMemo(() => {
    const values = new Set<string>();
    localPlugins.forEach((plugin) => {
      if (plugin.category?.trim()) {
        values.add(plugin.category.trim());
      }
    });
    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [localPlugins]);

  const availableCapabilities = useMemo(() => {
    const values = new Set<string>();
    localPlugins.forEach((plugin) => {
      (plugin.capabilities || []).forEach((capability) => {
        if (capability.trim()) {
          values.add(capability.trim());
        }
      });
    });
    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [localPlugins]);

  const visiblePlugins = useMemo(() => localPlugins.filter((plugin) => {
    if (categoryFilter !== 'all' && plugin.category !== categoryFilter) {
      return false;
    }
    if (capabilityFilter !== 'all' && !(plugin.capabilities || []).includes(capabilityFilter)) {
      return false;
    }
    if (!matchesAnyTagFilter(plugin.tags, selectedTagFilters)) {
      return false;
    }
    return true;
  }), [capabilityFilter, categoryFilter, localPlugins, selectedTagFilters]);

  const getPluginKey = useCallback((plugin: PluginInfo) => plugin.name, []);
  const matchesPluginStatus = useCallback(
    (plugin: PluginInfo, filter: UnifiedStatusFilter) => isPluginMatchesStatusFilter(plugin, filter),
    []
  );

  const {
    searchKeyword,
    setSearchKeyword,
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
    items: visiblePlugins,
    getKey: getPluginKey,
    compareItems: comparePlugins,
    matchesKeyword: (plugin, keyword) => {
      if (!keyword) return true;
      const haystack = [
        plugin.name,
        plugin.description,
        plugin.category,
        plugin.author,
        plugin.homepage,
        ...(plugin.capabilities || []),
        ...(plugin.tags || []),
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    },
    matchesStatus: matchesPluginStatus,
    pageSize,
  });

  const isOperationBusy = isBatchTesting || isBatchUpdating;

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
    void fetchCatalog();
    resetKeyLater(plugin.name, 5000);
  }, [fetchCatalog, markResult, markTesting, onSuccess, resetKeyLater, token]);

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
    void fetchCatalog();
    resetAllLater(10000);
  }, [fetchCatalog, localPlugins, markBatchTesting, markResult, onSuccess, resetAllLater, token]);

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
      void fetchCatalog();
    } catch (error) {
      toast.error(getRequestErrorMessage(error, `插件 ${plugin.name} 状态更新出错`));
    }
  }, [fetchCatalog, isOperationBusy, token]);

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
      void fetchCatalog();
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '批量更新插件状态出错'));
    } finally {
      setIsBatchUpdating(false);
    }
  }, [fetchCatalog, selectedPluginNames, setSelectedPlugins, token]);

  const handleToggleSelectFiltered = useCallback(() => {
    if (isAllFilteredSelected) {
      clearSelected();
      return;
    }
    selectAllFiltered();
  }, [clearSelected, isAllFilteredSelected, selectAllFiltered]);

  const handleCreateTag = useCallback(async (name: string) => {
    setIsCreatingTag(true);
    try {
      const payload: CreateAdminTagRequest = {
        scope: PLUGIN_TAG_SCOPE,
        name,
      };
      const response = await requestAuthedJson<CreateAdminTagResponse>(
        '/api/admin/tags',
        token,
        '创建插件标签失败',
        {
          method: 'POST',
          body: payload,
        }
      );
      setTagOptions((prev) => [...prev, response.item].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN', { sensitivity: 'base' })));
      toast.success(`标签 ${response.item.name} 已创建`);
      return response.item;
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '创建插件标签出错'));
      return null;
    } finally {
      setIsCreatingTag(false);
    }
  }, [token]);

  const handleUpdateTag = useCallback(async (id: number, name: string) => {
    setUpdatingTagId(id);
    try {
      const payload: UpdateAdminTagRequest = { name };
      const response = await requestAuthedJson<UpdateAdminTagResponse>(
        `/api/admin/tags/${id}`,
        token,
        '更新插件标签失败',
        {
          method: 'PUT',
          body: payload,
        }
      );
      const currentOption = tagOptions.find((option) => option.id === id);
      const previousName = currentOption?.name || '';

      setTagOptions((prev) => replaceTagOption(prev, response.item));
      if (previousName) {
        setSelectedTagFiltersState((prev) => normalizeSingleTagSelection(replaceTagName(prev, previousName, response.item.name)));
        setLocalPlugins((prev) => prev.map((plugin) => ({
          ...plugin,
          tags: replaceTagName(plugin.tags || [], previousName, response.item.name),
        })));
      }
      toast.success('插件标签已更新');
      return response.item;
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '更新插件标签出错'));
      return null;
    } finally {
      setUpdatingTagId(null);
    }
  }, [tagOptions, token]);

  const handleDeleteTag = useCallback(async (id: number) => {
    setDeletingTagId(id);
    try {
      const currentOption = tagOptions.find((option) => option.id === id);
      await requestAuthedJson<DeleteAdminTagResponse>(
        `/api/admin/tags/${id}`,
        token,
        '删除插件标签失败',
        {
          method: 'DELETE',
        }
      );
      setTagOptions((prev) => removeTagOption(prev, id));
      if (currentOption) {
        setSelectedTagFiltersState((prev) => normalizeSingleTagSelection(removeTagName(prev, currentOption.name)));
        setLocalPlugins((prev) => prev.map((plugin) => ({
          ...plugin,
          tags: removeTagName(plugin.tags || [], currentOption.name),
        })));
      }
      toast.success('插件标签已删除');
      return true;
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '删除插件标签出错'));
      return false;
    } finally {
      setDeletingTagId(null);
    }
  }, [tagOptions, token]);

  const setSelectedTagFilters = useCallback((value: string[]) => {
    setSelectedTagFiltersState(value);
    setCurrentPage(1);
  }, [setCurrentPage]);

  return {
    isReadOnly,
    localPlugins,
    testingStatus,
    isBatchTesting,
    isBatchUpdating,
    detailPluginName: dialogState.detailPluginName,
    statusFilter,
    currentPage,
    searchKeyword,
    filteredItems,
    pagedItems,
    totalPages,
    pageSize,
    categoryFilter,
    capabilityFilter,
    availableCategories,
    availableCapabilities,
    tagOptions,
    isTagOptionsLoading,
    isCreatingTag,
    updatingTagId,
    deletingTagId,
    selectedTagFilters,
    selectedPluginNames,
    selectedCount,
    selectedPluginPreviewText,
    isAllFilteredSelected,
    activeDetailPlugin: dialogState.activeDetailPlugin,
    isOperationBusy,
    isCatalogLoading,
    catalogVersion,
    clearSelectedPlugins: clearSelected,
    setStatusFilter,
    setCurrentPage,
    setPageSize,
    setSearchKeyword,
    setCategoryFilter,
    setCapabilityFilter,
    setSelectedTagFilters,
    setDetailPluginName: dialogState.setDetailPluginName,
    selectKey,
    handleClose,
    handleOpenDetail: dialogState.handleOpenDetail,
    handleTestPlugin,
    handleBatchTest,
    handleTogglePluginEnabled,
    handleBatchTogglePlugins,
    handleToggleSelectFiltered,
    handleCreateTag,
    handleUpdateTag,
    handleDeleteTag,
  };
}
