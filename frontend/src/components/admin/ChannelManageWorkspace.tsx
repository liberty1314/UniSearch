import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Radio,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { TGChannel } from "@/types/channel";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { AdminDeleteAction } from './AdminDeleteAction';
import { AdminStatusToggleAction } from './AdminStatusToggleAction';
import { AdminTestAction } from './AdminTestAction';
import { AdminWorkspaceFooter } from './AdminWorkspaceFooter';
import { AdminWorkspaceToolbar } from './AdminWorkspaceToolbar';
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
import {
  CHANNEL_PAGE_SIZE,
  normalizeChannelHealth,
  type ChannelTestStatus,
} from './channelManageDialogShared';
import { type UnifiedStatusFilter } from './previewFilters';

export interface ChannelManageWorkspaceViewModel {
  isOpen: boolean;
  presentation?: 'modal' | 'page';
  isReadOnly: boolean;
  isOperationBusy: boolean;
  isBatchTesting: boolean;
  loading: boolean;
  totalChannels: number;
  statusFilter: UnifiedStatusFilter;
  filteredItemsCount: number;
  currentPage: number;
  totalPages: number;
  selectedChannelIds: Set<number>;
  selectedCount: number;
  isAllFilteredSelected: boolean;
  pagedItems: TGChannel[];
  testingStatus: Record<string, ChannelTestStatus>;
  deletingIds: Set<number>;
  listContainerRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSetStatusFilter: (value: UnifiedStatusFilter) => void;
  onOpenAddDialog: () => void;
  onBatchToggle: (isEnabled: boolean) => void;
  onOpenBatchDeleteConfirm: () => void;
  onBatchTest: () => void;
  onToggleSelectFiltered: () => void;
  onSelectChannel: (channelId: number, checked: boolean) => void;
  onOpenDetail: (channelId: number) => void;
  onTestChannel: (channelName: string) => void;
  onToggleEnabled: (channel: TGChannel) => void;
  onOpenDeleteConfirm: (channel: TGChannel) => void;
  onPageChange: (page: number) => void;
}

interface ChannelManageWorkspaceProps {
  workspace: ChannelManageWorkspaceViewModel;
}

