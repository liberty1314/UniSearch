import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

describe('ConfirmDialog', () => {
  it('uses the shared glass dialog shell for alert dialogs', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="删除确认"
        description="确认删除当前项目吗？"
        onConfirm={vi.fn()}
      />
    );

    const dialog = screen.getByRole('alertdialog', { name: '删除确认' });
    expect(dialog).toHaveClass('modal-shell-surface');
    expect(screen.getByRole('button', { name: '关闭弹窗' })).toHaveClass('modal-shell-close');
  });
});
