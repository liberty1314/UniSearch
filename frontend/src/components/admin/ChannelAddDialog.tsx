import React from 'react';
import { Loader2, Plus } from 'lucide-react';
import type { AdminTagOption } from "@/types/admin";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AdminTagMultiSelect } from './AdminTagMultiSelect';

interface ChannelAddDialogProps {
  open: boolean;
  isAdding: boolean;
  newChannelName: string;
  newChannelTags: string[];
  tagOptions: AdminTagOption[];
  isTagOptionsLoading: boolean;
  isCreatingTag: boolean;
  updatingTagId: number | null;
  deletingTagId: number | null;
  onOpenChange: (open: boolean) => void;
  onChannelNameChange: (value: string) => void;
  onChannelTagsChange: (value: string[]) => void;
  onCreateTag: (name: string) => Promise<AdminTagOption | null>;
  onUpdateTag: (id: number, name: string) => Promise<AdminTagOption | null>;
  onDeleteTag: (id: number) => Promise<boolean>;
  onSubmit: () => void;
}

export function ChannelAddDialog({
  open,
  isAdding,
  newChannelName,
  newChannelTags,
  tagOptions,
  isTagOptionsLoading,
  isCreatingTag,
  updatingTagId,
  deletingTagId,
  onOpenChange,
  onChannelNameChange,
  onChannelTagsChange,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
  onSubmit,
}: ChannelAddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加频道</DialogTitle>
          <DialogDescription>输入频道名称（例如 `tgsearchers3`）</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label htmlFor="add-channel-name">频道名称 *</Label>
          <Input
            id="add-channel-name"
            value={newChannelName}
            onChange={(event) => onChannelNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !isAdding && newChannelName.trim()) {
                event.preventDefault();
                onSubmit();
              }
            }}
            placeholder="tgsearchers3"
          />
          <div>
            <Label htmlFor="add-channel-tags">标签</Label>
            <div id="add-channel-tags">
              <AdminTagMultiSelect
                scope="channel"
                value={newChannelTags}
                options={tagOptions}
                loading={isTagOptionsLoading}
                creating={isCreatingTag}
                updatingTagId={updatingTagId}
                deletingTagId={deletingTagId}
                onChange={onChannelTagsChange}
                onCreateTag={onCreateTag}
                onUpdateTag={onUpdateTag}
                onDeleteTag={onDeleteTag}
                allowManageOptions
                placeholder="选择一个频道标签，或搜索后新增"
                searchPlaceholder="搜索或新增频道标签"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSubmit} disabled={isAdding || !newChannelName.trim()}>
            {isAdding ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
