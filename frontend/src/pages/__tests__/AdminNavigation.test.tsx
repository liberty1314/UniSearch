import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Admin from '@/pages/Admin';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    isAdmin: true,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/components/admin/SystemInfoView', () => ({
  SystemInfoView: () => <div>SystemInfoView</div>,
}));

vi.mock('@/components/admin/SystemSettingsView', () => ({
  SystemSettingsView: () => <div>SystemSettingsView</div>,
}));

vi.mock('@/components/admin/AnnouncementManagement', () => ({
  AnnouncementManagement: () => <div>AnnouncementManagement</div>,
}));

vi.mock('@/components/admin/ChannelManagementView', () => ({
  ChannelManagementView: () => <div>ChannelManagementView</div>,
}));

vi.mock('@/components/admin/PluginManagementView', () => ({
  PluginManagementView: () => <div>PluginManagementView</div>,
}));

vi.mock('@/components/admin/AdminUsersView', () => ({
  default: () => <div>AdminUsersView</div>,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

describe('Admin 导航集成', () => {
  beforeEach(() => {
    document.title = '初始标题';
  });

  it('系统设置固定放在导航末尾', async () => {
    render(
      <MemoryRouter initialEntries={['/admin?view=system_info']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <>
                <LocationProbe />
                <Admin />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    const nav = screen.getAllByRole('navigation', { name: '后台模块导航' })[0];
    const labels = within(nav)
      .getAllByRole('button')
      .map((button) => button.textContent?.trim().replace(/\s+/g, ' '));

    expect(labels.at(-1)).toBe('系统设置');
  });

  it('点击侧边栏后会同步切换 URL 与页面内容', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/admin?view=plugin_management']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <>
                <LocationProbe />
                <Admin />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('PluginManagementView')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=plugin_management');

    await user.click(screen.getAllByRole('button', { name: 'Telegram 频道' })[0]);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=channel_management');
    });
    expect(await screen.findByText('ChannelManagementView')).toBeInTheDocument();
    expect(screen.queryByText('PluginManagementView')).not.toBeInTheDocument();
  });
});
