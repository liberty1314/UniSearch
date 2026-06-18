import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from '../Sidebar';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => {
      const { initial, animate, exit, transition, layoutId, whileHover, whileTap, ...rest } = props;
      void initial;
      void animate;
      void exit;
      void transition;
      void layoutId;
      void whileHover;
      void whileTap;
      return <div {...rest}>{children}</div>;
    },
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => {
      const { initial, animate, exit, transition, layoutId, whileHover, whileTap, ...rest } = props;
      void initial;
      void animate;
      void exit;
      void transition;
      void layoutId;
      void whileHover;
      void whileTap;
      return <button {...rest}>{children}</button>;
    },
  },
}));

vi.mock('@/stores/adminStore', () => ({
  useAdminStore: () => ({
    isMobileSidebarOpen: false,
    setMobileSidebarOpen: vi.fn(),
  }),
}));

describe('Sidebar', () => {
  it('为激活态和非激活态导航使用高对比夜间主题 token', () => {
    const { container } = render(<Sidebar currentView="system_info" onViewChange={vi.fn()} />);

    expect(screen.getAllByText('系统监控')[0].closest('button')).toHaveClass('dark:text-cyan-300');
    expect(screen.getAllByText('Telegram 频道')[0].closest('button')).toHaveClass('dark:hover:bg-cyan-400/[0.08]');
    expect(container.innerHTML).toContain('dark:bg-[linear-gradient(135deg,rgba(8,47,73,0.66),rgba(2,6,23,0.82))]');
    expect(container.innerHTML).toContain('dark:border-cyan-300/[0.18]');
  });
});
