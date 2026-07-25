import { apiClient } from '@/lib/api';
import type { AdminLoginRequest, AdminLoginResponse, CurrentUserResponse, LoginRequest, LoginResponse, LoginWithRememberRequest, LoginWithRememberResponse, RefreshTokenResponse, RegisterRequest } from "@/types/auth";
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';

export class AuthService {
  static async register(username: string, password: string, captchaToken?: string): Promise<LoginWithRememberResponse> {
    const request: RegisterRequest = { username, password };
    if (captchaToken) {
      request.captcha_token = captchaToken;
    }
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

  static async getCurrentUser(): Promise<CurrentUserResponse> {
    return apiClient.get<CurrentUserResponse>('/user/me');
  }

  // 刷新令牌存于 httpOnly cookie，随请求自动携带，不再从 body 传入。
  // 仅传设备指纹用于服务端校验。
  static async refreshAccessToken(): Promise<RefreshTokenResponse> {
    const deviceFingerprint = await getDeviceFingerprint();
    const request = { device_fingerprint: deviceFingerprint };

    return apiClient.post<RefreshTokenResponse>('/auth/refresh', request, {
      skipAuthRefresh: true,
    });
  }

  // 登出：刷新令牌 cookie 随请求自动携带，服务端撤销并清除该 cookie。
  static async revokeRefreshToken(): Promise<void> {
    await apiClient.post('/auth/revoke', {}, {
      skipAuthRefresh: true,
    });
  }
}
