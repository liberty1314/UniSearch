import React, { Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/admin/Sidebar";
import { useAdminPageController } from "@/hooks/useAdminPageController";
import {
  ADMIN_CONTENT_WRAPPER_CLASSES,
  ADMIN_PANEL_SURFACE_CLASSES,
  ADMIN_PAGE_BACKDROP_CLASSES,
  ADMIN_PAGE_SHELL_CLASSES,
} from "@/components/admin/adminDesign";
import { cn } from "@/lib/utils";

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

  return (
    <div className="obsidian-shell bg-white dark:bg-slate-950">
      <div className={cn(ADMIN_PAGE_SHELL_CLASSES, "fixed inset-0 top-16 overflow-hidden")}>
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
