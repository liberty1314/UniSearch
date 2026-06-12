import { apiClient } from '@/lib/api';
import type {
  AdminLoginRequest,
  AdminLoginResponse,
  LoginRequest,
  LoginResponse,
  LoginWithRememberRequest,
  LoginWithRememberResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  RegisterRequest,
  RegisterResponse,
  RevokeRefreshTokenRequest,
} from '@/types/api';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';

export class AuthService {
  static async register(username: string, password: string): Promise<LoginWithRememberResponse> {
    const request: RegisterRequest = { username, password };
    return apiClient.post<LoginWithRememberResponse>('/auth/register', request);
  }

  static async checkUsername(username: string): Promise<boolean> {
    return apiClient.get<boolean>('/auth/check-username', { params: { username } });
  }

  static async userLogin(
    username: string,
    password: string,
    rememberMe: boolean
  ): Promise<LoginWithRememberResponse> {
    const deviceFingerprint = await getDeviceFingerprint();
    const request: LoginWithRememberRequest = {
      username,
      password,
      remember_me: rememberMe,
      device_fingerprint: deviceFingerprint,
    };

    return apiClient.post<LoginWithRememberResponse>('/auth/login', request);
  }

  static async login(username: string, password: string): Promise<LoginResponse> {
    const request: LoginRequest = { username, password };
    return apiClient.post<LoginResponse>('/auth/login', request);
  }

  static async adminLoginWithRemember(
    username: string,
    password: string,
    rememberMe: boolean
  ): Promise<LoginWithRememberResponse> {
    const deviceFingerprint = await getDeviceFingerprint();
    const request: LoginWithRememberRequest = {
      username,
      password,
      remember_me: rememberMe,
      device_fingerprint: deviceFingerprint,
    };

    return apiClient.post<LoginWithRememberResponse>('/admin/login-remember', request);
  }

  static async adminLogin(username: string, password: string): Promise<AdminLoginResponse> {
    const request: AdminLoginRequest = { username, password };
    return apiClient.post<AdminLoginResponse>('/admin/login', request);
  }

  static async refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const deviceFingerprint = await getDeviceFingerprint();
    const request: RefreshTokenRequest = {
      refresh_token: refreshToken,
      device_fingerprint: deviceFingerprint,
    };

    return apiClient.post<RefreshTokenResponse>('/auth/refresh', request, {
      skipAuthRefresh: true,
    });
  }

  static async revokeRefreshToken(refreshToken: string): Promise<void> {
    const request: RevokeRefreshTokenRequest = {
      refresh_token: refreshToken,
    };

    await apiClient.post('/auth/revoke', request, {
      skipAuthRefresh: true,
    });
  }
}
