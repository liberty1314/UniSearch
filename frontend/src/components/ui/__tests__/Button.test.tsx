import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../button';

describe('Button', () => {
  it('加载态保持按钮名称并暴露忙碌状态', () => {
    render(<Button loading>测试</Button>);

    const button = screen.getByRole('button', { name: '测试' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('后台动作变体提供圆角和低强度表面反馈', () => {
    render(<Button variant="adminAction">详情</Button>);

    const button = screen.getByRole('button', { name: '详情' });
    expect(button).toHaveClass('rounded-full');
    expect(button).toHaveClass('shadow-[0_4px_12px_rgba(15,23,42,0.04)]');
  });
});
