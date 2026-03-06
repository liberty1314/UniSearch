import React from 'react';
import { CheckCircle2, Loader2, Plus, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  AddPluginForm,
  URLTestStatus,
} from './pluginManageDialogShared';

interface PluginAddDialogProps {
  open: boolean;
  isAdding: boolean;
  isTestingUrl: boolean;
  addForm: AddPluginForm;
  urlTestResult: URLTestStatus;
  urlTestMessage: string;
  onOpenChange: (open: boolean) => void;
  onAddFormChange: (updater: (prev: AddPluginForm) => AddPluginForm) => void;
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
  urlTestResult,
  urlTestMessage,
  onOpenChange,
  onAddFormChange,
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
              <Label>插件名称 *</Label>
              <Input
                value={addForm.name}
                onChange={(event) =>
                  onAddFormChange((prev) => ({ ...prev, name: event.target.value }))
                }
                onKeyDown={onAddFormKeyDown}
                placeholder="例如：my-custom-plugin"
              />
            </div>
            <div>
              <Label>优先级</Label>
              <Input
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
            <Label>URL *</Label>
            <div className="flex items-center gap-2">
              <Input
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
            <Label>描述</Label>
            <Input
              value={addForm.description}
              onChange={(event) =>
                onAddFormChange((prev) => ({ ...prev, description: event.target.value }))
              }
              onKeyDown={onAddFormKeyDown}
              placeholder="填写插件用途、资源类型等说明"
            />
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
