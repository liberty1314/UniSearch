import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type {
  AdminDialogMode,
  BatchChannelOperationResponse,
  ListTGChannelsResponse,
  TGChannel,
} from '@/types/api';
import { compareChannels } from '@/components/admin/adminListSort';
import {
  applyBatchChannelEnabledState,
  removeChannelsById,
  updateChannelEnabledState,
} from '@/components/admin/channelManageStateUtils';
import {
  CHANNEL_PAGE_SIZE,
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
  detailChannelId: number | null;
  deleteConfirm: { open: boolean; channel: TGChannel | null };
  batchDeleteConfirmOpen: boolean;
  statusFilter: UnifiedStatusFilter;
  currentPage: number;
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
  setStatusFilter: (value: UnifiedStatusFilter) => void;
  setCurrentPage: (page: number) => void;
  setAddDialogOpen: (open: boolean) => void;
  setNewChannelName: (value: string) => void;
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
  handleBatchTest: () => Promise<void>;
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
  const [detailChannelId, setDetailChannelId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; channel: TGChannel | null }>({
    open: false,
    channel: null,
  });
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
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

  useEffect(() => {
    if (isOpen) return;
    clearTestingStatus();
    setDeletingIds(new Set());
    setAddDialogOpen(false);
    setNewChannelName('');
    setDetailChannelId(null);
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

  const {
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
    items: channels,
    getKey: getChannelKey,
    compareItems: compareChannels,
    matchesKeyword: () => true,
    matchesStatus: matchesChannelStatus,
    pageSize: CHANNEL_PAGE_SIZE,
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
        body: { name },
      });

      toast.success(`频道 ${name} 添加成功`);
      setNewChannelName('');
      setAddDialogOpen(false);
      await fetchChannels();
      setHasPendingChanges(true);
      onSuccess();
    } catch (error) {
      toast.error(getRequestErrorMessage(error, '添加频道出错'));
    } finally {
      setIsAdding(false);
    }
  }, [fetchChannels, newChannelName, onSuccess, token]);

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

  const handleBatchTest = useCallback(async () => {
    const enabledChannels = channels.filter((channel) => channel.is_enabled);
    if (enabledChannels.length === 0) {
      toast.error('没有已启用的频道可供测试');
      return;
    }

    setIsBatchTesting(true);
    markBatchTesting(enabledChannels.map((channel) => channel.name));

    const results = await Promise.allSettled(
      enabledChannels.map(async (channel) => {
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
    const failCount = enabledChannels.length - successCount;

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
  }, [channels, fetchChannels, markBatchTesting, markResult, onSuccess, resetAllLater, token]);

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
    detailChannelId,
    deleteConfirm,
    batchDeleteConfirmOpen,
    statusFilter,
    currentPage,
    filteredItems,
    pagedItems,
    totalPages,
    selectedChannelIds,
    selectedCount,
    selectedChannelPreviewText,
    isAllFilteredSelected,
    activeDetailChannel,
    isOperationBusy,
    fetchChannels,
    setStatusFilter,
    setCurrentPage,
    setAddDialogOpen,
    setNewChannelName,
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
    handleBatchTest,
  };
}
