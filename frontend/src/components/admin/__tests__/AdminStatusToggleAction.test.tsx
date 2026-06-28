import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminStatusToggleAction } from '../AdminStatusToggleAction';

describe('AdminStatusToggleAction', () => {
  it('用 switch 语义突出已启用项目的停用动作', () => {
    render(
      <AdminStatusToggleAction
        enabled
        entityLabel="插件 sidhub"
        onClick={vi.fn()}
      />,
    );

    const toggle = screen.getByRole('switch', { name: '插件 sidhub 当前已启用' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('已启用')).toBeInTheDocument();
    expect(screen.queryByText(/点击停用/)).not.toBeInTheDocument();
    expect(toggle).toHaveClass('admin-status-toggle-action');
    expect(toggle).toHaveClass('bg-emerald-50/85');
  });

  it('用更强的启用文案突出已停用项目的启用动作', () => {
    render(
      <AdminStatusToggleAction
        enabled={false}
        entityLabel="频道 示例"
        onClick={vi.fn()}
      />,
    );

    const toggle = screen.getByRole('switch', { name: '频道 示例 当前已停用' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('已停用')).toBeInTheDocument();
    expect(screen.queryByText(/点击启用/)).not.toBeInTheDocument();
    expect(toggle).toHaveClass('border-slate-200/70');
  });
});
