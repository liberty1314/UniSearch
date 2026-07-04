import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminPageController } from '@/hooks/useAdminPageController';

const { authState, listUsersMock, logoutMock, toastErrorMock, toastSuccessMock } = vi.hoisted(() => ({
  authState: {
    isAdmin: true,
  },
  listUsersMock: vi.fn(),
  logoutMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    ...authState,
    logout: logoutMock,
  }),
}));

vi.mock('@/services/userService', () => ({
  UserService: {
    listUsers: listUsersMock,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}));

const ControllerProbe = () => {
  const { currentView, setCurrentView } = useAdminPageController();
  const location = useLocation();

  return (
    <div>
      <div data-testid="current-view">{currentView}</div>
      <div data-testid="location">{`${location.pathname}${location.search}`}</div>
      <button onClick={() => setCurrentView('system_settings')}>go settings</button>
      <button onClick={() => setCurrentView('channel_management')}>go channels</button>
      <button onClick={() => setCurrentView('plugin_management')}>go plugins</button>
      <button onClick={() => setCurrentView('plugin_observability')}>go plugin metrics</button>
    </div>
  );
};

describe('useAdminPageController', () => {
  beforeEach(() => {
    authState.isAdmin = true;
    listUsersMock.mockReset();
    listUsersMock.mockResolvedValue({
      users: [],
      total: 0,
      total_pages: 0,
      page: 1,
    });
    logoutMock.mockReset();
    toastErrorMock.mockReset();
    toastSuccessMock.mockReset();
  });

  const renderProbe = (initialEntry: string) =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin" element={<ControllerProbe />} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    );

  it('canonicalizes bare admin urls to the underscore default view', async () => {
    renderProbe('/admin');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=system_info');
    });
    expect(screen.getByTestId('current-view')).toHaveTextContent('system_info');
  });

  it('treats legacy hyphenated views as invalid and falls back to the underscore default', async () => {
    renderProbe('/admin?view=system-info');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=system_info');
    });
    expect(screen.getByTestId('current-view')).toHaveTextContent('system_info');
  });

  it('keeps valid underscore views and syncs later sidebar changes back to the url', async () => {
    const user = userEvent.setup();

    renderProbe('/admin?view=user_management');

    expect(screen.getByTestId('current-view')).toHaveTextContent('user_management');
    expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=user_management');

    await user.click(screen.getByRole('button', { name: 'go settings' }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=system_settings');
    });
    expect(screen.getByTestId('current-view')).toHaveTextContent('system_settings');
  });

  it('recognizes the channel management view as a legal admin view', async () => {
    renderProbe('/admin?view=channel_management');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=channel_management');
    });
    expect(screen.getByTestId('current-view')).toHaveTextContent('channel_management');
  });

  it('recognizes the plugin management view as a legal admin view', async () => {
    renderProbe('/admin?view=plugin_management');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=plugin_management');
    });
    expect(screen.getByTestId('current-view')).toHaveTextContent('plugin_management');
  });

  it('recognizes the plugin observability view as a legal admin view', async () => {
    renderProbe('/admin?view=plugin_observability');

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/admin?view=plugin_observability');
    });
    expect(screen.getByTestId('current-view')).toHaveTextContent('plugin_observability');
  });
});
