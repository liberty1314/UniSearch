import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
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
import TurnstileWidget from "@/components/auth/TurnstileWidget";
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
  getPasswordPolicyHelperText,
  hasPasswordWhitespace,
  removePasswordWhitespace,
  evaluatePasswordStrength,
  passwordByteLength,
  PASSWORD_MAX_BYTES,
} from "@/components/account/passwordValidation";
import { USERNAME_CHARSET_PATTERN } from "@/lib/authPolicy";
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
import { DEFAULT_AUTH_POLICY, resolveAuthPolicy } from "@/lib/authPolicy";
import { cn } from "@/lib/utils";

// ─── 密码强度计算 ─────────────────────────────────────────────────────────────

// 强度标签与后端真实规则对齐：0=不达标（长度/复杂度未满足后端要求）。
const STRENGTH_LABELS = ["不达标", "达标", "良好", "强"] as const;

const getPasswordStrengthHelperText = (
  password: string,
  policy: {
    passwordMinLength: number;
    passwordMaxLength: number;
    passwordComplexityClasses: number;
  },
  focused: boolean,
) => {
  if (!password) {
    return getPasswordPolicyHelperText(policy);
  }

  const passwordStrength = evaluatePasswordStrength(password, policy);
  // 未达标时提示完整规则，帮助用户修正，而非只显示一个模糊标签。
  if (passwordStrength === 0) {
    return getPasswordPolicyHelperText(policy);
  }
  // 肩窥缓解：强度标签会暗示密码构成，仅在输入框聚焦时展示；
  // 失焦后回退为通用规则文本，避免强度提示长时间停留在屏幕上被旁人看到。
  if (!focused) {
    return getPasswordPolicyHelperText(policy);
  }
  return `密码强度：${STRENGTH_LABELS[passwordStrength]}`;
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuthStore();

  // System Settings
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

  // Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [authPolicy, setAuthPolicy] = useState(DEFAULT_AUTH_POLICY);

  // Captcha State
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaProvider, setCaptchaProvider] = useState("turnstile");
  const [captchaSiteKey, setCaptchaSiteKey] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");

  // 人机验证仅在开关开启、provider 为 turnstile 且站点公钥已配置时才真正生效。
  // 缺少 site key 时无法渲染验证组件，此时不得强制校验，否则用户永远无法提交。
  const captchaActive =
    captchaEnabled && captchaProvider === "turnstile" && Boolean(captchaSiteKey);

  const normalizePasswordInput = (value: string) => {
    if (!hasPasswordWhitespace(value)) {
      return value;
    }

    toast.error("密码不能包含空格");
    return removePasswordWhitespace(value);
  };

  // Animation State
  const particles = useAuthParticles();
  const routeState = location.state as AuthTransitionState | null;
  const authDirection = resolveAuthDirection(
    typeof routeState?.from === "string" ? routeState.from : undefined,
    location.pathname,
    routeState,
  );

  // Load Settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await SystemSettingsService.getSettings();
        setAuthPolicy(resolveAuthPolicy(settings));
        setCaptchaEnabled(Boolean(settings.enable_signup_captcha));
        setCaptchaProvider(settings.signup_captcha_provider || "turnstile");
        setCaptchaSiteKey(settings.signup_captcha_site_key || "");

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

  // 明文密码自动隐藏：切到明文查看后 15 秒自动复位为隐藏，
  // 降低离开/截图时密码长时间明文停留在屏幕上的肩窥风险。
  useEffect(() => {
    if (!showPassword) {
      return;
    }
    const timer = setTimeout(() => setShowPassword(false), 15000);
    return () => clearTimeout(timer);
  }, [showPassword]);

  // Real-time username check with debounce
  useEffect(() => {
    const trimmed = username.trim();
    if (
      trimmed.length < authPolicy.usernameMinLength ||
      trimmed.length > authPolicy.usernameMaxLength ||
      !USERNAME_CHARSET_PATTERN.test(trimmed)
    ) {
      // 长度或字符集不合法时不查重：既避免无谓打枚举接口，也与后端约束保持一致。
      setUsernameAvailable(null);
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const available = await AuthService.checkUsername(trimmed);
        setUsernameAvailable(available);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [authPolicy.usernameMaxLength, authPolicy.usernameMinLength, username]);
  // USERNAME_CHARSET_PATTERN 为模块级常量，无需列入依赖。

  const handleRegister = async () => {
    if (isLoading) {
      return;
    }

    setSubmitAttempted(true);

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error("请填写完整的注册信息");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (hasPasswordWhitespace(password) || hasPasswordWhitespace(confirmPassword)) {
      toast.error("密码不能包含空格");
      return;
    }

    if (
      username.trim().length < authPolicy.usernameMinLength ||
      username.trim().length > authPolicy.usernameMaxLength
    ) {
      toast.error(
        `用户名长度必须在${authPolicy.usernameMinLength}-${authPolicy.usernameMaxLength}字符之间`,
      );
      return;
    }

    if (!USERNAME_CHARSET_PATTERN.test(username.trim())) {
      toast.error("用户名只能包含字母、数字、下划线和连字符");
      return;
    }

    if (
      password.length < authPolicy.passwordMinLength ||
      password.length > authPolicy.passwordMaxLength
    ) {
      toast.error(
        `密码长度必须在${authPolicy.passwordMinLength}-${authPolicy.passwordMaxLength}字符之间`,
      );
      return;
    }

    if (captchaActive && !captchaToken) {
      toast.error("请先完成人机验证");
      return;
    }

    // 提交前复位明文显示，避免密码在提交/跳转期间明文停留在屏幕上。
    setShowPassword(false);
    setIsLoading(true);
    try {
      const response = await AuthService.register(
        username.trim(),
        password,
        captchaActive ? captchaToken : undefined,
      );
      if (response && response.access_token) {
        setToken(
          response.access_token,
          response.username,
          false,
          false,
        );
        toast.success("注册成功，已为您自动登录");
        navigate("/", { replace: true });
      } else {
        toast.success("注册成功，请登录");
        navigate("/login");
      }
    } catch (error) {
      console.error("Register failed:", error);
      // Turnstile 令牌为一次性，注册失败后需要重新验证
      if (captchaActive) {
        setCaptchaToken("");
      }
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
    ? (usernameAvailable === false ? "用户名已被占用" : undefined)
    : !username.trim()
      ? "请输入用户名"
      : username.trim().length < authPolicy.usernameMinLength ||
          username.trim().length > authPolicy.usernameMaxLength
        ? `用户名长度必须在${authPolicy.usernameMinLength}-${authPolicy.usernameMaxLength}字符之间`
        : !USERNAME_CHARSET_PATTERN.test(username.trim())
          ? "用户名只能包含字母、数字、下划线和连字符"
          : usernameAvailable === false
            ? "用户名已被占用"
            : undefined;

  const passwordError = !submitAttempted
    ? undefined
    : !password.trim()
      ? "请输入密码"
      : hasPasswordWhitespace(password)
        ? "密码不能包含空格"
      : password.length < authPolicy.passwordMinLength ||
          password.length > authPolicy.passwordMaxLength
        ? `密码长度必须在${authPolicy.passwordMinLength}-${authPolicy.passwordMaxLength}字符之间`
        : undefined;

  // 确认密码：一旦用户开始输入即实时校验"是否一致"，无需等到提交；
  // 空值缺失提示仍仅在提交后给出，避免刚聚焦就报错。
  const confirmPasswordError = confirmPassword
    ? hasPasswordWhitespace(confirmPassword)
      ? "密码不能包含空格"
      : password !== confirmPassword
        ? "两次输入的密码不一致"
        : undefined
    : submitAttempted
      ? "请再次输入密码"
      : undefined;

  if (isLoadingSettings) {
    return (
      <div className={AUTH_ENTRY_PAGE_CONTAINER_CLASS}>
        <AuthBackground
          preset={authVisualPresets.registerPage}
          particles={particles}
        />
        <AuthCardShell
          glowClassName={authVisualPresets.registerPage.cardGlowGradientClass}
          className={AUTH_ENTRY_CARD_SHELL_CLASS}
        >
          <Card
            className={cn(
              AUTH_ENTRY_CARD_BASE_CLASS,
              "border-emerald-200 dark:border-emerald-800",
            )}
          >
            <CardHeader className={AUTH_ENTRY_CARD_HEADER_CLASS}>
              <CardTitle className={AUTH_ENTRY_CARD_TITLE_CLASS}>
                正在加载注册配置...
              </CardTitle>
              <CardDescription className={AUTH_ENTRY_CARD_DESCRIPTION_CLASS}>
                请稍候，系统正在准备注册入口。
              </CardDescription>
            </CardHeader>
            <CardContent className={AUTH_ENTRY_CARD_CONTENT_CLASS}>
              <div
                className={cn(
                  AUTH_ENTRY_FORM_STACK_CLASS,
                  "text-sm text-slate-500 dark:text-slate-400",
                )}
              >
                正在同步系统设置，请稍后继续填写注册信息。
              </div>
            </CardContent>
          </Card>
        </AuthCardShell>
      </div>
    );
  }

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

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleRegister();
                }}
                className={cn(
                  `${AUTH_ENTRY_FORM_STACK_CLASS} transition-all duration-300`,
                  isLoading && "opacity-60 scale-[0.98]",
                )}
              >
                <AuthInput
                  id="username"
                  name="username"
                  label="用户名"
                  tone="emerald"
                  icon={<User className="w-4 h-4" />}
                  type="text"
                  autoComplete="username"
                  placeholder={`${authPolicy.usernameMinLength}-${authPolicy.usernameMaxLength}个字符（字母、数字、下划线、连字符）`}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  error={usernameError}
                  helperText={usernameError ? undefined : "仅支持字母、数字、下划线（_）和连字符（-）"}
                  disabled={isLoading}
                  endAdornment={
                    isCheckingUsername ? (
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    ) : usernameAvailable === true ? (
                      <span className="text-emerald-500 text-xs font-medium px-2">可用</span>
                    ) : null
                  }
                />

                <div>
                  <AuthInput
                    id="password"
                    name="password"
                    label="密码"
                    tone="emerald"
                    icon={<Lock className="w-4 h-4" />}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={`${authPolicy.passwordMinLength}-${authPolicy.passwordMaxLength}个字符`}
                    value={password}
                    onChange={(e) => setPassword(normalizePasswordInput(e.target.value))}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    error={passwordError}
                    disabled={isLoading}
                    helperText={
                      passwordError
                        ? undefined
                        : getPasswordStrengthHelperText(password, authPolicy, passwordFocused)
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
                  name="confirmPassword"
                  label="确认密码"
                  tone="emerald"
                  icon={<Lock className="w-4 h-4" />}
                  type="password"
                  autoComplete="new-password"
                  placeholder="请再次输入密码"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(normalizePasswordInput(e.target.value))}
                  onPaste={(e) => e.preventDefault()}
                  error={confirmPasswordError}
                  disabled={isLoading}
                />

                {captchaActive && (
                  <div className="flex justify-center">
                    <TurnstileWidget
                      siteKey={captchaSiteKey}
                      onVerify={setCaptchaToken}
                      onExpire={() => setCaptchaToken("")}
                      onError={() => setCaptchaToken("")}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  className="relative h-12 w-full overflow-hidden border-emerald-200/60 bg-gradient-to-r from-emerald-600/95 via-emerald-500/95 to-teal-500/95 font-medium text-white shadow-glass-strong transition-all duration-300 hover:shadow-glass-strong dark:border-emerald-200/20"
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
              </form>

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