export function ChannelManageWorkspace({ workspace }: ChannelManageWorkspaceProps) {
  const shouldReduceMotion = useReducedMotion();
  const {
    isOpen,
    presentation = 'modal',
    isReadOnly,
    isOperationBusy,
    isBatchTesting,
    loading,
    totalChannels,
    statusFilter,
    filteredItemsCount,
    currentPage,
    totalPages,
    selectedChannelIds,
    selectedCount,
    isAllFilteredSelected,
    pagedItems,
    testingStatus,
    deletingIds,
    listContainerRef,
    onClose,
    onSetStatusFilter,
    onOpenAddDialog,
    onBatchToggle,
    onOpenBatchDeleteConfirm,
    onBatchTest,
    onToggleSelectFiltered,
    onSelectChannel,
    onOpenDetail,
    onTestChannel,
    onToggleEnabled,
    onOpenDeleteConfirm,
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
              <Radio className="h-5 w-5 text-blue-600 dark:text-cyan-300" />
              Telegram 频道工作台
              <Badge variant={isReadOnly ? 'outline' : 'success'}>
                {isReadOnly ? '只读模式' : '编辑模式'}
              </Badge>
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              统一检索、查看与管理搜索频道
            </p>
          </div>
          {presentation === 'modal' ? (
            <button
              onClick={onClose}
              className={dialogShellCloseClassName}
              aria-label="关闭频道管理"
            >
              <X className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </button>
          ) : null}
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
        addButtonLabel="添加频道"
        addButtonAriaLabel="添加频道"
        addButtonClassName="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 lg:ml-auto"
        batchTestClassName="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-cyan-800/70 dark:text-cyan-300 dark:hover:bg-cyan-950/30"
        batchTestDisabled={isOperationBusy || totalChannels === 0}
        onSetStatusFilter={onSetStatusFilter}
        onOpenAddDialog={onOpenAddDialog}
        onBatchToggle={onBatchToggle}
        onOpenBatchDeleteConfirm={onOpenBatchDeleteConfirm}
        onBatchTest={onBatchTest}
        onToggleSelectFiltered={onToggleSelectFiltered}
      />

      <div ref={listContainerRef} className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          </div>
        ) : pagedItems.length === 0 ? (
          <div className="py-16 text-center text-slate-500 dark:text-slate-400">
            <Radio className="mx-auto mb-2 h-10 w-10 opacity-35" />
            <p>无匹配数据</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pagedItems.map((channel, index) => {
              const healthStatus = normalizeChannelHealth(channel);
              return (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`rounded-lg border transition-colors ${
                    channel.is_enabled
                      ? 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-700/30 dark:hover:border-slate-500'
                      : 'border-slate-200/60 bg-slate-100/60 dark:border-slate-700/60 dark:bg-slate-800/30'
                  }`}
                >
                  <div className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      {!isReadOnly ? (
                        <Checkbox
                          checked={selectedChannelIds.has(channel.id)}
                          onCheckedChange={(checked) => onSelectChannel(channel.id, Boolean(checked))}
                          aria-label={`选择频道 ${channel.name}`}
                          disabled={isOperationBusy}
                        />
                      ) : null}

                      {channel.is_enabled ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-400" />
                      )}

                      <span className="truncate font-mono text-sm font-medium text-slate-700 dark:text-slate-200">
                        {channel.name}
                      </span>

                      <Badge variant={channel.is_enabled ? 'success' : 'outline'}>
                        {channel.is_enabled ? '启用' : '禁用'}
                      </Badge>

                      {healthStatus === 'healthy' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          正常
                        </Badge>
                      ) : null}
                      {healthStatus === 'error' ? (
                        <Badge
                          className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          title={channel.last_error || '最近一次测试失败'}
                        >
                          <AlertCircle className="mr-1 h-3 w-3" />
                          异常
                        </Badge>
                      ) : null}
                      {healthStatus === 'untested' ? <Badge variant="outline">未测试</Badge> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenDetail(channel.id)}
                        className="h-8 px-2"
                      >
                        详情
                      </Button>

                      {!isReadOnly ? (
                        <>
                          <AdminTestAction
                            compact
                            status={testingStatus[channel.name] || 'idle'}
                            onClick={() => onTestChannel(channel.name)}
                            disabled={isOperationBusy}
                          />

                          <AdminStatusToggleAction
                            compact
                            enabled={channel.is_enabled}
                            entityLabel={`频道 ${channel.name}`}
                            onClick={() => onToggleEnabled(channel)}
                            disabled={isOperationBusy}
                          />

                          <AdminDeleteAction
                            compact
                            onClick={() => onOpenDeleteConfirm(channel)}
                            disabled={isOperationBusy || deletingIds.has(channel.id)}
                            isLoading={deletingIds.has(channel.id)}
                            aria-label={`删除频道 ${channel.name}`}
                          />
                        </>
                      ) : null}
                    </div>
                  </div>

                  {healthStatus === 'error' && channel.last_error ? (
                    <div
                      className="truncate px-3 pb-3 text-xs text-red-600 dark:text-red-400"
                      title={channel.last_error}
                    >
                      最近错误: {channel.last_error}
                    </div>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AdminWorkspaceFooter
        totalCount={totalChannels}
        itemLabel="频道"
        isReadOnly={isReadOnly}
        selectedCount={selectedCount}
        showPagination={!loading && filteredItemsCount > 0}
        currentPage={currentPage}
        totalPages={totalPages}
        filteredItemsCount={filteredItemsCount}
        pageSize={CHANNEL_PAGE_SIZE}
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
