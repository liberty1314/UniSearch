import { useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAuthStore();
  
  const currentView = useMemo<AdminView>(() => {
    const viewParam = searchParams.get("view");
    return isAdminView(viewParam) ? viewParam : DEFAULT_ADMIN_VIEW;
  }, [searchParams]);

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
    const viewParam = searchParams.get("view");
    if (viewParam === currentView) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("view", currentView);
    setSearchParams(nextSearchParams, { replace: true });
  }, [currentView, searchParams, setSearchParams]);

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
