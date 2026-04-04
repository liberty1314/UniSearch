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
}));

describe('AnnouncementDialog', () => {
  it('renders in the shared dialog shell and preserves dismiss behavior', () => {
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
    expect(onDismiss).toHaveBeenCalledWith(7, true);
  });
});
