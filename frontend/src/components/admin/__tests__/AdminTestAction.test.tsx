import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminTestAction } from '../AdminTestAction';

describe('AdminTestAction', () => {
  it('使用统一测试动作样式呈现默认测试按钮', () => {
    render(<AdminTestAction onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: '测试' });
    expect(button).toHaveClass('admin-test-action');
    expect(button).toHaveClass('bg-blue-50/85');
  });

  it('测试中状态会展示忙碌语义并禁用按钮', () => {
    render(<AdminTestAction status="testing" onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: '测试' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
  });
});
