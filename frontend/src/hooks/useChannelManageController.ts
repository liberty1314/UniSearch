import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  AdminTagListResponse,
  AdminTagOption,
  AdminTagScope,
  AdminDialogMode,
  BatchChannelOperationResponse,
  CreateAdminTagRequest,
  CreateAdminTagResponse,
  DeleteAdminTagResponse,
  ListTGChannelsResponse,
  TGChannel,
  UpdateAdminTagRequest,
  UpdateAdminTagResponse,
} from '@/types/api';
import { compareChannels } from '@/components/admin/adminListSort';
import {
  applyBatchChannelEnabledState,
  removeChannelsById,
  updateChannelEnabledState,
} from '@/components/admin/channelManageStateUtils';
import {
  type ChannelTestStatus,
} from '@/components/admin/channelManageDialogShared';
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
import {
  isChannelMatchesStatusFilter,
  type UnifiedStatusFilter,
} from '@/components/admin/previewFilters';
import { useAdminWorkspaceState } from '@/components/admin/useAdminWorkspaceState';
import { useWorkspaceTestStatus } from './useWorkspaceTestStatus';
import {
  matchesAnyTagFilter,
  normalizeSingleTagSelection,
  removeTagName,
  removeTagOption,
  replaceTagName,
  replaceTagOption,
} from '@/components/admin/adminTagUtils';

const CHANNEL_TAG_SCOPE: AdminTagScope = 'channel';

type UseChannelManageControllerOptions = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  mode: AdminDialogMode;
};

export type UseChannelManageControllerResult = {
  isReadOnly: boolean;
  channels: TGChannel[];
  loading: boolean;
  testingStatus: Record<string, ChannelTestStatus>;
  deletingIds: Set<number>;
  isAdding: boolean;
  isBatchTesting: boolean;
  isBatchUpdating: boolean;
  isBatchDeleting: boolean;
  addDialogOpen: boolean;
  newChannelName: string;
  newChannelTags: string[];
  detailChannelId: number | null;
  deleteConfirm: { open: boolean; channel: TGChannel | null };
  batchDeleteConfirmOpen: boolean;
  searchKeyword: string;
  statusFilter: UnifiedStatusFilter;
  currentPage: number;
  pageSize: number;
  tagOptions: AdminTagOption[];
  isTagOptionsLoading: boolean;
  isCreatingTag: boolean;
  updatingTagId: number | null;
  deletingTagId: number | null;
  selectedTagFilters: string[];
  filteredItems: TGChannel[];
  pagedItems: TGChannel[];
  totalPages: number;
  selectedChannelIds: Set<number>;
  selectedCount: number;
  selectedChannelPreviewText: string;
  isAllFilteredSelected: boolean;
  activeDetailChannel: TGChannel | null;
  isOperationBusy: boolean;
  fetchChannels: () => Promise<void>;
  clearSelectedChannels: () => void;
  setPageSize: (value: number) => void;
  setSearchKeyword: (value: string) => void;
  setStatusFilter: (value: UnifiedStatusFilter) => void;
  setSelectedTagFilters: (value: string[]) => void;
  setCurrentPage: (page: number) => void;
  setAddDialogOpen: (open: boolean) => void;
  setNewChannelName: (value: string) => void;
  setNewChannelTags: (value: string[]) => void;
  setDetailChannelId: (id: number | null) => void;
  setDeleteConfirm: React.Dispatch<React.SetStateAction<{ open: boolean; channel: TGChannel | null }>>;
  setBatchDeleteConfirmOpen: (open: boolean) => void;
  selectKey: (id: number, checked: boolean) => void;
  handleClose: () => void;
  handleToggleSelectFiltered: () => void;
  handleAddChannel: () => Promise<void>;
  handleToggleEnabled: (channel: TGChannel) => Promise<void>;
  handleBatchToggleChannels: (isEnabled: boolean) => Promise<void>;
  handleDeleteChannel: () => Promise<void>;
  handleBatchDeleteChannels: () => Promise<void>;
  handleTestChannel: (channelName: string) => Promise<void>;
  handleQuickTest: () => Promise<void>;
  handleBatchTest: () => Promise<void>;
  channelTagsInput: string[];
  setChannelTagsInput: (value: string[]) => void;
  isSavingTags: boolean;
  handleSaveChannelTags: () => Promise<void>;
  handleCreateTag: (name: string) => Promise<AdminTagOption | null>;
  handleUpdateTag: (id: number, name: string) => Promise<AdminTagOption | null>;
  handleDeleteTag: (id: number) => Promise<boolean>;
};

