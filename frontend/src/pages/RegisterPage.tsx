import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { AuthService } from "@/services/authService";
import { SystemSettingsService } from "@/services/systemSettingsService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Lock,
  UserPlus,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
} from "lucide-react";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthCardShell from "@/components/auth/AuthCardShell";
import AuthInput from "@/components/auth/AuthInput";
import {
  AuthEntryLink,
  AuthEntryLinksRow,
} from "@/components/auth/AuthEntryLink";
import { authVisualPresets } from "@/components/auth/authVisualPresets";
import { useAuthParticles } from "@/components/auth/useAuthParticles";
import AuthSwitchMotion from "@/components/auth/AuthSwitchMotion";
import {
  resolveAuthDirection,
  type AuthTransitionState,
} from "@/components/auth/authRouteMotion";
import {
  AUTH_ENTRY_CARD_BASE_CLASS,
  AUTH_ENTRY_CARD_CONTENT_CLASS,
  AUTH_ENTRY_CARD_DESCRIPTION_CLASS,
  AUTH_ENTRY_CARD_HEADER_CLASS,
  AUTH_ENTRY_CARD_SHELL_CLASS,
  AUTH_ENTRY_CARD_TITLE_CLASS,
  AUTH_ENTRY_FORM_STACK_CLASS,
  AUTH_ENTRY_PAGE_CONTAINER_CLASS,
} from "@/components/auth/authEntryLayout";
import { getErrorDataError, getErrorMessage } from "@/lib/error";
import { cn } from "@/lib/utils";

// ─── 密码强度计算 ─────────────────────────────────────────────────────────────

/**
 * 计算密码强度分值（0 = 太短/空, 1 = 弱, 2 = 中, 3 = 强）
 *
 * 评分规则（满足任意条件 +1 分，基础分为 1）：
 * - 长度 >= 10
 * - 同时包含大写和小写字母
 * - 同时包含数字和特殊字符
 */
const calcPasswordStrength = (pwd: string): 0 | 1 | 2 | 3 => {
  if (!pwd || pwd.length < 6) return 0;
  let score = 0;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score + 1, 3) as 1 | 2 | 3;
};

const STRENGTH_LABELS = ["", "弱", "中", "强"] as const;

