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
  });
});
