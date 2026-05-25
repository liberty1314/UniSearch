import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SystemSettingsService } from '@/services/systemSettingsService';

const { getMock, putMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: getMock,
    put: putMock,
  },
}));

describe('SystemSettingsService TMDB admin api', () => {
  beforeEach(() => {
    getMock.mockReset();
    putMock.mockReset();
  });

  it('获取 TMDB 管理配置状态', async () => {
    getMock.mockResolvedValue({
      configured: true,
      updated_at: '2026-05-25T10:00:00Z',
      source: 'secret_manager',
    });

    const result = await SystemSettingsService.getTMDBSettings('token');

    expect(getMock).toHaveBeenCalledWith('/admin/system-settings/tmdb');
    expect(result.configured).toBe(true);
  });

  it('更新 TMDB 读取令牌', async () => {
    putMock.mockResolvedValue({
      configured: true,
      updated_at: '2026-05-25T10:00:00Z',
      source: 'secret_manager',
    });

    const result = await SystemSettingsService.updateTMDBSettings('token', {
      tmdb_read_access_token: 'new-token',
    });

    expect(putMock).toHaveBeenCalledWith('/admin/system-settings/tmdb', {
      tmdb_read_access_token: 'new-token',
    });
    expect(result.source).toBe('secret_manager');
  });
});
