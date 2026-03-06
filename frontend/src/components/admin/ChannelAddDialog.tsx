import React from 'react';
import { Loader2, Plus } from 'lucide-react';
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

interface ChannelAddDialogProps {
  open: boolean;
  isAdding: boolean;
  newChannelName: string;
  onOpenChange: (open: boolean) => void;
  onChannelNameChange: (value: string) => void;
  onSubmit: () => void;
}

export function ChannelAddDialog({
  open,
  isAdding,
  newChannelName,
  onOpenChange,
  onChannelNameChange,
  onSubmit,
}: ChannelAddDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>添加频道</DialogTitle>
          <DialogDescription>输入频道名称（例如 `tgsearchers3`）</DialogDescription>
        </DialogHeader>

        <div>
          <Label>频道名称 *</Label>
          <Input
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
