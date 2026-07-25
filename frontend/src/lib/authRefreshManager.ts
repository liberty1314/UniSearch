import axios from 'axios';
import type { RefreshTokenResponse } from "@/types/auth";
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { useAuthStore } from '@/stores/authStore';

type WrappedRefreshResponse = {
  code: number;
  message: string;
  data: RefreshTokenResponse;
};

// 刷新令牌位于 httpOnly cookie 中，需携带凭据；使用独立实例避免递归 401 处理。
const refreshClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshInFlight: Promise<RefreshTokenResponse> | null = null;

function unwrapRefreshResponse(data: unknown): RefreshTokenResponse {
  if (
    data &&
    typeof data === 'object' &&
    'code' in data &&
    'data' in data
  ) {
    return (data as WrappedRefreshResponse).data;
  }
  return data as RefreshTokenResponse;
}

export async function refreshAuthTokenSingleFlight(): Promise<RefreshTokenResponse> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    // 刷新令牌通过 httpOnly cookie 自动随请求发送，前端不再持有其明文。
    // 设备指纹仍随 body 传入用于绑定校验。
    const deviceFingerprint = await getDeviceFingerprint();
    const response = await refreshClient.post(
      '/auth/refresh',
      {
        device_fingerprint: deviceFingerprint,
      }
    );

    const payload = unwrapRefreshResponse(response.data);
    if (!payload?.access_token) {
      throw new Error('刷新令牌失败：服务器未返回有效数据');
    }

    // 轮转后的刷新令牌由后端通过 Set-Cookie 下发，前端仅更新内存 access token。
    const latestState = useAuthStore.getState();
    latestState.setToken(
      payload.access_token,
      latestState.username || 'user',
      latestState.isAdmin,
      true
    );

    return payload;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}
