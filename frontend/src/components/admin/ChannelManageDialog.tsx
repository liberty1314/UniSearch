import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AdminDialogMode } from "@/types/admin";
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ChannelAddDialog } from './ChannelAddDialog';
import { AdminStatusToggleAction } from './AdminStatusToggleAction';
import { AdminTestAction } from './AdminTestAction';
import {
  ChannelManageWorkspace,
  type ChannelManageWorkspaceViewModel,
} from './ChannelManageWorkspace';
import { describeChannelHealth } from './channelManageDialogShared';
import {
  useChannelManageController,
  type UseChannelManageControllerResult,
} from '@/hooks/useChannelManageController';
import { usePagedListScrollReset } from '@/hooks/usePagedListScrollReset';

interface ChannelManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  mode?: AdminDialogMode;
}

export type ChannelManageSurfacePresentation = 'modal' | 'page';

interface ChannelManageSurfaceProps {
  controller: UseChannelManageControllerResult;
  listContainerRef: React.RefObject<HTMLDivElement | null>;
  presentation: ChannelManageSurfacePresentation;
}

export function ChannelManageSurface({
  controller,
  listContainerRef,
  presentation,
}: ChannelManageSurfaceProps) {
  const workspace: ChannelManageWorkspaceViewModel = {
    isOpen: true,
    presentation,
    isReadOnly: controller.isReadOnly,
    isOperationBusy: controller.isOperationBusy,
    isBatchTesting: controller.isBatchTesting,
    loading: controller.loading,
    totalChannels: controller.channels.length,
    statusFilter: controller.statusFilter,
    filteredItemsCount: controller.filteredItems.length,
    currentPage: controller.currentPage,
    totalPages: controller.totalPages,
    selectedChannelIds: controller.selectedChannelIds,
    selectedCount: controller.selectedCount,
    isAllFilteredSelected: controller.isAllFilteredSelected,
    pagedItems: controller.pagedItems,
    testingStatus: controller.testingStatus,
    deletingIds: controller.deletingIds,
    listContainerRef,
    onClose: controller.handleClose,
    onSetStatusFilter: controller.setStatusFilter,
    onOpenAddDialog: () => controller.setAddDialogOpen(true),
    onBatchToggle: (isEnabled) => void controller.handleBatchToggleChannels(isEnabled),
    onOpenBatchDeleteConfirm: () => controller.setBatchDeleteConfirmOpen(true),
    onBatchTest: () => void controller.handleBatchTest(),
    onToggleSelectFiltered: controller.handleToggleSelectFiltered,
    onSelectChannel: controller.selectKey,
    onOpenDetail: controller.setDetailChannelId,
    onTestChannel: (channelName) => void controller.handleTestChannel(channelName),
    onToggleEnabled: (channel) => void controller.handleToggleEnabled(channel),
    onOpenDeleteConfirm: (channel) => controller.setDeleteConfirm({ open: true, channel }),
    onPageChange: controller.setCurrentPage,
  };

  const workspaceNode = presentation === 'modal'
    ? createPortal(<ChannelManageWorkspace workspace={workspace} />, document.body)
    : <ChannelManageWorkspace workspace={workspace} />;

  return (
    <>
      {workspaceNode}

      <ChannelAddDialog
        open={controller.addDialogOpen}
        isAdding={controller.isAdding}
        newChannelName={controller.newChannelName}
        newChannelTags={controller.newChannelTags}
        tagOptions={controller.tagOptions}
        isTagOptionsLoading={controller.isTagOptionsLoading}
        isCreatingTag={controller.isCreatingTag}
        updatingTagId={controller.updatingTagId}
        deletingTagId={controller.deletingTagId}
        onOpenChange={controller.setAddDialogOpen}
        onChannelNameChange={controller.setNewChannelName}
        onChannelTagsChange={controller.setNewChannelTags}
        onCreateTag={controller.handleCreateTag}
        onUpdateTag={controller.handleUpdateTag}
        onDeleteTag={controller.handleDeleteTag}
        onSubmit={() => void controller.handleAddChannel()}
      />

      <Dialog
        open={Boolean(controller.activeDetailChannel)}
        onOpenChange={(open) => {
          if (!open) controller.setDetailChannelId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          {controller.activeDetailChannel ? (
            <>
              <DialogHeader>
                <DialogTitle>{controller.activeDetailChannel.name}</DialogTitle>
                <DialogDescription>频道运行与健康信息</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">启用状态</p>
                    <p className="font-medium">
                      {controller.activeDetailChannel.is_enabled ? '已启用' : '已禁用'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">排序</p>
                    <p className="font-medium">{controller.activeDetailChannel.sort_order}</p>
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">健康状态</p>
                  <p className="font-medium">{describeChannelHealth(controller.activeDetailChannel)}</p>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">最后检查时间</p>
                  <p className="font-medium">{controller.activeDetailChannel.last_checked_at || '暂无'}</p>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">检查来源</p>
                  <p className="font-medium">{controller.activeDetailChannel.check_source || '暂无'}</p>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">最近错误</p>
                  <p className="font-medium text-red-600 dark:text-red-400">
                    {controller.activeDetailChannel.last_error || '无'}
                  </p>
                </div>
              </div>

              {!controller.isReadOnly ? (
                <DialogFooter>
                  <AdminTestAction
                    status={controller.testingStatus[controller.activeDetailChannel.name] || 'idle'}
                    onClick={() => void controller.handleTestChannel(controller.activeDetailChannel.name)}
                    disabled={controller.isOperationBusy}
                  />
                  <AdminStatusToggleAction
                    enabled={controller.activeDetailChannel.is_enabled}
                    entityLabel={`频道 ${controller.activeDetailChannel.name}`}
                    onClick={() => void controller.handleToggleEnabled(controller.activeDetailChannel)}
                    disabled={controller.isOperationBusy}
                  />
                </DialogFooter>
              ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={controller.deleteConfirm.open}
        onOpenChange={(open) => !open && controller.setDeleteConfirm({ open: false, channel: null })}
        title="删除频道"
        description={`确定要删除频道 "${controller.deleteConfirm.channel?.name || ''}" 吗？删除后该频道将不再参与搜索。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => void controller.handleDeleteChannel()}
        isLoading={Boolean(
          controller.deleteConfirm.channel &&
            controller.deletingIds.has(controller.deleteConfirm.channel.id)
        )}
      />

      <ConfirmDialog
        open={controller.batchDeleteConfirmOpen}
        onOpenChange={controller.setBatchDeleteConfirmOpen}
        title="确认批量删除频道"
        description={`将删除 ${controller.selectedCount} 个已选频道${controller.selectedChannelPreviewText ? `（例如：${controller.selectedChannelPreviewText}）` : ''}。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => void controller.handleBatchDeleteChannels()}
        isLoading={controller.isBatchDeleting}
      />
    </>
  );
}

export const ChannelManageDialog: React.FC<ChannelManageDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
  mode = 'edit',
}) => {
  const listContainerRef = useRef<HTMLDivElement>(null);
  const controller = useChannelManageController({
    isOpen,
    onClose,
    onSuccess,
    token,
    mode,
  });
  usePagedListScrollReset(listContainerRef, controller.currentPage);

  if (!isOpen) return null;

  return (
    <ChannelManageSurface
      controller={controller}
      listContainerRef={listContainerRef}
      presentation="modal"
    />
  );
};
