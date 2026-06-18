import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserService } from '@/services/userService';

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: getMock,
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('通过独立管理员统计接口获取用户统计摘要', async () => {
    getMock.mockResolvedValue({
      total_users: 12,
      month_new_users: 4,
      seven_day_active_users: 7,
      inactive_30_day_users: 2,
    });

    const stats = await UserService.getUserStats();

    expect(getMock).toHaveBeenCalledWith('/admin/users/stats');
    expect(stats.month_new_users).toBe(4);
    expect(stats.seven_day_active_users).toBe(7);
  });
});
