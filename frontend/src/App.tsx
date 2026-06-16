import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { useAutoRefreshToken } from "@/hooks/useAutoRefreshToken";
import AppRoutes from "@/routes/AppRoutes";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { applyThemePreference, readAccountPreferences } from "@/lib/accountPreferences";

const App: React.FC = () => {
  // 启用自动刷新令牌功能
  useAutoRefreshToken();

  // 主题初始化：优先使用个人中心偏好，其次使用系统设置
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const apply = () => {
      applyThemePreference(readAccountPreferences().theme);
    };

    apply();
    const handler = () => {
      if (readAccountPreferences().theme === "system") {
        apply();
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return (
    <GlobalErrorBoundary>
      <Router>
        <AppRoutes />
      </Router>
    </GlobalErrorBoundary>
  );
};

export default App;
