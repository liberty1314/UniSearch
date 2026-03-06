import { describe, expect, it } from 'vitest';
import { getErrorDataError, getErrorMessage, getErrorStatus } from '@/lib/error';

describe('error helpers', () => {
  it('reads status and backend error from normalized api client errors', () => {
    const error = {
      code: 409,
      message: '请求失败 (409)',
      data: {
        error: '用户名已存在',
      },
    };

    expect(getErrorStatus(error)).toBe(409);
    expect(getErrorDataError(error)).toBe('用户名已存在');
    expect(getErrorMessage(error)).toBe('请求失败 (409)');
  });

  it('falls back to backend error when message is empty', () => {
    const error = {
      code: 500,
      message: '',
      data: {
        error: '创建用户失败',
      },
    };

    expect(getErrorMessage(error)).toBe('创建用户失败');
  });
});
