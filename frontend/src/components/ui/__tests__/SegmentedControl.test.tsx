import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from '@/components/ui/SegmentedControl';

describe('SegmentedControl', () => {
  it('支持选择、禁用和 aria-pressed 状态', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SegmentedControl
        ariaLabel="榜单模式"
        value="trend"
        onChange={onChange}
        options={[
          { value: 'trend', label: '趋势榜' },
          { value: 'popular', label: '热门榜' },
          { value: 'year', label: '年度榜', disabled: true },
        ]}
      />,
    );

    expect(screen.getByRole('button', { name: '趋势榜' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '热门榜' }));
    expect(onChange).toHaveBeenCalledWith('popular');
    expect(screen.getByRole('button', { name: '年度榜' })).toBeDisabled();
  });

  it('默认保持选项单行展示', () => {
    render(
      <SegmentedControl
        ariaLabel="内容分类"
        value="movie"
        onChange={vi.fn()}
        options={[
          { value: 'all', label: '全部' },
          { value: 'movie', label: '电影' },
          { value: 'tv', label: '电视剧' },
          { value: 'anime', label: '动漫' },
        ]}
        testId="category-segmented-control"
      />,
    );

    expect(screen.getByTestId('category-segmented-control').className).toContain('flex-nowrap');
    expect(screen.getByTestId('category-segmented-control').className).toContain('rounded-[1rem]');
  });

  it('支持 21st 分段按钮风格的胶囊变体', () => {
    render(
      <SegmentedControl
        ariaLabel="主题偏好"
        value="system"
        onChange={vi.fn()}
        options={[
          { value: 'system', label: '跟随系统' },
          { value: 'light', label: '浅色' },
          { value: 'dark', label: '深色' },
        ]}
        testId="account-theme-segmented-control"
        variant="pill"
      />,
    );

    expect(screen.getByTestId('account-theme-segmented-control').className).toContain('rounded-[1.35rem]');
    expect(screen.getByTestId('account-theme-segmented-control').className).toContain('shadow-[0_10px_24px_rgba(15,23,42,0.08)]');
    expect(screen.getByRole('button', { name: '跟随系统' }).className).toContain('rounded-[1rem]');
    expect(screen.getByRole('button', { name: '跟随系统' }).className).toContain('bg-[#2554e8]');
    expect(screen.getByRole('button', { name: '浅色' }).className).toContain('hover:bg-blue-50/80');
  });
});
