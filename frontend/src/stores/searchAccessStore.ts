import { create } from 'zustand';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export type SearchAccessStatus =
  | 'anonymous'
  | 'authenticated';

interface SearchAccessState {
  status: SearchAccessStatus;
  isLoading: boolean;
  initialized: boolean;
  refresh: () => Promise<SearchAccessStatus>;
  overrideStatus: (status: SearchAccessStatus) => void;
  reset: () => void;
}

interface AuthSnapshot {
  isAuthenticated: boolean;
  isAdmin: boolean;
  token: string | null;
  rememberMe: boolean;
  username: string | null;
}

function readAuthSnapshot(): AuthSnapshot {
  const { isAuthenticated, isAdmin, token, rememberMe, username } = useAuthStore.getState();
  return { isAuthenticated, isAdmin, token, rememberMe, username };
}

function getImmediateStatus(snapshot: AuthSnapshot): SearchAccessStatus {
  if (!snapshot.isAuthenticated || (!snapshot.token && !snapshot.rememberMe)) {
    return 'anonymous';
  }
  return 'authenticated';
}

export const useSearchAccessStore = create<SearchAccessState>((set) => ({
  status: 'anonymous',
  isLoading: false,
  initialized: false,

  refresh: async () => {
    const nextStatus = getImmediateStatus(readAuthSnapshot());
    set({
      status: nextStatus,
      isLoading: false,
      initialized: true,
    });
    return nextStatus;
  },

  overrideStatus: (status) => {
    set({
      status,
      isLoading: false,
      initialized: true,
    });
  },

  reset: () => {
    set({
      status: 'anonymous',
      isLoading: false,
      initialized: false,
    });
  },
}));

export function useSearchAccessStatus(options?: { autoRefresh?: boolean }) {
  const autoRefresh = options?.autoRefresh ?? true;
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const status = useSearchAccessStore((state) => state.status);
  const isLoading = useSearchAccessStore((state) => state.isLoading);
  const initialized = useSearchAccessStore((state) => state.initialized);
  const refresh = useSearchAccessStore((state) => state.refresh);
  const overrideStatus = useSearchAccessStore((state) => state.overrideStatus);

  useEffect(() => {
    if (!autoRefresh) {
      return;
    }
    void refresh();
  }, [autoRefresh, isAuthenticated, refresh, token]);

  return {
    status,
    isLoading,
    initialized,
    refresh,
    overrideStatus,
  };
}
