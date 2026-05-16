import { useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import {
  buildAdminUrl,
  DEFAULT_ADMIN_VIEW,
  isAdminView,
  type AdminView,
} from "@/lib/adminRoute";

export function useAdminPageController() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuthStore();
  
  const currentView = useMemo<AdminView>(() => {
    const viewParam = new URLSearchParams(location.search).get("view");
    return isAdminView(viewParam) ? viewParam : DEFAULT_ADMIN_VIEW;
  }, [location.search]);

  useEffect(() => {
    if (!isAdmin) {
      toast.error("需要管理员权限");
      navigate("/login");
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    document.title = "UniSearch - 管理后台";
    return () => {
      document.title = "UniSearch";
    };
  }, []);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(location.search);
    const viewParam = nextSearchParams.get("view");
    if (viewParam === currentView) {
      return;
    }
    nextSearchParams.set("view", currentView);
    setSearchParams(nextSearchParams, { replace: true });
  }, [currentView, location.search, setSearchParams]);

  const setCurrentView = useCallback(
    (view: AdminView) => {
      navigate(buildAdminUrl(view));
    },
    [navigate],
  );

  return {
    currentView,
    setCurrentView,
  };
}
