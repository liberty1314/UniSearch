import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementProvider } from '@/components/AnnouncementProvider';
import { useAnnouncementStore } from '@/stores/announcementStore';
import { useAuthStore } from '@/stores/authStore';

const getActiveAnnouncementsMock = vi.fn();
const getAnnouncementFeatureEnabledMock = vi.fn();

vi.mock('@/services/announcementService', () => ({
  AnnouncementService: {
    getActiveAnnouncements: (...args: unknown[]) => getActiveAnnouncementsMock(...args),
    getAnnouncementFeatureEnabled: (...args: unknown[]) => getAnnouncementFeatureEnabledMock(...args),
  },
}));

const announcement = {
  id: 101,
  title: '首页公告',
  content: '首页公告内容',
  priority: 'high' as const,
  start_time: '2026-05-20T00:00:00Z',
  end_time: null,
  is_enabled: true,
  created_at: '2026-05-20T00:00:00Z',
  updated_at: '2026-05-20T00:00:00Z',
  created_by: 'admin',
  updated_by: null,
};

describe('AnnouncementProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    useAnnouncementStore.getState().reset();
    useAnnouncementStore.setState({
      readStatus: {},
      featureEnabled: false,
      error: null,
    });
    useAuthStore.setState({
      token: 'token',
      rememberMe: false,
      isAuthenticated: true,
      isAdmin: false,
      username: 'tester',
    });
    getActiveAnnouncementsMock.mockReset();
    getAnnouncementFeatureEnabledMock.mockReset();
    getActiveAnnouncementsMock.mockResolvedValue([announcement]);
    getAnnouncementFeatureEnabledMock.mockResolvedValue(true);
  });

  it('普通关闭公告不会持久标记已读，重新挂载后仍会再次展示', async () => {
    const user = userEvent.setup();

    const firstRender = render(
      <MemoryRouter initialEntries={['/']}>
        <AnnouncementProvider />
      </MemoryRouter>
    );

    expect(await screen.findByRole('dialog', { name: '首页公告' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '我知道了' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '首页公告' })).not.toBeInTheDocument();
    });
    expect(useAnnouncementStore.getState().isRead(101)).toBe(false);

    firstRender.unmount();

    render(
      <MemoryRouter initialEntries={['/']}>
        <AnnouncementProvider />
      </MemoryRouter>
    );

    expect(await screen.findByRole('dialog', { name: '首页公告' })).toBeInTheDocument();
  });

  it('忽略历史公告提醒关闭偏好并继续加载弹出公告', async () => {
    localStorage.setItem(
      'unisearch_account_preferences',
      JSON.stringify({
        theme: 'system',
        resultView: 'merge',
        defaultCloudTypes: [],
        announcementReminder: false,
      })
    );

    render(
      <MemoryRouter initialEntries={['/']}>
        <AnnouncementProvider />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnnouncementFeatureEnabledMock).toHaveBeenCalled();
      expect(getActiveAnnouncementsMock).toHaveBeenCalled();
    });
    expect(await screen.findByRole('dialog', { name: '首页公告' })).toBeInTheDocument();
  });

  it('非首页不会加载用户公告，避免登录页和个人中心边界产生认证请求', async () => {
    render(
      <MemoryRouter initialEntries={['/account']}>
        <AnnouncementProvider />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getAnnouncementFeatureEnabledMock).not.toHaveBeenCalled();
      expect(getActiveAnnouncementsMock).not.toHaveBeenCalled();
    });
  });
});
