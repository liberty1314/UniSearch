import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminDeleteAction } from '../AdminDeleteAction';

describe('AdminDeleteAction', () => {
  it('使用统一删除动作样式呈现删除按钮', () => {
    render(<AdminDeleteAction aria-label="删除频道 test" onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: '删除频道 test' });
    expect(button).toHaveClass('admin-delete-action');
    expect(button).toHaveClass('bg-rose-50/85');
    expect(screen.getByText('删除')).toBeInTheDocument();
  });

  it('删除中状态会禁用按钮', () => {
    render(<AdminDeleteAction isLoading onClick={vi.fn()} />);

    expect(screen.getByRole('button', { name: '删除' })).toBeDisabled();
  });
});
