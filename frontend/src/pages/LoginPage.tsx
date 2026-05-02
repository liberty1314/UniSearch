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
import { getErrorMessage, getErrorStatus } from "@/lib/error";
import { cn } from "@/lib/utils";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuthStore();

  // System Settings
  const [enableUserSignup, setEnableUserSignup] = useState<boolean>(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true);

  // Form State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
        setEnableUserSignup(settings.enable_user_signup);
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, [navigate]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      toast.error("请输入用户名和密码");
      return;
    }

    setIsLoading(true);
    try {
      const response = await AuthService.userLogin(
        username.trim(),
        password,
        rememberMe,
      );
      if (response && response.access_token) {
        setToken(
          response.access_token,
          response.username,
          false,
          response.refresh_token || null,
        );
        toast.success("登录成功，欢迎访问 UniSearch！");
        const nextKeyword = (
          location.state as { pendingSearch?: { keyword?: string } } | null
        )?.pendingSearch?.keyword?.trim();
        if (nextKeyword) {
          navigate("/", {
            replace: true,
            state: {
              resumeSearch: {
                keyword: nextKeyword,
              },
            },
          });
        } else {
          navigate("/");
        }
      } else {
        toast.error("登录失败：服务器未返回有效令牌");
      }
    } catch (error) {
      console.error("Login failed:", error);
      if (getErrorStatus(error) === 401) {
        toast.error("用户名或密码错误");
      } else if (getErrorStatus(error) === 429) {
        toast.error("请求过于频繁，请稍后再试");
      } else {
        toast.error("登录失败：" + getErrorMessage(error));
      }
    } finally {
      setIsLoading(false);
    }
  };

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

              <div
                className={cn(
                  `${AUTH_ENTRY_FORM_STACK_CLASS} transition-all duration-300`,
                  isLoading && "opacity-60 scale-[0.98]",
                )}
              >
                <AuthInput
                  id="username"
                  label="用户名"
                  tone="blue"
                  icon={<User className="w-4 h-4" />}
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />

                <AuthInput
                  id="password"
                  label="密码"
                  tone="blue"
                  icon={<Lock className="w-4 h-4" />}
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
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
                  onClick={handleLogin}
                  variant="glass"
                  disabled={isLoading || !username.trim() || !password.trim()}
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
              </div>

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
