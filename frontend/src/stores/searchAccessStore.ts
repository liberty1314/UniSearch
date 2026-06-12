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
  refresh: (options?: { force?: boolean; silent?: boolean }) => Promise<SearchAccessStatus>;
  overrideStatus: (status: SearchAccessStatus) => void;
  reset: () => void;
}

interface AuthSnapshot {
  isAuthenticated: boolean;
  isAdmin: boolean;
  token: string | null;
  refreshToken: string | null;
  username: string | null;
}

function readAuthSnapshot(): AuthSnapshot {
  const { isAuthenticated, isAdmin, token, refreshToken, username } = useAuthStore.getState();
  return { isAuthenticated, isAdmin, token, refreshToken, username };
}

function getImmediateStatus(snapshot: AuthSnapshot): SearchAccessStatus | null {
  if (!snapshot.isAuthenticated || (!snapshot.token && !snapshot.refreshToken)) {
    return 'anonymous';
  }
  return 'authenticated';
}

export const useSearchAccessStore = create<SearchAccessState>((set) => ({
  status: 'anonymous',
  isLoading: false,
  initialized: false,

  refresh: async ({ force = false, silent = false } = {}) => {
    void force;
    void silent;
    const snapshot = readAuthSnapshot();
    const immediateStatus = getImmediateStatus(snapshot);

    const nextStatus = immediateStatus ?? 'anonymous';
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
