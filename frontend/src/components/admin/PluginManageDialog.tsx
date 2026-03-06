import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Edit3, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AdminDialogMode, PluginInfo } from '@/types/api';
import { ConfirmDialog } from './ConfirmDialog';
import { PluginAddDialog } from './PluginAddDialog';
import {
  PluginManageWorkspace,
  type PluginManageWorkspaceViewModel,
} from './PluginManageWorkspace';
import {
  pluginStatusBadgeClass,
  pluginStatusText,
  resolvePluginStatus,
} from './pluginManageDialogShared';
import { usePluginManageController } from '@/hooks/usePluginManageController';
import { usePagedListScrollReset } from '@/hooks/usePagedListScrollReset';

interface PluginManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  plugins: PluginInfo[];
  mode?: AdminDialogMode;
}

export const PluginManageDialog: React.FC<PluginManageDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
  plugins,
  mode = 'edit',
}) => {
  const listContainerRef = useRef<HTMLDivElement>(null);
  const controller = usePluginManageController({
    isOpen,
    onClose,
    onSuccess,
    token,
    plugins,
    mode,
  });
  usePagedListScrollReset(listContainerRef, controller.currentPage);

  if (!isOpen) return null;

  const workspace: PluginManageWorkspaceViewModel = {
    isOpen,
    isReadOnly: controller.isReadOnly,
    isOperationBusy: controller.isOperationBusy,
    isBatchTesting: controller.isBatchTesting,
    localPluginsCount: controller.localPlugins.length,
    statusFilter: controller.statusFilter,
    filteredItemsCount: controller.filteredItems.length,
    currentPage: controller.currentPage,
    totalPages: controller.totalPages,
    selectedPluginNames: controller.selectedPluginNames,
    selectedCount: controller.selectedCount,
    isAllFilteredSelected: controller.isAllFilteredSelected,
    pagedItems: controller.pagedItems,
    testingStatus: controller.testingStatus,
    listContainerRef,
    onClose: controller.handleClose,
    onSetStatusFilter: controller.setStatusFilter,
    onOpenAddDialog: controller.openAddDialog,
    onBatchToggle: (nextEnabled) => void controller.handleBatchTogglePlugins(nextEnabled),
    onOpenBatchDeleteConfirm: () => controller.setBatchDeleteConfirmOpen(true),
    onBatchTest: () => void controller.handleBatchTest(),
    onToggleSelectFiltered: controller.handleToggleSelectFiltered,
    onSelectPlugin: controller.selectKey,
    onOpenDetail: controller.handleOpenDetail,
    onTestPlugin: (plugin) => void controller.handleTestPlugin(plugin),
    onTogglePluginEnabled: (plugin) => void controller.handleTogglePluginEnabled(plugin),
    onOpenEditDialog: controller.openEditDialog,
    onOpenDeleteConfirm: (pluginName) => controller.setDeleteConfirm({ open: true, pluginName }),
    onPageChange: controller.setCurrentPage,
  };

  return (
    <>
      {createPortal(
        <PluginManageWorkspace workspace={workspace} />,
        document.body
      )}

      <PluginAddDialog
        open={controller.addDialogOpen}
        isAdding={controller.isAdding}
        isTestingUrl={controller.isTestingUrl}
        addForm={controller.addForm}
        urlTestResult={controller.urlTestResult}
        urlTestMessage={controller.urlTestMessage}
        onOpenChange={controller.setAddDialogOpen}
        onAddFormChange={(updater) => {
          controller.setAddForm((prev) => {
            const next = updater(prev);
            if (next.url !== prev.url) {
              controller.setUrlTestResult('idle');
              controller.setUrlTestMessage('');
            }
            return next;
          });
        }}
        onAddFormKeyDown={controller.handleAddFormKeyDown}
        onReset={controller.resetAddDialogState}
        onTestURL={() => void controller.handleTestAddPluginURL()}
        onSubmit={() => void controller.handleAddPlugin()}
      />

      <Dialog
        open={Boolean(controller.activeDetailPlugin)}
        onOpenChange={(open) => {
          if (!open) controller.setDetailPluginName(null);
        }}
      >
        <DialogContent className="max-w-lg">
          {controller.activeDetailPlugin ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  {controller.activeDetailPlugin.name}
                </DialogTitle>
                <DialogDescription>插件详情信息</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">类型</p>
                    <p className="font-medium">
                      {controller.activeDetailPlugin.plugin_type === 'custom' ? '自定义插件' : '内置插件'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">优先级</p>
                    <p className="font-medium">{controller.activeDetailPlugin.priority}</p>
                  </div>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">状态</p>
                  <Badge
                    className={pluginStatusBadgeClass(resolvePluginStatus(controller.activeDetailPlugin))}
                  >
                    {pluginStatusText(resolvePluginStatus(controller.activeDetailPlugin))}
                  </Badge>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">描述</p>
                  <p className="font-medium">{controller.activeDetailPlugin.description || '无描述'}</p>
                </div>

                {controller.activeDetailPlugin.url && (
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">URL</p>
                    <p className="break-all font-medium">{controller.activeDetailPlugin.url}</p>
                  </div>
                )}
              </div>

              {!controller.isReadOnly && controller.activeDetailPlugin.plugin_type === 'custom' && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      controller.setDetailPluginName(null);
                      controller.openEditDialog(controller.activeDetailPlugin);
                    }}
                  >
                    <Edit3 className="mr-1 h-4 w-4" />
                    编辑该插件
                  </Button>
                </DialogFooter>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(controller.activeEditingPlugin)}
        onOpenChange={(open) => {
          if (!open) controller.setEditingPluginName(null);
        }}
      >
        <DialogContent className="max-w-xl">
          {controller.activeEditingPlugin ? (
            <>
              <DialogHeader>
                <DialogTitle>编辑插件</DialogTitle>
                <DialogDescription>{controller.activeEditingPlugin.name}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label>插件名称</Label>
                    <Input
                      value={controller.activeEditingPlugin.name}
                      disabled
                      className="bg-slate-100 dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <Label>优先级</Label>
                    <Input
                      type="number"
                      value={controller.editForm.priority}
                      onChange={(event) =>
                        controller.setEditForm((prev) => ({
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
                    value={controller.editForm.url}
                    onChange={(event) =>
                      controller.setEditForm((prev) => ({ ...prev, url: event.target.value }))
                    }
                    disabled={controller.activeEditingPlugin.plugin_type !== 'custom'}
                  />
                </div>

                <div>
                  <Label>描述</Label>
                  <Input
                    value={controller.editForm.description}
                    onChange={(event) =>
                      controller.setEditForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => controller.setEditingPluginName(null)}>
                  取消
                </Button>
                <Button onClick={() => void controller.handleSaveEdit()}>
                  <Save className="mr-1 h-4 w-4" />
                  保存
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={controller.deleteConfirm.open}
        onOpenChange={(open) =>
          !open && controller.setDeleteConfirm({ open: false, pluginName: null })
        }
        title="删除插件"
        description={`确定要删除插件 "${controller.deleteConfirm.pluginName || ''}" 吗？`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => void controller.handleConfirmDeletePlugin()}
        isLoading={controller.isBatchDeleting}
      />

      <ConfirmDialog
        open={controller.batchDeleteConfirmOpen}
        onOpenChange={controller.setBatchDeleteConfirmOpen}
        title="确认批量删除插件"
        description={`将删除 ${controller.selectedCount} 个已选插件${controller.selectedPluginPreviewText ? `（例如：${controller.selectedPluginPreviewText}）` : ''}。内置插件会自动跳过。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={() => void controller.handleBatchDeletePlugins()}
        isLoading={controller.isBatchDeleting}
      />
    </>
  );
};
