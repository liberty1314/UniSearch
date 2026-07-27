import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, LogOut, Menu, User } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Sidebar } from "@/components/admin/Sidebar";
import { useAdminPageController } from "@/hooks/useAdminPageController";
import { useAdminStore } from "@/stores/adminStore";
import { useAuthStore } from "@/stores/authStore";
import { AuthService } from "@/services/authService";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  ADMIN_CONTENT_WRAPPER_CLASSES,
  ADMIN_PANEL_SURFACE_CLASSES,
  ADMIN_PAGE_BACKDROP_CLASSES,
  ADMIN_PAGE_SHELL_CLASSES,
} from "@/components/admin/adminDesign";
import { BLUE_CYAN_TEXT_GRADIENT_WITH_DARK } from "@/lib/brandTheme";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SystemInfoView = lazy(() =>
  import("@/components/admin/SystemInfoView").then((module) => ({
    default: module.SystemInfoView,
  }))
);
const SystemSettingsView = lazy(() =>
  import("@/components/admin/SystemSettingsView").then((module) => ({
    default: module.SystemSettingsView,
  }))
);
const AnnouncementManagement = lazy(() =>
  import("@/components/admin/AnnouncementManagement").then((module) => ({
    default: module.AnnouncementManagement,
  }))
);
const ChannelManagementView = lazy(() =>
  import("@/components/admin/ChannelManagementView").then((module) => ({
    default: module.ChannelManagementView,
  }))
);
const PluginManagementView = lazy(() =>
  import("@/components/admin/PluginManagementView").then((module) => ({
    default: module.PluginManagementView,
  }))
);
const PerformanceObservabilityView = lazy(() =>
  import("@/components/admin/PerformanceObservabilityView").then((module) => ({
    default: module.PerformanceObservabilityView,
  }))
);
const AdminUsersView = lazy(() => import("@/components/admin/AdminUsersView"));
const BannedIPView = lazy(() => import("@/components/admin/BannedIPView"));
const SearchAuditView = lazy(() => import("@/components/admin/SearchAuditView"));
const AdminAuditView = lazy(() => import("@/components/admin/AdminAuditView"));

const adminViewTitles = {
  system_info: "系统监控",
  user_management: "用户管理",
  banned_ip_management: "IP 封禁",
  search_audit: "搜索审计",
  admin_audit: "操作审计",
  channel_management: "Telegram 频道",
  plugin_management: "插件中心",
  plugin_observability: "性能监控",
  system_settings: "系统设置",
  announcement_management: "公告管理",
} as const;

const AdminWorkspaceFallback: React.FC = () => (
  <div className={cn(ADMIN_PANEL_SURFACE_CLASSES, "flex min-h-[360px] items-center justify-center p-8")}>
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500 dark:border-slate-700 dark:border-t-cyan-400" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">正在载入管理工作区</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">请稍候，数据面板马上就绪</p>
      </div>
    </div>
  </div>
);

const Admin: React.FC = () => {
  const { currentView, setCurrentView } = useAdminPageController();
  const { toggleMobileSidebar } = useAdminStore();
  const { username, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const currentTitle = adminViewTitles[currentView] ?? "管理后台";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    try {
      await AuthService.revokeRefreshToken();
    } catch (error) {
      console.error("退出登录时撤销 refresh token 失败:", error);
    }

    logout();
    toast.success("已退出登录");
    setIsUserMenuOpen(false);
    navigate("/");
  };

  return (
    <div className="obsidian-shell bg-white dark:bg-slate-950">
      <header className="fixed inset-x-0 top-0 z-40 h-20 glass shadow-[0_16px_36px_rgba(14,165,233,0.12)] backdrop-blur-xl transition-all duration-300 ease-in-out">
        <div className="container mx-auto grid h-full grid-cols-[auto_1fr_auto] items-center gap-4 px-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              aria-label="打开后台菜单"
              onClick={toggleMobileSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-all duration-300 hover:bg-gray-100/50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-cyan-200 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              to="/"
              state={{ skipHomeEntrance: true }}
              aria-label="返回 UniSearch 首页"
              className="group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-2 py-2 transition-all duration-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 sm:px-3"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
                <img
                  src="/Uni.png?v=20250908"
                  alt="UniSearch"
                  className="relative z-10 h-8 w-8 object-contain transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
                />
              </div>
              <span className={`${BLUE_CYAN_TEXT_GRADIENT_WITH_DARK} hidden text-xl font-bold transition-all duration-300 group-hover:tracking-wide sm:inline`}>
                UniSearch
              </span>
            </Link>
          </div>

          <h1 className="sr-only">{currentTitle}</h1>

          <div className="col-start-3 flex items-center justify-end gap-2">
            <button
              type="button"
              aria-label="后台通知"
              className="hidden rounded-xl p-2 text-gray-600 transition-all duration-300 hover:bg-gray-100/50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-cyan-200 sm:inline-flex"
            >
              <Bell className="h-5 w-5" />
            </button>
            <AnimatedThemeToggler className="relative rounded-xl p-2 text-gray-600 transition-all duration-300 hover:bg-gray-100/50 hover:text-cyan-700 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-cyan-200" />
            <div className="relative hidden md:block" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((isOpen) => !isOpen)}
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
                aria-controls="admin-user-menu"
                className={cn(
                  "flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
                  isUserMenuOpen
                    ? "border-cyan-200/60 bg-white/70 text-blue-600 dark:border-cyan-300/20 dark:bg-white/10 dark:text-cyan-300"
                    : "border-transparent bg-white/35 text-gray-700 hover:bg-white/60 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-bold text-white shadow-sm">
                  {username ? username[0].toUpperCase() : <User className="h-4 w-4" />}
                </span>
                <span className="max-w-[120px] truncate pr-1">{username || "管理员"}</span>
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    id="admin-user-menu"
                    role="menu"
                    aria-label="后台用户菜单"
                    data-testid="admin-user-menu"
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="!absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-xl glass-panel shadow-xl overflow-hidden"
                  >
                    <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {username || "管理员"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">管理员</p>
                    </div>

                    <div className="p-1">
                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-cyan-200"
                        role="menuitem"
                      >
                        <User className="h-4 w-4" />
                        <span>个人中心</span>
                      </Link>
                    </div>

                    <div className="border-t border-slate-100 p-1 dark:border-white/10">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>退出登录</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <div className={cn(ADMIN_PAGE_SHELL_CLASSES, "fixed inset-0 top-20 overflow-hidden")}>
        <div className={ADMIN_PAGE_BACKDROP_CLASSES} />

        <div className="relative flex h-full w-full">
          <Sidebar currentView={currentView} onViewChange={setCurrentView} />

          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto lg:pl-[300px]">
            <div className={ADMIN_CONTENT_WRAPPER_CLASSES}>
              <div className="min-w-0 flex-1 space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.5, ease: "easeOut" }}
                  className="space-y-6"
                >
                  <Suspense fallback={<AdminWorkspaceFallback />}>
                    {currentView === "system_info" && <SystemInfoView />}
                    {currentView === "user_management" && <AdminUsersView />}
                    {currentView === "banned_ip_management" && <BannedIPView />}
                    {currentView === "search_audit" && <SearchAuditView />}
                    {currentView === "admin_audit" && <AdminAuditView />}
                    {currentView === "channel_management" && <ChannelManagementView />}
                    {currentView === "plugin_management" && <PluginManagementView />}
                    {currentView === "plugin_observability" && <PerformanceObservabilityView />}
                    {currentView === "system_settings" && <SystemSettingsView />}
                    {currentView === "announcement_management" && <AnnouncementManagement />}
                  </Suspense>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
