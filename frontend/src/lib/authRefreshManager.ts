import axios from 'axios';
import type { RefreshTokenResponse } from '@/types/api';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { useAuthStore } from '@/stores/authStore';

type WrappedRefreshResponse = {
  code: number;
  message: string;
  data: RefreshTokenResponse;
};

const refreshClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
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
    const authStore = useAuthStore.getState();
    if (!authStore.refreshToken) {
      throw new Error('缺少刷新令牌');
    }

    const deviceFingerprint = await getDeviceFingerprint();
    const response = await refreshClient.post(
      '/auth/refresh',
      {
        refresh_token: authStore.refreshToken,
        device_fingerprint: deviceFingerprint,
      }
    );

    const payload = unwrapRefreshResponse(response.data);
    if (!payload?.access_token || !payload?.refresh_token) {
      throw new Error('刷新令牌失败：服务器未返回有效数据');
    }

    const latestState = useAuthStore.getState();
    latestState.setToken(
      payload.access_token,
      latestState.username || 'user',
      latestState.isAdmin,
      payload.refresh_token
    );

    return payload;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}
