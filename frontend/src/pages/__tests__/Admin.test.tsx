import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Admin from '@/pages/Admin';

const { currentViewState } = vi.hoisted(() => ({
  currentViewState: {
    value: 'user_management',
  },
}));

vi.mock('@/hooks/useAdminPageController', () => ({
  useAdminPageController: () => ({
    currentView: currentViewState.value,
    setCurrentView: vi.fn(),
  }),
}));

vi.mock('@/components/admin/Sidebar', () => ({
  Sidebar: () => <div>Sidebar</div>,
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

vi.mock('@/components/admin/PluginPerformanceDashboard', () => ({
  PluginPerformanceDashboard: () => <div>PluginPerformanceDashboard</div>,
}));

vi.mock('@/components/admin/AdminUsersView', () => ({
  default: () => (
    <>
      <div>AdminUsersView</div>
      <div data-testid="confirm-dialog">确认删除用户</div>
    </>
  ),
}));

vi.mock('@/components/admin/BatchDeleteDialog', () => ({
  BatchDeleteDialog: () => null,
}));

vi.mock('@/components/admin/BatchUpdateRoleDialog', () => ({
  BatchUpdateRoleDialog: () => null,
}));

vi.mock('@/components/admin/CreateUserDialog', () => ({
  CreateUserDialog: () => null,
}));

vi.mock('@/components/admin/EditUserDialog', () => ({
  EditUserDialog: () => null,
}));

vi.mock('@/components/admin/ResetPasswordDialog', () => ({
  ResetPasswordDialog: () => null,
}));

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: ({ title }: { title: string }) => <div data-testid="confirm-dialog">{title}</div>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const renderAdmin = () =>
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Admin />
    </MemoryRouter>
  );

describe('Admin', () => {
  beforeEach(() => {
    currentViewState.value = 'user_management';
  });

  it('使用纯白浅色页背景', () => {
    const { container } = renderAdmin();

    expect(container.firstChild).toHaveClass('bg-white');
    expect(container.firstChild).toHaveClass('obsidian-shell');
  });

  it('在用户管理视图通过共享 ConfirmDialog 入口渲染确认框', async () => {
    renderAdmin();

    expect(await screen.findByText('确认删除用户')).toBeInTheDocument();
    expect(screen.getAllByTestId('confirm-dialog')).toHaveLength(1);
  });

  it('在频道管理视图渲染独立页面', async () => {
    currentViewState.value = 'channel_management';

    renderAdmin();

    expect(await screen.findByText('ChannelManagementView')).toBeInTheDocument();
    expect(screen.queryByText('AdminUsersView')).not.toBeInTheDocument();
  });

  it('在插件管理视图渲染独立页面', async () => {
    currentViewState.value = 'plugin_management';

    renderAdmin();

    expect(await screen.findByText('PluginManagementView')).toBeInTheDocument();
    expect(screen.queryByText('AdminUsersView')).not.toBeInTheDocument();
  });

  it('在插件性能监控视图渲染独立页面', async () => {
    currentViewState.value = 'plugin_observability';

    renderAdmin();

    expect(await screen.findByText('PluginPerformanceDashboard')).toBeInTheDocument();
    expect(screen.queryByText('AdminUsersView')).not.toBeInTheDocument();
  });
});
