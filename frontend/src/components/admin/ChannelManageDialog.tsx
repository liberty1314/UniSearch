import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  PlayCircle,
  Plus,
  Radio,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ConfirmDialog } from './ConfirmDialog';
import type {
  AdminDialogMode,
  BatchChannelOperationResponse,
  ListTGChannelsResponse,
  TGChannel,
} from '@/types/api';
import { compareChannels } from './adminListSort';
import { ApplePagination } from './ApplePagination';
import {
  UNIFIED_STATUS_FILTER_OPTIONS,
  type UnifiedStatusFilter,
  isChannelMatchesStatusFilter,
} from './previewFilters';
import { useAdminWorkspaceState } from './useAdminWorkspaceState';
import {
  buildAuthHeaders,
  readErrorMessage,
  toastBatchResult,
} from './adminWorkspaceApi';

interface ChannelManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  mode?: AdminDialogMode;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const PAGE_SIZE = 10;

const normalizeHealth = (channel: TGChannel): 'healthy' | 'error' | 'untested' =>
  channel.health_status || 'untested';

export const ChannelManageDialog: React.FC<ChannelManageDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
  mode = 'edit',
}) => {
  const isReadOnly = mode === 'view';
  const [channels, setChannels] = useState<TGChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingStatus, setTestingStatus] = useState<Record<string, TestStatus>>({});
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

  const listContainerRef = useRef<HTMLDivElement>(null);
  const timeoutIdsRef = useRef<number[]>([]);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/channels', {
        headers: buildAuthHeaders(token),
      });

      if (!response.ok) {
        toast.error('获取频道列表失败');
        return;
      }

      const data = (await response.json()) as ListTGChannelsResponse;
      setChannels(Array.isArray(data.channels) ? data.channels : []);
    } catch {
      toast.error('获取频道列表出错');
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
    setTestingStatus({});
    setDeletingIds(new Set());
    setAddDialogOpen(false);
    setNewChannelName('');
    setDetailChannelId(null);
    setDeleteConfirm({ open: false, channel: null });
    setBatchDeleteConfirmOpen(false);
    setHasPendingChanges(false);
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

  const selectedChannelPreviewText = useMemo(() => {
    return orderedItems
      .filter((channel) => selectedChannelIds.has(channel.id))
      .map((channel) => channel.name)
      .slice(0, 3)
      .join('、');
  }, [orderedItems, selectedChannelIds]);
  const filteredChannelIds = useMemo(
    () => filteredItems.map((channel) => channel.id),
    [filteredItems]
  );
  const isAllFilteredSelected = useMemo(
    () =>
      filteredChannelIds.length > 0 &&
      filteredChannelIds.every((id) => selectedChannelIds.has(id)),
    [filteredChannelIds, selectedChannelIds]
  );

  const activeDetailChannel = useMemo(
    () => channels.find((channel) => channel.id === detailChannelId) || null,
    [channels, detailChannelId]
  );

  const isOperationBusy = isBatchTesting || isBatchUpdating || isBatchDeleting || isAdding;

  const setSelectedChannels = (nextSelected: Set<number>) => {
    clearSelected();
    nextSelected.forEach((id) => selectKey(id, true));
  };
  const handleToggleSelectFiltered = () => {
    if (isAllFilteredSelected) {
      clearSelected();
      return;
    }
    selectAllFiltered();
  };

  const handleClose = () => {
    clearStatusTimeouts();
    if (hasPendingChanges) {
      onSuccess();
      setHasPendingChanges(false);
    }
    onClose();
  };

  const handleAddChannel = async () => {
    const name = newChannelName.trim();
    if (!name) {
      toast.error('请输入频道名称');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, '添加频道失败'));
        return;
      }

      toast.success(`频道 ${name} 添加成功`);
      setNewChannelName('');
      setAddDialogOpen(false);
      await fetchChannels();
      setHasPendingChanges(true);
      onSuccess();
    } catch {
      toast.error('添加频道出错');
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggleEnabled = async (channel: TGChannel) => {
    if (isOperationBusy) return;

    const nextEnabled = !channel.is_enabled;
    try {
      const response = await fetch(`/api/admin/channels/${channel.id}`, {
        method: 'PUT',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify({ is_enabled: nextEnabled }),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, '更新频道失败'));
        return;
      }

      setChannels((prev) =>
        prev.map((item) =>
          item.id === channel.id ? { ...item, is_enabled: nextEnabled } : item
        )
      );
      setHasPendingChanges(true);
      toast.success(`频道 ${channel.name} 已${nextEnabled ? '启用' : '禁用'}`);
    } catch {
      toast.error('更新频道出错');
    }
  };

  const handleBatchToggleChannels = async (isEnabled: boolean) => {
    if (selectedChannelIds.size === 0) {
      toast.error('请先选择要操作的频道');
      return;
    }

    setIsBatchUpdating(true);
    try {
      const response = await fetch('/api/admin/channels/batch-status', {
        method: 'POST',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify({
          channel_ids: Array.from(selectedChannelIds),
          is_enabled: isEnabled,
        }),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, '批量更新频道状态失败'));
        return;
      }

      const result = (await response.json()) as BatchChannelOperationResponse;
      const successSet = new Set(result.success ?? []);
      const failedSet = new Set((result.failed ?? []).map((item) => item.channel_id));

      if (successSet.size > 0) {
        setChannels((prev) =>
          prev.map((channel) =>
            successSet.has(channel.id)
              ? { ...channel, is_enabled: isEnabled }
              : channel
          )
        );
        setHasPendingChanges(true);
      }

      setSelectedChannels(failedSet);
      toastBatchResult(`批量${isEnabled ? '启用' : '停用'}`, result);
    } catch {
      toast.error('批量更新频道状态出错');
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handleDeleteChannel = async () => {
    const channel = deleteConfirm.channel;
    if (!channel) return;

    setDeletingIds((prev) => new Set(prev).add(channel.id));
    try {
      const response = await fetch(`/api/admin/channels/${channel.id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(token),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, '删除频道失败'));
        return;
      }

      toast.success(`频道 ${channel.name} 已删除`);
      setChannels((prev) => prev.filter((item) => item.id !== channel.id));
      selectKey(channel.id, false);
      setDeleteConfirm({ open: false, channel: null });
      setHasPendingChanges(true);
    } catch {
      toast.error('删除频道出错');
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(channel.id);
        return next;
      });
    }
  };

  const handleBatchDeleteChannels = async () => {
    if (selectedChannelIds.size === 0) {
      toast.error('请先选择要删除的频道');
      return;
    }

    setIsBatchDeleting(true);
    try {
      const response = await fetch('/api/admin/channels/batch-delete', {
        method: 'POST',
        headers: buildAuthHeaders(token, true),
        body: JSON.stringify({ channel_ids: Array.from(selectedChannelIds) }),
      });

      if (!response.ok) {
        toast.error(await readErrorMessage(response, '批量删除频道失败'));
        return;
      }

      const result = (await response.json()) as BatchChannelOperationResponse;
      const successSet = new Set(result.success ?? []);
      const failedSet = new Set((result.failed ?? []).map((item) => item.channel_id));

      if (successSet.size > 0) {
        setChannels((prev) => prev.filter((channel) => !successSet.has(channel.id)));
        setHasPendingChanges(true);
      }

      setSelectedChannels(failedSet);
      setBatchDeleteConfirmOpen(false);
      toastBatchResult('批量删除', result);
    } catch {
      toast.error('批量删除频道出错');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const handleTestChannel = async (channelName: string) => {
    setTestingStatus((prev) => ({ ...prev, [channelName]: 'testing' }));

    try {
      const response = await fetch(`/api/admin/channels/${channelName}/test`, {
        method: 'POST',
        headers: buildAuthHeaders(token),
      });

      const data = (await response.json()) as { accessible?: boolean; error?: string };
      const ok = response.ok && Boolean(data.accessible);
      setTestingStatus((prev) => ({ ...prev, [channelName]: ok ? 'success' : 'error' }));

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
      setTestingStatus((prev) => ({ ...prev, [channelName]: 'error' }));
      toast.error(`测试频道 ${channelName} 出错`);
    }

    scheduleStatusReset(() => {
      setTestingStatus((prev) => ({ ...prev, [channelName]: 'idle' }));
    }, 5000);
  };

  const handleBatchTest = async () => {
    const enabledChannels = channels.filter((channel) => channel.is_enabled);
    if (enabledChannels.length === 0) {
      toast.error('没有已启用的频道可供测试');
      return;
    }

    setIsBatchTesting(true);
    setTestingStatus((prev) => {
      const next = { ...prev };
      enabledChannels.forEach((channel) => {
        next[channel.name] = 'testing';
      });
      return next;
    });

    const results = await Promise.allSettled(
      enabledChannels.map(async (channel) => {
        try {
          const response = await fetch(`/api/admin/channels/${channel.name}/test`, {
            method: 'POST',
            headers: buildAuthHeaders(token),
          });
          const data = (await response.json()) as { accessible?: boolean };
          const ok = response.ok && Boolean(data.accessible);
          setTestingStatus((prev) => ({ ...prev, [channel.name]: ok ? 'success' : 'error' }));
          return ok;
        } catch {
          setTestingStatus((prev) => ({ ...prev, [channel.name]: 'error' }));
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

    scheduleStatusReset(() => {
      setTestingStatus({});
    }, 10000);
  };

  const getTestIcon = (status: TestStatus) => {
    if (status === 'testing') return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    if (status === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    if (status === 'error') return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    return <Zap className="w-3.5 h-3.5" />;
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
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-blue-50 via-indigo-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Radio className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Telegram 频道工作台
                      <Badge variant={isReadOnly ? 'outline' : 'success'}>
                        {isReadOnly ? '只读模式' : '编辑模式'}
                      </Badge>
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      统一检索、查看与管理搜索频道
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center"
                    aria-label="关闭频道管理"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  </button>
                </div>

              </div>

              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
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
                    <Button
                      onClick={() => setAddDialogOpen(true)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white lg:ml-auto"
                      aria-label="添加频道"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      添加频道
                    </Button>
                  )}
                </div>

                {!isReadOnly && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleBatchToggleChannels(true)}
                        disabled={isOperationBusy || selectedCount === 0}
                        className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                      >
                        批量启用
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleBatchToggleChannels(false)}
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
                        disabled={isOperationBusy || channels.length === 0}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
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
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  </div>
                ) : pagedItems.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <Radio className="w-10 h-10 mx-auto mb-2 opacity-35" />
                    <p>无匹配数据</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pagedItems.map((channel, index) => {
                      const healthStatus = normalizeHealth(channel);
                      return (
                        <motion.div
                          key={channel.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={`rounded-lg border transition-colors ${
                            channel.is_enabled
                              ? 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                              : 'bg-slate-100/60 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-700/60'
                          }`}
                        >
                          <div className="p-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              {!isReadOnly && (
                                <Checkbox
                                  checked={selectedChannelIds.has(channel.id)}
                                  onCheckedChange={(checked) => selectKey(channel.id, Boolean(checked))}
                                  aria-label={`选择频道 ${channel.name}`}
                                  disabled={isOperationBusy}
                                />
                              )}

                              {channel.is_enabled ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400" />
                              )}

                              <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                {channel.name}
                              </span>

                              <Badge variant={channel.is_enabled ? 'success' : 'outline'}>
                                {channel.is_enabled ? '启用' : '禁用'}
                              </Badge>

                              {healthStatus === 'healthy' && (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                  <ShieldCheck className="w-3 h-3 mr-1" />
                                  正常
                                </Badge>
                              )}
                              {healthStatus === 'error' && (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" title={channel.last_error || '最近一次测试失败'}>
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  异常
                                </Badge>
                              )}
                              {healthStatus === 'untested' && <Badge variant="outline">未测试</Badge>}
                            </div>

                            <div className="flex items-center flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDetailChannelId(channel.id)}
                                className="h-8 px-2"
                              >
                                详情
                              </Button>

                              {!isReadOnly && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleTestChannel(channel.name)}
                                    disabled={isOperationBusy || testingStatus[channel.name] === 'testing'}
                                    className="h-8 px-2"
                                  >
                                    {getTestIcon(testingStatus[channel.name] || 'idle')}
                                    <span className="ml-1">测试</span>
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggleEnabled(channel)}
                                    aria-label={`切换频道 ${channel.name} 状态`}
                                    disabled={isOperationBusy}
                                    className={`h-8 px-2 ${
                                      channel.is_enabled
                                        ? 'text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20'
                                        : 'text-slate-500 border-slate-200 hover:bg-slate-100 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-700/50'
                                    }`}
                                  >
                                    {channel.is_enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeleteConfirm({ open: true, channel })}
                                    disabled={isOperationBusy || deletingIds.has(channel.id)}
                                    className="h-8 px-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                                  >
                                    {deletingIds.has(channel.id) ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {healthStatus === 'error' && channel.last_error && (
                            <div className="px-3 pb-3 text-xs text-red-600 dark:text-red-400 truncate" title={channel.last_error}>
                              最近错误: {channel.last_error}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60">
                <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    共 {channels.length} 个频道{!isReadOnly ? `，已选 ${selectedCount} 项` : ''}
                  </span>
                  {!loading && filteredItems.length > 0 && (
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

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加频道</DialogTitle>
            <DialogDescription>输入频道名称（例如 `tgsearchers3`）</DialogDescription>
          </DialogHeader>

          <div>
            <Label>频道名称 *</Label>
            <Input
              value={newChannelName}
              onChange={(event) => setNewChannelName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isAdding && newChannelName.trim()) {
                  event.preventDefault();
                  void handleAddChannel();
                }
              }}
              placeholder="tgsearchers3"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddChannel} disabled={isAdding || !newChannelName.trim()}>
              {isAdding ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(activeDetailChannel)}
        onOpenChange={(open) => {
          if (!open) setDetailChannelId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          {activeDetailChannel ? (
            <>
              <DialogHeader>
                <DialogTitle>{activeDetailChannel.name}</DialogTitle>
                <DialogDescription>频道运行与健康信息</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">启用状态</p>
                    <p className="font-medium">{activeDetailChannel.is_enabled ? '已启用' : '已禁用'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">排序</p>
                    <p className="font-medium">{activeDetailChannel.sort_order}</p>
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">健康状态</p>
                  <p className="font-medium">
                    {normalizeHealth(activeDetailChannel) === 'healthy'
                      ? '正常'
                      : normalizeHealth(activeDetailChannel) === 'error'
                        ? '异常'
                        : '未测试'}
                  </p>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">最后检查时间</p>
                  <p className="font-medium">{activeDetailChannel.last_checked_at || '暂无'}</p>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">检查来源</p>
                  <p className="font-medium">{activeDetailChannel.check_source || '暂无'}</p>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">最近错误</p>
                  <p className="font-medium text-red-600 dark:text-red-400">{activeDetailChannel.last_error || '无'}</p>
                </div>
              </div>

              {!isReadOnly && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => void handleTestChannel(activeDetailChannel.name)}
                    disabled={isOperationBusy || testingStatus[activeDetailChannel.name] === 'testing'}
                  >
                    {getTestIcon(testingStatus[activeDetailChannel.name] || 'idle')}
                    <span className="ml-1">测试</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleToggleEnabled(activeDetailChannel)}
                    aria-label={`切换频道 ${activeDetailChannel.name} 状态`}
                    disabled={isOperationBusy}
                  >
                    {activeDetailChannel.is_enabled ? (
                      <>
                        <ToggleRight className="w-4 h-4 mr-1" />
                        停用
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 mr-1" />
                        启用
                      </>
                    )}
                  </Button>
                </DialogFooter>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => !open && setDeleteConfirm({ open: false, channel: null })}
        title="删除频道"
        description={`确定要删除频道 "${deleteConfirm.channel?.name || ''}" 吗？删除后该频道将不再参与搜索。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDeleteChannel}
        isLoading={Boolean(deleteConfirm.channel && deletingIds.has(deleteConfirm.channel.id))}
      />

      <ConfirmDialog
        open={batchDeleteConfirmOpen}
        onOpenChange={setBatchDeleteConfirmOpen}
        title="确认批量删除频道"
        description={`将删除 ${selectedCount} 个已选频道${selectedChannelPreviewText ? `（例如：${selectedChannelPreviewText}）` : ''}。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleBatchDeleteChannels}
        isLoading={isBatchDeleting}
      />
    </>
  );
};
