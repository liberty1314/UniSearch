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
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PluginAddDialog } from './PluginAddDialog';
import { AdminTagMultiSelect } from './AdminTagMultiSelect';
import {
  PluginManageWorkspace,
  type PluginManageWorkspaceViewModel,
} from './PluginManageWorkspace';
import {
  pluginStatusBadgeClass,
  pluginStatusText,
  resolvePluginStatus,
} from './pluginManageDialogShared';
import {
  usePluginManageController,
  type UsePluginManageControllerResult,
} from '@/hooks/usePluginManageController';
import { usePagedListScrollReset } from '@/hooks/usePagedListScrollReset';

interface PluginManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  plugins: PluginInfo[];
  mode?: AdminDialogMode;
}

export type PluginManageSurfacePresentation = 'modal' | 'page';

interface PluginManageSurfaceProps {
  controller: UsePluginManageControllerResult;
  listContainerRef: React.RefObject<HTMLDivElement | null>;
  presentation: PluginManageSurfacePresentation;
}

export function PluginManageSurface({
  controller,
  listContainerRef,
  presentation,
}: PluginManageSurfaceProps) {
  const workspace: PluginManageWorkspaceViewModel = {
    isOpen: true,
    presentation,
    isReadOnly: controller.isReadOnly,
    isOperationBusy: controller.isOperationBusy,
    isBatchTesting: controller.isBatchTesting,
    localPluginsCount: controller.localPlugins.length,
    searchKeyword: controller.searchKeyword,
    statusFilter: controller.statusFilter,
    sourceFilter: controller.sourceFilter,
    categoryFilter: controller.categoryFilter,
    capabilityFilter: controller.capabilityFilter,
    availableCategories: controller.availableCategories,
    availableCapabilities: controller.availableCapabilities,
    isCatalogLoading: controller.isCatalogLoading,
    catalogVersion: controller.catalogVersion,
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
    onSetSearchKeyword: controller.setSearchKeyword,
    onSetStatusFilter: controller.setStatusFilter,
    onSetSourceFilter: controller.setSourceFilter,
    onSetCategoryFilter: controller.setCategoryFilter,
    onSetCapabilityFilter: controller.setCapabilityFilter,
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
    onInstallPlugin: (plugin) => void controller.handleInstallPlugin(plugin),
  };

  const workspaceNode = presentation === 'modal'
    ? createPortal(<PluginManageWorkspace workspace={workspace} />, document.body)
    : <PluginManageWorkspace workspace={workspace} />;

  return (
    <>
      {workspaceNode}

      <PluginAddDialog
        open={controller.addDialogOpen}
        isAdding={controller.isAdding}
        isTestingUrl={controller.isTestingUrl}
        addForm={controller.addForm}
        tagOptions={controller.tagOptions}
        isTagOptionsLoading={controller.isTagOptionsLoading}
        isCreatingTag={controller.isCreatingTag}
        updatingTagId={controller.updatingTagId}
        deletingTagId={controller.deletingTagId}
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
        onCreateTag={controller.handleCreateTag}
        onUpdateTag={controller.handleUpdateTag}
        onDeleteTag={controller.handleDeleteTag}
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
                  <Badge className={pluginStatusBadgeClass(resolvePluginStatus(controller.activeDetailPlugin))}>
                    {pluginStatusText(resolvePluginStatus(controller.activeDetailPlugin))}
                  </Badge>
                </div>

                <div>
                  <p className="text-slate-500 dark:text-slate-400">描述</p>
                  <p className="font-medium">{controller.activeDetailPlugin.description || '无描述'}</p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">作者</p>
                    <p className="font-medium">{controller.activeDetailPlugin.author || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">来源类型</p>
                    <p className="font-medium">
                      {controller.activeDetailPlugin.source_type || controller.activeDetailPlugin.plugin_type}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-700 dark:text-slate-200">插件清单</p>
                    <Badge variant="outline">
                      {controller.activeDetailPlugin.manifest_status === 'complete' ? '完整' : '生成'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">插件 ID</p>
                      <p className="break-all font-medium">{controller.activeDetailPlugin.id || '-'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">版本</p>
                      <p className="font-medium">{controller.activeDetailPlugin.version || '0.0.0'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">分类</p>
                      <p className="font-medium">{controller.activeDetailPlugin.category || 'search'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">来源</p>
                      <p className="font-medium">{controller.activeDetailPlugin.resource?.source_label || controller.activeDetailPlugin.name}</p>
                    </div>
                  </div>
                  {controller.activeDetailPlugin.resource?.supported_media_types?.length ? (
                    <div className="mt-2">
                      <p className="text-slate-500 dark:text-slate-400">资源类型</p>
                      <p className="font-medium">
                        {controller.activeDetailPlugin.resource.supported_media_types.join(' / ')}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400">安装方式</p>
                    <p className="mt-1 font-medium">
                      {controller.activeDetailPlugin.install?.type || 'local'}
                    </p>
                    {controller.activeDetailPlugin.install?.url ? (
                      <p className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">
                        {controller.activeDetailPlugin.install.url}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <p className="text-slate-500 dark:text-slate-400">健康状态</p>
                    <p className="mt-1 font-medium">
                      {controller.activeDetailPlugin.health
                        ? controller.activeDetailPlugin.health.is_healthy
                          ? '健康'
                          : '异常'
                        : '未测试'}
                    </p>
                    {controller.activeDetailPlugin.health?.last_error ? (
                      <p className="mt-2 text-xs text-red-500 dark:text-red-300">
                        {controller.activeDetailPlugin.health.last_error}
                      </p>
                    ) : null}
                  </div>
                </div>

                {controller.activeDetailPlugin.capabilities?.length ? (
                  <div>
                    <p className="mb-2 text-slate-500 dark:text-slate-400">能力</p>
                    <div className="flex flex-wrap gap-2">
                      {controller.activeDetailPlugin.capabilities.map((capability) => (
                        <Badge key={capability} variant="outline">
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {controller.activeDetailPlugin.config_schema?.length ? (
                  <div>
                    <p className="mb-2 text-slate-500 dark:text-slate-400">配置项</p>
                    <div className="space-y-2">
                      {controller.activeDetailPlugin.config_schema.map((field) => (
                        <div key={field.key} className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{field.label || field.key}</p>
                            <Badge variant="outline">{field.type}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {field.description || field.key}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {controller.activeDetailPlugin.url ? (
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">URL</p>
                    <p className="break-all font-medium">{controller.activeDetailPlugin.url}</p>
                  </div>
                ) : null}

                {controller.activeDetailPlugin.homepage ? (
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">主页</p>
                    <p className="break-all font-medium">{controller.activeDetailPlugin.homepage}</p>
                  </div>
                ) : null}
              </div>

              {!controller.isReadOnly && controller.activeDetailPlugin.plugin_type === 'custom' ? (
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
              ) : null}
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

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <Label>版本</Label>
                    <Input
                      value={controller.editForm.version}
                      onChange={(event) =>
                        controller.setEditForm((prev) => ({
                          ...prev,
                          version: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>分类</Label>
                    <Input
                      value={controller.editForm.category}
                      onChange={(event) =>
                        controller.setEditForm((prev) => ({
                          ...prev,
                          category: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label>能力</Label>
                  <Input
                    value={controller.editForm.capabilitiesText}
                    onChange={(event) =>
                      controller.setEditForm((prev) => ({
                        ...prev,
                        capabilitiesText: event.target.value,
                      }))
                    }
                    placeholder="resource.search, resource.search.handoff"
                  />
                </div>

                <div>
                  <Label>标签</Label>
                  <AdminTagMultiSelect
                    scope="plugin"
                    value={controller.editForm.tags}
                    options={controller.tagOptions}
                    loading={controller.isTagOptionsLoading}
                    creating={controller.isCreatingTag}
                    updatingTagId={controller.updatingTagId}
                    deletingTagId={controller.deletingTagId}
                    onChange={(nextTags) =>
                      controller.setEditForm((prev) => ({
                        ...prev,
                        tags: nextTags,
                      }))
                    }
                    onCreateTag={controller.handleCreateTag}
                    onUpdateTag={controller.handleUpdateTag}
                    onDeleteTag={controller.handleDeleteTag}
                    allowManageOptions
                    searchPlaceholder="搜索或新增插件标签"
                    placeholder="选择一个插件标签，或搜索后新增"
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

  return (
    <PluginManageSurface
      controller={controller}
      listContainerRef={listContainerRef}
      presentation="modal"
    />
  );
};
