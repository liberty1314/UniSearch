import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

    expect(screen.getByText('PluginManagementView')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=plugin_management');

    await user.click(screen.getAllByRole('button', { name: 'Telegram 频道' })[0]);

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=channel_management');
    });
    expect(screen.getByText('ChannelManagementView')).toBeInTheDocument();
    expect(screen.queryByText('PluginManagementView')).not.toBeInTheDocument();
  });
});
