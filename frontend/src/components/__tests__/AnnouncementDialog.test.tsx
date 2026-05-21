import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AnnouncementDialog } from '@/components/AnnouncementDialog';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
    h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h2 {...props}>{children}</h2>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

describe('AnnouncementDialog', () => {
  it('默认关闭时不会永久标记为不再提示', () => {
    const onOpenChange = vi.fn();
    const onDismiss = vi.fn();

    render(
      <AnnouncementDialog
        open
        onOpenChange={onOpenChange}
        announcement={{
          id: 7,
          title: '系统维护通知',
          content: '<p>今晚维护</p>',
          priority: 'high',
          start_time: '2026-04-04T00:00:00Z',
          end_time: null,
          is_enabled: true,
          created_at: '2026-04-04T00:00:00Z',
          updated_at: '2026-04-04T00:00:00Z',
          created_by: 'system',
          updated_by: null,
        }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByRole('dialog', { name: '系统维护通知' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDismiss).toHaveBeenCalledWith(7, false);
  });

  it('勾选不再提示后关闭会传递永久忽略标记', () => {
    const onOpenChange = vi.fn();
    const onDismiss = vi.fn();

    render(
      <AnnouncementDialog
        open
        onOpenChange={onOpenChange}
        announcement={{
          id: 9,
          title: '版本更新通知',
          content: '## 新版本说明',
          priority: 'medium',
          start_time: '2026-04-04T00:00:00Z',
          end_time: null,
          is_enabled: true,
          created_at: '2026-04-04T00:00:00Z',
          updated_at: '2026-04-04T00:00:00Z',
          created_by: 'system',
          updated_by: null,
        }}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: '不再提示此公告' }));
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onDismiss).toHaveBeenCalledWith(9, true);
  });
});
