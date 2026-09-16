import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('在描述与操作区之间渲染自定义内容', () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="清理确认"
        description="将删除 7 天前的记录"
        onConfirm={vi.fn()}
      >
        <div>
          <label htmlFor="days">留存天数</label>
          <input id="days" />
        </div>
      </ConfirmDialog>
    );

    expect(screen.getByLabelText('留存天数')).toBeInTheDocument();
  });

  it('confirmDisabled 为真时禁用确认按钮', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="清理确认"
        description="将删除记录"
        confirmText="确认清理"
        confirmDisabled
        onConfirm={onConfirm}
      />
    );

    const confirmButton = screen.getByRole('button', { name: '确认清理' });
    expect(confirmButton).toBeDisabled();

    await user.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
