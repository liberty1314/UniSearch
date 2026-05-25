import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSystemSettingsController } from '../useSystemSettingsController';

const getSettingsAdminMock = vi.fn();
const getTMDBSettingsMock = vi.fn();
const updateTMDBSettingsMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ token: 'test-token' }),
}));

vi.mock('@/services/systemSettingsService', () => ({
  SystemSettingsService: {
    getSettingsAdmin: (...args: unknown[]) => getSettingsAdminMock(...args),
    getTMDBSettings: (...args: unknown[]) => getTMDBSettingsMock(...args),
    updateTMDBSettings: (...args: unknown[]) => updateTMDBSettingsMock(...args),
    updateSettings: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe('useSystemSettingsController TMDB config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSettingsAdminMock.mockResolvedValue({
      enable_user_auth: true,
      enable_user_login: true,
      enable_user_signup: true,
      enable_resource_detail_page: false,
      public_site_url: '',
      default_copy_format_template: '',
    });
    getTMDBSettingsMock.mockResolvedValue({
      configured: true,
      updated_at: '2026-05-25T10:00:00Z',
      source: 'secret_manager',
    });
  });

  it('加载时会同步 TMDB 配置状态', async () => {
    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.tmdbConfigured).toBe(true);
    });

    expect(result.current.state.tmdbSource).toBe('secret_manager');
  });

  it('保存成功后会清空输入框并刷新状态', async () => {
    updateTMDBSettingsMock.mockResolvedValue({
      configured: true,
      updated_at: '2026-05-25T12:00:00Z',
      source: 'secret_manager',
    });

    const { result } = renderHook(() => useSystemSettingsController());

    await waitFor(() => {
      expect(result.current.state.isLoading).toBe(false);
    });

    act(() => {
      result.current.actions.setTMDBReadAccessToken('new-token');
    });

    await act(async () => {
      await result.current.actions.handleSaveTMDBConfig();
    });

    expect(updateTMDBSettingsMock).toHaveBeenCalledWith('test-token', {
      tmdb_read_access_token: 'new-token',
    });
    expect(result.current.state.tmdbReadAccessToken).toBe('');
    expect(toastSuccessMock).toHaveBeenCalled();
  });
});
