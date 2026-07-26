import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthService } from "@/services/authService";
import { SystemSettingsService } from "@/services/systemSettingsService";
import { useLoginForm } from "@/hooks/useLoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  User,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  ArrowRight,
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
import { cn } from "@/lib/utils";
import type { SearchParams } from "@/types/search";

interface RedirectLocationState {
  from?: {
    pathname?: string;
    search?: string;
  };
  pendingSearch?: {
    keyword?: string;
    params?: Partial<SearchParams>;
    fromTrending?: {
      title?: string;
      originalTitle?: string;
      keyword?: string;
    };
  };
}

const resolveRedirectTarget = (
  locationState: RedirectLocationState | null,
  fallback = "/",
) => {
  const pathname = locationState?.from?.pathname;
  const search = locationState?.from?.search || "";
  return pathname ? `${pathname}${search}` : fallback;
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // System Settings
  const [enableUserSignup, setEnableUserSignup] = useState<boolean>(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

  // Animation State
  const particles = useAuthParticles();
  const routeState = location.state as AuthTransitionState | null;
  const redirectState = location.state as RedirectLocationState | null;
  const pendingKeyword = redirectState?.pendingSearch?.keyword?.trim();
  const pendingSearchParams = redirectState?.pendingSearch?.params;
  const authDirection = resolveAuthDirection(
    typeof routeState?.from === "string" ? routeState.from : undefined,
    location.pathname,
    routeState,
  );

  const {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    submit: handleLogin,
  } = useLoginForm({
    loginRequest: AuthService.userLogin,
    onSuccess: () => {
      const redirectTarget = resolveRedirectTarget(redirectState);
      if (pendingKeyword) {
        navigate(redirectTarget, {
          replace: true,
          state: {
            resumeSearch: {
              keyword: pendingKeyword,
              params: pendingSearchParams,
              fromTrending: redirectState?.pendingSearch?.fromTrending,
            },
          },
        });
      } else if (redirectTarget !== "/") {
        navigate(redirectTarget, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    },
  });

  // Load Settings（注册开关：仅本页需要，用于是否展示"注册账号"入口）
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await SystemSettingsService.getSettings();
        setEnableUserSignup(settings.enable_user_signup);
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  return (
    <div className={AUTH_ENTRY_PAGE_CONTAINER_CLASS}>
      <AuthBackground
        preset={authVisualPresets.loginPage}
        particles={particles}
      />

      {/* Login Card */}
      <AuthCardShell
        glowClassName={authVisualPresets.loginPage.cardGlowGradientClass}
        className={AUTH_ENTRY_CARD_SHELL_CLASS}
      >
        <AuthSwitchMotion
          routeKey={location.pathname}
          direction={authDirection}
        >
          <Card
            className={cn(
              AUTH_ENTRY_CARD_BASE_CLASS,
              "border-blue-200 dark:border-blue-800",
            )}
          >
            <CardHeader className={AUTH_ENTRY_CARD_HEADER_CLASS}>
              <div className="flex justify-center mb-2">
                <div className="relative group">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
                    <LogIn className="h-7 w-7 text-white auth-icon-intro" />
                  </div>
                </div>
              </div>
              <CardTitle
                className={cn(
                  AUTH_ENTRY_CARD_TITLE_CLASS,
                  "bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-500 bg-clip-text text-transparent",
                )}
              >
                欢迎回来
              </CardTitle>
              <CardDescription className={AUTH_ENTRY_CARD_DESCRIPTION_CLASS}>
                登录您的 UniSearch 账户
              </CardDescription>
            </CardHeader>

            <CardContent className={AUTH_ENTRY_CARD_CONTENT_CLASS}>
              {/* 加载遮罩与模糊层 */}
              {isLoading && (
                <div className="absolute inset-x-0 -top-20 bottom-0 bg-white/5 dark:bg-gray-900/20 backdrop-blur-[2px] z-10 rounded-xl transition-all duration-300" />
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleLogin();
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
                  tone="blue"
                  icon={<User className="w-4 h-4" />}
                  type="text"
                  autoComplete="username"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />

                {pendingKeyword ? (
                  <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:border-blue-300/20 dark:bg-blue-400/10 dark:text-blue-200">
                    登录后继续搜索：{pendingKeyword}
                  </p>
                ) : null}

                <AuthInput
                  id="password"
                  name="password"
                  label="密码"
                  tone="blue"
                  icon={<Lock className="w-4 h-4" />}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
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

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember-me"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-sm font-medium cursor-pointer"
                  >
                    记住我（30天内自动登录）
                  </Label>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  className="relative h-12 w-full overflow-hidden border-cyan-200/60 bg-gradient-to-r from-blue-600/95 via-blue-500/95 to-cyan-500/95 text-white shadow-glass-strong hover:shadow-glass-strong dark:border-cyan-200/20"
                >
                  {/* 文字淡入淡出 */}
                  <span
                    className={cn(
                      "flex items-center justify-center transition-all duration-300",
                      isLoading
                        ? "opacity-0 scale-90"
                        : "opacity-100 scale-100",
                    )}
                  >
                    登录
                  </span>

                  {/* 光圈 Loader 浮现 */}
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center animate-in fade-in zoom-in duration-300">
                      <Loader2 className="w-5 h-5 animate-spin drop-shadow-md" />
                    </div>
                  )}
                </Button>
              </form>

              <AuthEntryLinksRow className="mt-2">
                {!isLoadingSettings && enableUserSignup && (
                  <AuthEntryLink
                    to="/register"
                    state={{ authTransition: "forward", from: "/login" }}
                    label="注册账号"
                    icon={ArrowRight}
                  />
                )}
              </AuthEntryLinksRow>
            </CardContent>
          </Card>
        </AuthSwitchMotion>
      </AuthCardShell>
    </div>
  );
};

export default LoginPage;