export function useChannelManageController({
  isOpen,
  onClose,
  onSuccess,
  token,
  mode,
}: UseChannelManageControllerOptions): UseChannelManageControllerResult {
  const isReadOnly = mode === 'view';
  const [channels, setChannels] = useState<TGChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [isAdding, setIsAdding] = useState(false);
  const [isBatchTesting, setIsBatchTesting] = useState(false);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTags, setNewChannelTags] = useState<string[]>([]);
  const [detailChannelId, setDetailChannelId] = useState<number | null>(null);
  const [channelTagsInput, setChannelTagsInput] = useState<string[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [tagOptions, setTagOptions] = useState<AdminTagOption[]>([]);
  const [isTagOptionsLoading, setIsTagOptionsLoading] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [updatingTagId, setUpdatingTagId] = useState<number | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<number | null>(null);
  const [selectedTagFilters, setSelectedTagFiltersState] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; channel: TGChannel | null }>({
    open: false,
    channel: null,
  });
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
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
  } = useWorkspaceTestStatus<ChannelTestStatus>();

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestAuthedJson<ListTGChannelsResponse>(
        '/api/admin/channels',
        token,
        '获取频道列表失败'
      );
      setChannels(Array.isArray(data.channels) ? data.channels : []);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '获取频道列表出错'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isOpen) return;
    void fetchChannels();
  }, [fetchChannels, isOpen]);

  const fetchTagOptions = useCallback(async () => {
    setIsTagOptionsLoading(true);
    try {
      const response = await requestAuthedJson<AdminTagListResponse>(
        `/api/admin/tags?scope=${CHANNEL_TAG_SCOPE}`,
        token,
        '获取频道标签词库失败'
      );
      setTagOptions(response.items || []);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '获取频道标签词库出错'));
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
    clearTestingStatus();
    setDeletingIds(new Set());
    setAddDialogOpen(false);
    setNewChannelName('');
    setNewChannelTags([]);
    setDetailChannelId(null);
    setChannelTagsInput([]);
    setTagOptions([]);
    setSelectedTagFiltersState([]);
    setDeleteConfirm({ open: false, channel: null });
    setBatchDeleteConfirmOpen(false);
    setHasPendingChanges(false);
  }, [clearTestingStatus, isOpen]);

  const getChannelKey = useCallback((channel: TGChannel) => channel.id, []);
  const matchesChannelStatus = useCallback(
    (channel: TGChannel, filter: UnifiedStatusFilter) =>
      isChannelMatchesStatusFilter(channel, filter),
    []
  );

  const visibleChannels = useMemo(
    () => channels.filter((channel) => matchesAnyTagFilter(channel.tags, selectedTagFilters)),
    [channels, selectedTagFilters]
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
    selectedKeys: selectedChannelIds,
    selectedCount,
    selectKey,
    selectAllFiltered,
    clearSelected,
    orderedItems,
  } = useAdminWorkspaceState<TGChannel, number>({
    isOpen,
    items: visibleChannels,
    getKey: getChannelKey,
    compareItems: compareChannels,
    matchesKeyword: (channel, keyword) => {
      if (!keyword) return true;
      return [
        channel.name,
        channel.last_error || '',
        channel.health_status || '',
        ...(channel.tags || []),
      ].some((value) => value.toLowerCase().includes(keyword));
    },
    matchesStatus: matchesChannelStatus,
    pageSize,
  });

  const selectedChannelPreviewText = useMemo(
    () => buildSelectionPreviewText(orderedItems, selectedChannelIds, (channel) => channel.id, (channel) => channel.name),
    [orderedItems, selectedChannelIds]
  );

  const isAllFilteredSelected = useMemo(
    () => areAllFilteredSelected(filteredItems, selectedChannelIds, (channel) => channel.id),
    [filteredItems, selectedChannelIds]
  );

  const activeDetailChannel = useMemo(
    () => channels.find((channel) => channel.id === detailChannelId) || null,
    [channels, detailChannelId]
  );

  useEffect(() => {
    setChannelTagsInput(normalizeSingleTagSelection(activeDetailChannel?.tags || []));
  }, [activeDetailChannel]);

  const isOperationBusy = isBatchTesting || isBatchUpdating || isBatchDeleting || isAdding;

  const setSelectedChannels = useCallback((nextSelected: Set<number>) => {
    replaceSelectedKeys(clearSelected, selectKey, nextSelected);
  }, [clearSelected, selectKey]);

  const handleToggleSelectFiltered = useCallback(() => {
    if (isAllFilteredSelected) {
      clearSelected();
      return;
    }
    selectAllFiltered();
  }, [clearSelected, isAllFilteredSelected, selectAllFiltered]);

  const handleClose = useCallback(() => {
    clearTestingTimers();
    if (hasPendingChanges) {
      onSuccess();
      setHasPendingChanges(false);
    }
    onClose();
  }, [clearTestingTimers, hasPendingChanges, onClose, onSuccess]);

  const handleAddChannel = useCallback(async () => {
    const name = newChannelName.trim();
    if (!name) {
      toast.error('请输入频道名称');
      return;
    }

    setIsAdding(true);
    try {
      await requestAuthed('/api/admin/channels', token, '添加频道失败', {
        method: 'POST',
        body: { name, tags: normalizeSingleTagSelection(newChannelTags) },
      });

      toast.success(`频道 ${name} 添加成功`);
      setNewChannelName('');
      setNewChannelTags([]);
      setAddDialogOpen(false);
      await fetchChannels();
      setHasPendingChanges(true);
      onSuccess();
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '添加频道出错'));
    } finally {
      setIsAdding(false);
    }
  }, [fetchChannels, newChannelName, newChannelTags, onSuccess, token]);

  const handleToggleEnabled = useCallback(async (channel: TGChannel) => {
    if (isOperationBusy) return;

    const nextEnabled = !channel.is_enabled;
    try {
      await requestAuthed(
        `/api/admin/channels/${channel.id}`,
        token,
        '更新频道失败',
        {
        method: 'PUT',
          body: { is_enabled: nextEnabled },
        }
      );

      setChannels((prev) => updateChannelEnabledState(prev, channel.id, nextEnabled));
      setHasPendingChanges(true);
      toast.success(`频道 ${channel.name} 已${nextEnabled ? '启用' : '禁用'}`);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '更新频道出错'));
    }
  }, [isOperationBusy, token]);

  const handleBatchToggleChannels = useCallback(async (isEnabled: boolean) => {
    if (selectedChannelIds.size === 0) {
      toast.error('请先选择要操作的频道');
      return;
    }

    setIsBatchUpdating(true);
    try {
      const result = await requestAuthedJson<BatchChannelOperationResponse>(
        '/api/admin/channels/batch-status',
        token,
        '批量更新频道状态失败',
        {
        method: 'POST',
          body: {
          channel_ids: Array.from(selectedChannelIds),
          is_enabled: isEnabled,
          },
        }
      );
      const successSet = new Set(result.success ?? []);
      const failedSet = new Set((result.failed ?? []).map((item) => item.channel_id));

      if (successSet.size > 0) {
        setChannels((prev) => applyBatchChannelEnabledState(prev, successSet, isEnabled));
        setHasPendingChanges(true);
      }

      setSelectedChannels(failedSet);
      toastBatchResult(`批量${isEnabled ? '启用' : '停用'}`, result);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '批量更新频道状态出错'));
    } finally {
      setIsBatchUpdating(false);
    }
  }, [selectedChannelIds, setSelectedChannels, token]);

  const handleDeleteChannel = useCallback(async () => {
    const channel = deleteConfirm.channel;
    if (!channel) return;

    setDeletingIds((prev) => new Set(prev).add(channel.id));
    try {
      await requestAuthed(`/api/admin/channels/${channel.id}`, token, '删除频道失败', {
        method: 'DELETE',
      });

      toast.success(`频道 ${channel.name} 已删除`);
      setChannels((prev) => removeChannelsById(prev, new Set([channel.id])));
      selectKey(channel.id, false);
      setDeleteConfirm({ open: false, channel: null });
      setHasPendingChanges(true);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '删除频道出错'));
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(channel.id);
        return next;
      });
    }
  }, [deleteConfirm.channel, selectKey, token]);

  const handleBatchDeleteChannels = useCallback(async () => {
    if (selectedChannelIds.size === 0) {
      toast.error('请先选择要删除的频道');
      return;
    }

    setIsBatchDeleting(true);
    try {
      const result = await requestAuthedJson<BatchChannelOperationResponse>(
        '/api/admin/channels/batch-delete',
        token,
        '批量删除频道失败',
        {
        method: 'POST',
          body: { channel_ids: Array.from(selectedChannelIds) },
        }
      );
      const successSet = new Set(result.success ?? []);
      const failedSet = new Set((result.failed ?? []).map((item) => item.channel_id));

      if (successSet.size > 0) {
        setChannels((prev) => removeChannelsById(prev, successSet));
        setHasPendingChanges(true);
      }

      setSelectedChannels(failedSet);
      setBatchDeleteConfirmOpen(false);
      toastBatchResult('批量删除', result);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '批量删除频道出错'));
    } finally {
      setIsBatchDeleting(false);
    }
  }, [selectedChannelIds, setSelectedChannels, token]);

  const handleTestChannel = useCallback(async (channelName: string) => {
    markTesting(channelName);

    try {
      const response = await fetch(`/api/admin/channels/${channelName}/test`, {
        method: 'POST',
        headers: buildAuthHeaders(token),
      });

      const data = (await response.json()) as { accessible?: boolean; error?: string };
      const ok = response.ok && Boolean(data.accessible);
      markResult(channelName, ok ? 'success' : 'error');

      if (ok) {
        toast.success(`频道 ${channelName} 可访问`);
      } else {
        toast.error(`频道 ${channelName} 不可访问`, {
          description: data.error || '频道可能不存在或已被限制',
        });
      }

      await fetchChannels();
      onSuccess();
      setHasPendingChanges(true);
    } catch {
      markResult(channelName, 'error');
      toast.error(`测试频道 ${channelName} 出错`);
    }

    resetKeyLater(channelName, 5000);
  }, [fetchChannels, markResult, markTesting, onSuccess, resetKeyLater, token]);

  const runChannelTests = useCallback(async (targetChannels: TGChannel[], emptyMessage: string) => {
    if (targetChannels.length === 0) {
      toast.error(emptyMessage);
      return;
    }

    setIsBatchTesting(true);
    markBatchTesting(targetChannels.map((channel) => channel.name));

    const results = await Promise.allSettled(
      targetChannels.map(async (channel) => {
        try {
          const response = await fetch(`/api/admin/channels/${channel.name}/test`, {
            method: 'POST',
            headers: buildAuthHeaders(token),
          });
          const data = (await response.json()) as { accessible?: boolean };
          const ok = response.ok && Boolean(data.accessible);
          markResult(channel.name, ok ? 'success' : 'error');
          return ok;
        } catch {
          markResult(channel.name, 'error');
          return false;
        }
      })
    );

    const successCount = results.filter((item) => item.status === 'fulfilled' && item.value).length;
    const failCount = targetChannels.length - successCount;

    if (failCount === 0) {
      toast.success(`全部 ${successCount} 个频道可访问`);
    } else {
      toast.warning(`${successCount} 个可访问，${failCount} 个不可访问`);
    }

    setIsBatchTesting(false);
    await fetchChannels();
    onSuccess();
    setHasPendingChanges(true);

    resetAllLater(10000);
  }, [fetchChannels, markBatchTesting, markResult, onSuccess, resetAllLater, token]);

  const handleQuickTest = useCallback(async () => {
    const enabledChannels = channels.filter((channel) => channel.is_enabled);
    await runChannelTests(enabledChannels, '没有已启用的频道可供测试');
  }, [channels, runChannelTests]);

  const handleBatchTest = useCallback(async () => {
    const selectedEnabledChannels = channels.filter(
      (channel) => selectedChannelIds.has(channel.id) && channel.is_enabled
    );
    await runChannelTests(selectedEnabledChannels, '选中的频道中没有可测试的启用项');
  }, [channels, runChannelTests, selectedChannelIds]);

  const handleSaveChannelTags = useCallback(async () => {
    if (!activeDetailChannel) {
      return;
    }

    setIsSavingTags(true);
    try {
      const nextTags = normalizeSingleTagSelection(channelTagsInput);
      await requestAuthed(
        `/api/admin/channels/${activeDetailChannel.id}`,
        token,
        '更新频道标签失败',
        {
          method: 'PUT',
          body: { tags: nextTags },
        }
      );

      setChannels((prev) =>
        prev.map((channel) => (
          channel.id === activeDetailChannel.id
            ? { ...channel, tags: nextTags }
            : channel
        ))
      );
      setHasPendingChanges(true);
      toast.success(`频道 ${activeDetailChannel.name} 标签已更新`);
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '更新频道标签出错'));
    } finally {
      setIsSavingTags(false);
    }
  }, [activeDetailChannel, channelTagsInput, token]);

  const handleCreateTag = useCallback(async (name: string) => {
    setIsCreatingTag(true);
    try {
      const payload: CreateAdminTagRequest = {
        scope: CHANNEL_TAG_SCOPE,
        name,
      };
      const response = await requestAuthedJson<CreateAdminTagResponse>(
        '/api/admin/tags',
        token,
        '创建频道标签失败',
        {
          method: 'POST',
          body: payload,
        }
      );
      setTagOptions((prev) => [...prev, response.item].sort((left, right) => left.name.localeCompare(right.name, 'zh-CN', { sensitivity: 'base' })));
      toast.success(`标签 ${response.item.name} 已创建`);
      return response.item;
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '创建频道标签出错'));
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
        '更新频道标签失败',
        {
          method: 'PUT',
          body: payload,
        }
      );
      const currentOption = tagOptions.find((option) => option.id === id);
      const previousName = currentOption?.name || '';

      setTagOptions((prev) => replaceTagOption(prev, response.item).sort((left, right) => left.name.localeCompare(right.name, 'zh-CN', { sensitivity: 'base' })));
      if (previousName) {
        setSelectedTagFiltersState((prev) => normalizeSingleTagSelection(replaceTagName(prev, previousName, response.item.name)));
        setNewChannelTags((prev) => normalizeSingleTagSelection(replaceTagName(prev, previousName, response.item.name)));
        setChannelTagsInput((prev) => normalizeSingleTagSelection(replaceTagName(prev, previousName, response.item.name)));
        setChannels((prev) => prev.map((channel) => ({
          ...channel,
          tags: replaceTagName(channel.tags || [], previousName, response.item.name),
        })));
      }
      toast.success('频道标签已更新');
      return response.item;
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '更新频道标签出错'));
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
        '删除频道标签失败',
        {
          method: 'DELETE',
        }
      );
      setTagOptions((prev) => removeTagOption(prev, id));
      if (currentOption) {
        setSelectedTagFiltersState((prev) => normalizeSingleTagSelection(removeTagName(prev, currentOption.name)));
        setNewChannelTags((prev) => normalizeSingleTagSelection(removeTagName(prev, currentOption.name)));
        setChannelTagsInput((prev) => normalizeSingleTagSelection(removeTagName(prev, currentOption.name)));
        setChannels((prev) => prev.map((channel) => ({
          ...channel,
          tags: removeTagName(channel.tags || [], currentOption.name),
        })));
      }
      toast.success('频道标签已删除');
      return true;
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '删除频道标签出错'));
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
    channels,
    loading,
    testingStatus,
    deletingIds,
    isAdding,
    isBatchTesting,
    isBatchUpdating,
    isBatchDeleting,
    addDialogOpen,
    newChannelName,
    newChannelTags,
    detailChannelId,
    deleteConfirm,
    batchDeleteConfirmOpen,
    searchKeyword,
    statusFilter,
    currentPage,
    tagOptions,
    isTagOptionsLoading,
    isCreatingTag,
    updatingTagId,
    deletingTagId,
    selectedTagFilters,
    filteredItems,
    pagedItems,
    totalPages,
    pageSize,
    selectedChannelIds,
    selectedCount,
    selectedChannelPreviewText,
    isAllFilteredSelected,
    activeDetailChannel,
    isOperationBusy,
    fetchChannels,
    clearSelectedChannels: clearSelected,
    setPageSize,
    setSearchKeyword,
    setStatusFilter,
    setSelectedTagFilters,
    setCurrentPage,
    setAddDialogOpen,
    setNewChannelName,
    setNewChannelTags,
    setDetailChannelId,
    setDeleteConfirm,
    setBatchDeleteConfirmOpen,
    selectKey,
    handleClose,
    handleToggleSelectFiltered,
    handleAddChannel,
    handleToggleEnabled,
    handleBatchToggleChannels,
    handleDeleteChannel,
    handleBatchDeleteChannels,
    handleTestChannel,
    handleQuickTest,
    handleBatchTest,
    channelTagsInput,
    setChannelTagsInput,
    isSavingTags,
    handleSaveChannelTags,
    handleCreateTag,
    handleUpdateTag,
    handleDeleteTag,
  };
}
