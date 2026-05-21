import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementPanel } from '@/components/AnnouncementPanel';
import { useAnnouncementStore } from '@/stores/announcementStore';

const getActiveAnnouncementsMock = vi.fn();

vi.mock('@/services/announcementService', () => ({
  AnnouncementService: {
    getActiveAnnouncements: (...args: unknown[]) => getActiveAnnouncementsMock(...args),
  },
}));

const announcement = {
  id: 201,
  title: '面板公告',
  content: '# 面板内容',
  priority: 'medium' as const,
  start_time: '2026-05-21T00:00:00Z',
  end_time: null,
  is_enabled: true,
  created_at: '2026-05-21T00:00:00Z',
  updated_at: '2026-05-21T00:00:00Z',
  created_by: 'admin',
  updated_by: null,
};

function PanelHarness() {
  const [open, setOpen] = React.useState(true);
  return <AnnouncementPanel open={open} onOpenChange={setOpen} />;
}

describe('AnnouncementPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    useAnnouncementStore.getState().reset();
    useAnnouncementStore.setState({
      activeAnnouncements: [announcement],
      readStatus: {},
      isAnnouncementsLoading: false,
      featureEnabled: true,
      error: null,
    });
    getActiveAnnouncementsMock.mockReset();
    getActiveAnnouncementsMock.mockResolvedValue([announcement]);
  });

  it('在公告面板中勾选不再提示后会持久标记已读', async () => {
    const user = userEvent.setup();

    render(<PanelHarness />);

    await user.click(await screen.findByRole('button', { name: /面板公告/i }));
    await user.click(await screen.findByRole('checkbox', { name: '不再提示此公告' }));
    await user.click(screen.getByRole('button', { name: '我知道了' }));

    await waitFor(() => {
      expect(useAnnouncementStore.getState().isRead(201)).toBe(true);
    });
  });
});
