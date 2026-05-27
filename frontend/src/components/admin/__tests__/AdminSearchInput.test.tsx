import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AdminSearchInput } from '@/components/admin/AdminSearchInput';

describe('AdminSearchInput', () => {
  it('通过统一输入组件触发搜索关键词变更', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AdminSearchInput
        value=""
        onChange={onChange}
        placeholder="搜索频道名称或错误信息"
      />,
    );

    const input = screen.getByPlaceholderText('搜索频道名称或错误信息');
    await user.type(input, '电影');

    expect(onChange).toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-label', '搜索频道名称或错误信息');
  });
});
