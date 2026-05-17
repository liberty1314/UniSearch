import React from 'react';
import { CheckCircle2, Loader2, Plus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminTagOption } from '@/types/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminTagMultiSelect } from './AdminTagMultiSelect';
import type {
  AddPluginForm,
  URLTestStatus,
} from './pluginManageDialogShared';

interface PluginAddDialogProps {
  open: boolean;
  isAdding: boolean;
  isTestingUrl: boolean;
  addForm: AddPluginForm;
  tagOptions: AdminTagOption[];
  isTagOptionsLoading: boolean;
  isCreatingTag: boolean;
  updatingTagId: number | null;
  deletingTagId: number | null;
  urlTestResult: URLTestStatus;
  urlTestMessage: string;
  onOpenChange: (open: boolean) => void;
  onAddFormChange: (updater: (prev: AddPluginForm) => AddPluginForm) => void;
  onCreateTag: (name: string) => Promise<AdminTagOption | null>;
  onUpdateTag: (id: number, name: string) => Promise<AdminTagOption | null>;
  onDeleteTag: (id: number) => Promise<boolean>;
  onAddFormKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onTestURL: () => void;
  onSubmit: () => void;
}

export function PluginAddDialog({
  open,
  isAdding,
  isTestingUrl,
  addForm,
  tagOptions,
  isTagOptionsLoading,
  isCreatingTag,
  updatingTagId,
  deletingTagId,
  urlTestResult,
  urlTestMessage,
  onOpenChange,
  onAddFormChange,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onAddFormKeyDown,
  onReset,
  onTestURL,
  onSubmit,
}: PluginAddDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onReset();
          return;
        }
        onOpenChange(true);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>添加插件</DialogTitle>
          <DialogDescription>新增自定义插件并可选执行 URL 连通性测试</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="add-plugin-name">插件名称 *</Label>
              <Input
                id="add-plugin-name"
                value={addForm.name}
                onChange={(event) =>
                  onAddFormChange((prev) => ({ ...prev, name: event.target.value }))
                }
                onKeyDown={onAddFormKeyDown}
                placeholder="例如：my-custom-plugin"
              />
            </div>
            <div>
              <Label htmlFor="add-plugin-priority">优先级</Label>
              <Input
                id="add-plugin-priority"
                type="number"
                value={addForm.priority}
                onChange={(event) =>
                  onAddFormChange((prev) => ({
                    ...prev,
                    priority: Number.parseInt(event.target.value, 10) || 0,
                  }))
                }
                onKeyDown={onAddFormKeyDown}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="add-plugin-url">URL *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="add-plugin-url"
                value={addForm.url}
                onChange={(event) =>
                  onAddFormChange((prev) => ({ ...prev, url: event.target.value }))
                }
                onKeyDown={onAddFormKeyDown}
                placeholder="https://example.com/api/search?q=关键词"
              />
              <Button
                type="button"
                variant="outline"
                onClick={onTestURL}
                disabled={isTestingUrl || !addForm.url.trim()}
                className="shrink-0 whitespace-nowrap"
              >
                {isTestingUrl ? '测试中...' : '测试URL'}
              </Button>
            </div>
            {urlTestResult !== 'idle' && (
              <p
                className={`mt-2 flex items-center gap-1 text-sm ${
                  urlTestResult === 'success'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {urlTestResult === 'success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {urlTestMessage}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="add-plugin-description">描述</Label>
            <Input
              id="add-plugin-description"
              value={addForm.description}
              onChange={(event) =>
                onAddFormChange((prev) => ({ ...prev, description: event.target.value }))
              }
              onKeyDown={onAddFormKeyDown}
              placeholder="填写插件用途、资源类型等说明"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="add-plugin-version">版本</Label>
              <Input
                id="add-plugin-version"
                value={addForm.version}
                onChange={(event) =>
                  onAddFormChange((prev) => ({ ...prev, version: event.target.value }))
                }
                onKeyDown={onAddFormKeyDown}
                placeholder="例如：1.0.0"
              />
            </div>
            <div>
              <Label htmlFor="add-plugin-category">分类</Label>
              <Input
                id="add-plugin-category"
                value={addForm.category}
                onChange={(event) =>
                  onAddFormChange((prev) => ({ ...prev, category: event.target.value }))
                }
                onKeyDown={onAddFormKeyDown}
                placeholder="例如：search"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="add-plugin-capabilities">能力</Label>
            <Input
              id="add-plugin-capabilities"
              value={addForm.capabilitiesText}
              onChange={(event) =>
                onAddFormChange((prev) => ({ ...prev, capabilitiesText: event.target.value }))
              }
              onKeyDown={onAddFormKeyDown}
              placeholder="例如：resource.search, resource.search.handoff"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              多个能力可用逗号或空格分隔；留空时后端会按搜索插件补齐默认能力。
            </p>
          </div>

          <div>
              <Label htmlFor="add-plugin-tags">标签</Label>
              <div id="add-plugin-tags">
                <AdminTagMultiSelect
                  scope="plugin"
                value={addForm.tags}
                options={tagOptions}
                loading={isTagOptionsLoading}
                creating={isCreatingTag}
                updatingTagId={updatingTagId}
                deletingTagId={deletingTagId}
                onChange={(nextTags) => onAddFormChange((prev) => ({ ...prev, tags: nextTags }))}
                onCreateTag={onCreateTag}
                onUpdateTag={onUpdateTag}
                onDeleteTag={onDeleteTag}
                allowManageOptions
                placeholder="选择一个插件标签，或搜索后新增"
                searchPlaceholder="搜索或新增插件标签"
              />
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              插件标签词库独立维护，不与频道标签互通。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onReset}>
            取消
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isAdding || !addForm.name.trim() || !addForm.url.trim()}
          >
            {isAdding ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            添加插件
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
