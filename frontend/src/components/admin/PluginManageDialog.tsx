import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AdminDialogMode } from "@/types/admin";
import type { PluginInfo } from "@/types/plugin";
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
    onSetCategoryFilter: controller.setCategoryFilter,
    onSetCapabilityFilter: controller.setCapabilityFilter,
    onBatchToggle: (nextEnabled) => void controller.handleBatchTogglePlugins(nextEnabled),
    onBatchTest: () => void controller.handleBatchTest(),
    onToggleSelectFiltered: controller.handleToggleSelectFiltered,
    onSelectPlugin: controller.selectKey,
    onOpenDetail: controller.handleOpenDetail,
    onTestPlugin: (plugin) => void controller.handleTestPlugin(plugin),
    onTogglePluginEnabled: (plugin) => void controller.handleTogglePluginEnabled(plugin),
    onPageChange: controller.setCurrentPage,
  };

  const workspaceNode = presentation === 'modal'
    ? createPortal(<PluginManageWorkspace workspace={workspace} />, document.body)
    : <PluginManageWorkspace workspace={workspace} />;

  return (
    <>
      {workspaceNode}

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
                    <p className="font-medium">内置插件</p>
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
                          {field.type === 'number' ? (
                            <label className="mt-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
                              {field.label || field.key}
                              <input
                                aria-label={field.label || field.key}
                                type="number"
                                className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                value={String(controller.pluginConfigValues[field.key] ?? field.default ?? '')}
                                disabled={controller.isReadOnly || controller.isPluginConfigLoading || controller.isPluginConfigSaving}
                                onChange={(event) =>
                                  controller.handlePluginConfigValueChange(field.key, event.target.value)
                                }
                              />
                            </label>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {!controller.isReadOnly ? (
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3"
                        onClick={() => void controller.handleSavePluginConfig()}
                        disabled={controller.isPluginConfigLoading || controller.isPluginConfigSaving}
                      >
                        {controller.isPluginConfigSaving ? '保存中' : '保存配置'}
                      </Button>
                    ) : null}
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

            </>
          ) : null}
        </DialogContent>
      </Dialog>
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
