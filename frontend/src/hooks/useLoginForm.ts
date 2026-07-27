import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { SystemSettingsService } from '@/services/systemSettingsService';
import { DEFAULT_AUTH_POLICY, resolveAuthPolicy } from '@/lib/authPolicy';
import {
  hasPasswordWhitespace,
  removePasswordWhitespace,
} from '@/components/account/passwordValidation';
import { deriveIsAdminFromToken } from '@/lib/jwt';
import { getErrorDataCode, getErrorMessage, getErrorStatus } from '@/lib/error';
import type { LoginWithRememberResponse } from '@/types/auth';

/**
 * 登录接口调用签名：普通登录与管理员登录都符合此形状
 * （AuthService.userLogin / AuthService.adminLoginWithRemember）。
 */
type LoginRequestFn = (
  username: string,
  password: string,
  rememberMe: boolean,
) => Promise<LoginWithRememberResponse>;

interface UseLoginFormOptions {
  /** 实际调用的登录接口 */
  loginRequest: LoginRequestFn;
  /**
   * 登录成功回调。isAdmin 由后端签发的 access token 解析得到，
   * 不再由调用方（哪个登录页）硬编码。
   */
  onSuccess: (result: { username: string; isAdmin: boolean }) => void;
  /**
   * 是否要求管理员权限。为 true 时，若解析出的角色不是 admin，
   * 则视为无权限，不写入登录态。
   * （后端 /admin/login-remember 已对非管理员返回 403，此为前端兜底。）
   */
  requireAdmin?: boolean;
}

/**
 * 共享登录表单逻辑：表单状态、密码空格归一化、认证策略加载、
 * 统一的提交流程（调接口 → 解析角色 → 写登录态 → 成功/失败提示）。
 *
 * 普通登录页与管理员登录页共用，差异通过 options 参数化，
 * 各自仅保留视觉与文案。
 */
export function useLoginForm({
  loginRequest,
  onSuccess,
  requireAdmin = false,
}: UseLoginFormOptions) {
  const { setToken } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authPolicy, setAuthPolicy] = useState(DEFAULT_AUTH_POLICY);

  useEffect(() => {
    let active = true;
    const loadAuthPolicy = async () => {
      try {
        const settings = await SystemSettingsService.getSettings();
        if (active) {
          setAuthPolicy(resolveAuthPolicy(settings));
        }
      } catch {
        if (active) {
          setAuthPolicy(DEFAULT_AUTH_POLICY);
        }
      }
    };
    void loadAuthPolicy();
    return () => {
      active = false;
    };
  }, []);

  const handlePasswordChange = useCallback((value: string) => {
    if (!hasPasswordWhitespace(value)) {
      setPassword(value);
      return;
    }
    toast.error('密码不能包含空格');
    setPassword(removePasswordWhitespace(value));
  }, []);

  const submit = useCallback(async () => {
    if (isLoading) {
      return;
    }

    if (!username.trim() || !password.trim()) {
      toast.error('请输入用户名和密码');
      return;
    }

    setIsLoading(true);
    try {
      const response = await loginRequest(username.trim(), password, rememberMe);
      if (!response || !response.access_token) {
        toast.error('登录失败：服务器未返回有效令牌');
        return;
      }

      const isAdmin = deriveIsAdminFromToken(response.access_token);
      if (requireAdmin && !isAdmin) {
        toast.error('该账号无管理员权限');
        return;
      }

      setToken(response.access_token, response.username, isAdmin, rememberMe);
      toast.success('登录成功，欢迎访问 UniSearch！');
      onSuccess({ username: response.username, isAdmin });
    } catch (error) {
      console.error('Login failed:', error);
      const status = getErrorStatus(error);
      const errorCode = getErrorDataCode(error);
      if (errorCode === 'LOGIN_DISABLED') {
        toast.error('用户登录功能已关闭');
      } else if (errorCode === 'AUTH_POLICY_UNAVAILABLE') {
        toast.error('认证服务暂时不可用，请稍后重试');
      } else if (status === 401) {
        toast.error('用户名或密码错误');
      } else if (status === 403) {
        toast.error('该账号无管理员权限');
      } else if (status === 429) {
        toast.error('请求过于频繁，请稍后再试');
      } else {
        toast.error('登录失败：' + getErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, username, password, rememberMe, loginRequest, requireAdmin, setToken, onSuccess]);

  return {
    username,
    setUsername,
    password,
    setPassword: handlePasswordChange,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    authPolicy,
    submit,
  };
}
