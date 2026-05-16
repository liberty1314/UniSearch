import React from "react";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/admin/Sidebar";
import { SystemInfoView } from "@/components/admin/SystemInfoView";
import { SystemSettingsView } from "@/components/admin/SystemSettingsView";
import { AnnouncementManagement } from "@/components/admin/AnnouncementManagement";
import { ChannelManagementView } from "@/components/admin/ChannelManagementView";
import { PluginManagementView } from "@/components/admin/PluginManagementView";
import AdminUsersView from "@/components/admin/AdminUsersView";
import { useAdminPageController } from "@/hooks/useAdminPageController";
import {
  ADMIN_CONTENT_WRAPPER_CLASSES,
  ADMIN_PAGE_BACKDROP_CLASSES,
  ADMIN_PAGE_SHELL_CLASSES,
} from "@/components/admin/adminDesign";
import { cn } from "@/lib/utils";

const Admin: React.FC = () => {
  const { currentView, setCurrentView } = useAdminPageController();

  return (
    <div className="obsidian-shell bg-white dark:bg-black">
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
                  {currentView === "user_management" && <AdminUsersView />}
                  {currentView === "system_info" && <SystemInfoView />}
                  {currentView === "channel_management" && <ChannelManagementView />}
                  {currentView === "plugin_management" && <PluginManagementView />}
                  {currentView === "system_settings" && <SystemSettingsView />}
                  {currentView === "announcement_management" && <AnnouncementManagement />}
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
