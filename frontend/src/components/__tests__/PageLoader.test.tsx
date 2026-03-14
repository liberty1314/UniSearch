import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PageLoader from '@/components/PageLoader';

afterEach(() => {
  vi.useRealTimers();
});

describe('PageLoader', () => {
  it('renders a bottom progress rail with stage label and percentage', () => {
    const { container } = render(<PageLoader isLoading={true} />);

    const markup = container.innerHTML;
    expect(screen.getByText('正在唤醒搜索引擎')).toBeInTheDocument();
    expect(screen.getByText('同步导航、主题与搜索能力')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'UniSearch' })).not.toBeInTheDocument();
    expect(screen.getByText('Search Core')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(markup).toContain('data-testid="page-loader-bottom-progress"');
    expect(markup).toContain('data-testid="page-loader-progress-track"');
    expect(markup).toContain('data-testid="page-loader-stage"');
    expect(markup).toContain('data-testid="page-loader-orbit"');
    expect(markup).toContain('motion-reduce:animate-none');
    expect(markup).toContain('to-cyan-500');
    expect(markup).toContain('via-blue-500');
    expect(markup).not.toContain('via-purple-500');
    expect(markup).not.toContain('to-pink-500');
    expect(markup).not.toContain('from-nebula-500');
  });

  it('shows completion copy and keeps the fade-out completion callback flow', async () => {
    vi.useFakeTimers();

    const onComplete = vi.fn();
    const { container, rerender } = render(<PageLoader isLoading={true} onComplete={onComplete} />);

    rerender(<PageLoader isLoading={false} onComplete={onComplete} />);

    expect(screen.getByText('启动完成')).toBeInTheDocument();
    expect(screen.getByText('即将进入 UniSearch 工作区')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    fireEvent.transitionEnd(container.firstElementChild as HTMLElement);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