const getPasswordStrengthHelperText = (password: string) => {
  if (!password) {
    return "密码长度需在 6-64 个字符之间";
  }

  const passwordStrength = calcPasswordStrength(password);
  const strengthLabel =
    passwordStrength > 0 ? STRENGTH_LABELS[passwordStrength] : "太短";

  return `密码强度：${strengthLabel}`;
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // System Settings
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

  // Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Animation State
  const particles = useAuthParticles();
  const routeState = location.state as AuthTransitionState | null;
  const authDirection = resolveAuthDirection(
    routeState?.from,
    location.pathname,
    routeState,
  );

  // Load Settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await SystemSettingsService.getSettings();

        if (!settings.enable_user_auth || !settings.enable_user_signup) {
          toast.error("用户注册功能已关闭");
          navigate("/login");
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, [navigate]);

  const handleRegister = async () => {
    setSubmitAttempted(true);

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error("请填写完整的注册信息");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (username.length < 3 || username.length > 32) {
      toast.error("用户名长度必须在3-32字符之间");
      return;
    }

    if (password.length < 6 || password.length > 64) {
      toast.error("密码长度必须在6-64字符之间");
      return;
    }

    setIsLoading(true);
    try {
      await AuthService.register(username.trim(), password);
      toast.success("注册成功，请先登录后开始搜索");
      navigate("/login");
    } catch (error) {
      console.error("Register failed:", error);
      const dataError = getErrorDataError(error);
      if (dataError) {
        toast.error(dataError);
      } else {
        toast.error("注册失败：" + getErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const usernameError = !submitAttempted
    ? undefined
    : !username.trim()
      ? "请输入用户名"
      : username.length < 3 || username.length > 32
        ? "用户名长度必须在3-32字符之间"
        : undefined;

  const passwordError = !submitAttempted
    ? undefined
    : !password.trim()
      ? "请输入密码"
      : password.length < 6 || password.length > 64
        ? "密码长度必须在6-64字符之间"
        : undefined;

  const confirmPasswordError = !submitAttempted
    ? undefined
    : !confirmPassword.trim()
      ? "请再次输入密码"
      : password !== confirmPassword
        ? "两次输入的密码不一致"
        : undefined;

  if (isLoadingSettings) return null; // 等待系统配置，此期间页面空白时间极短（30s 缓存命中后几乎无感知）

  return (
    <div className={AUTH_ENTRY_PAGE_CONTAINER_CLASS}>
      <AuthBackground
        preset={authVisualPresets.registerPage}
        particles={particles}
      />

      {/* Register Card */}
      <AuthCardShell
        glowClassName={authVisualPresets.registerPage.cardGlowGradientClass}
        className={AUTH_ENTRY_CARD_SHELL_CLASS}
      >
        <AuthSwitchMotion
          routeKey={location.pathname}
          direction={authDirection}
        >
          <Card
            className={cn(
              AUTH_ENTRY_CARD_BASE_CLASS,
              "border-emerald-200 dark:border-emerald-800",
            )}
          >
            <CardHeader className={AUTH_ENTRY_CARD_HEADER_CLASS}>
              <div className="flex justify-center mb-2">
                <div className="relative group">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
                    <UserPlus className="h-7 w-7 text-white auth-icon-intro" />
                  </div>
                </div>
              </div>
              <CardTitle
                className={cn(
                  AUTH_ENTRY_CARD_TITLE_CLASS,
                  "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent",
                )}
              >
                创建账户
              </CardTitle>
              <CardDescription className={AUTH_ENTRY_CARD_DESCRIPTION_CLASS}>
                完成注册后即可返回登录页继续使用
              </CardDescription>
            </CardHeader>

            <CardContent className={AUTH_ENTRY_CARD_CONTENT_CLASS}>
              {isLoading && (
                <div className="absolute inset-x-0 -top-20 bottom-0 z-10 rounded-xl bg-white/5 backdrop-blur-[2px] transition-all duration-300 dark:bg-gray-900/20" />
              )}

              <div
                className={cn(
                  `${AUTH_ENTRY_FORM_STACK_CLASS} transition-all duration-300`,
                  isLoading && "opacity-60 scale-[0.98]",
                )}
              >
                <AuthInput
                  id="username"
                  label="用户名"
                  tone="emerald"
                  icon={<User className="w-4 h-4" />}
                  type="text"
                  placeholder="3-32个字符"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  error={usernameError}
                />

                <div>
                  <AuthInput
                    id="password"
                    label="密码"
                    tone="emerald"
                    icon={<Lock className="w-4 h-4" />}
                    type={showPassword ? "text" : "password"}
                    placeholder="6-64个字符"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    error={passwordError}
                    helperText={
                      passwordError
                        ? undefined
                        : getPasswordStrengthHelperText(password)
                    }
                    endAdornment={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-slate-200"
                        aria-label={showPassword ? "隐藏密码" : "显示密码"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    }
                  />
                </div>

                <AuthInput
                  id="confirmPassword"
                  label="确认密码"
                  tone="emerald"
                  icon={<Lock className="w-4 h-4" />}
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="请再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                  error={confirmPasswordError}
                  endAdornment={
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-slate-200"
                      aria-label={
                        showConfirmPassword ? "隐藏确认密码" : "显示确认密码"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                />

                <Button
                  onClick={handleRegister}
                  disabled={
                    isLoading ||
                    !username.trim() ||
                    !password.trim() ||
                    !confirmPassword.trim()
                  }
                  className="relative h-12 w-full overflow-hidden bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 font-medium text-white shadow-lg transition-all duration-300 hover:from-emerald-700 hover:via-emerald-600 hover:to-teal-600 hover:shadow-2xl active:scale-[0.98]"
                >
                  <span
                    className={cn(
                      "flex items-center justify-center transition-all duration-300",
                      isLoading
                        ? "opacity-0 scale-90"
                        : "opacity-100 scale-100",
                    )}
                  >
                    立即注册
                  </span>

                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                      <Loader2 className="h-5 w-5 animate-spin drop-shadow-md" />
                    </div>
                  )}
                </Button>
              </div>

              <AuthEntryLinksRow prefixText="已有账号？" className="mt-2">
                <AuthEntryLink
                  to="/login"
                  state={{ authTransition: "backward", from: "/register" }}
                  label="立即登录"
                  icon={LogIn}
                />
              </AuthEntryLinksRow>
            </CardContent>
          </Card>
        </AuthSwitchMotion>
      </AuthCardShell>
    </div>
  );
};

export default RegisterPage;
