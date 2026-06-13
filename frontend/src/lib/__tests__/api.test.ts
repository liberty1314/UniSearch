import { describe, expect, it } from 'vitest';
import type { AxiosError } from 'axios';
import type { ApiResponse } from '@/types/api';
import { apiClient } from '@/lib/api';

const callHandleError = (error: Partial<AxiosError<ApiResponse>>): string =>
  (apiClient as unknown as { handleError: (err: AxiosError<ApiResponse>) => string }).handleError(
    error as AxiosError<ApiResponse>
  );

describe('apiClient handleError', () => {
  it('maps ECONNABORTED to timeout message', () => {
    const message = callHandleError({
      code: 'ECONNABORTED',
      request: {},
    });

    expect(message).toBe('请求超时，请稍后重试');
  });

  it('keeps generic network message for non-timeout network errors', () => {
    const message = callHandleError({
      code: 'ERR_NETWORK',
      request: {},
    });

    expect(message).toBe('网络连接失败，请检查网络设置');
  });

  it('prefers backend error field when message is missing', () => {
    const message = callHandleError({
      response: {
        status: 500,
        data: {
          error: '数据库写入失败',
        },
      } as unknown as AxiosError<ApiResponse>['response'],
    });

    expect(message).toBe('数据库写入失败');
  });
});
