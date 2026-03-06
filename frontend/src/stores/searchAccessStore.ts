import { create } from 'zustand';
import { useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { getErrorStatus } from '@/lib/error';
import { useAuthStore } from '@/stores/authStore';

export type SearchAccessStatus =
  | 'anonymous'
  | 'session_only'
  | 'search_ready'
  | 'api_key_only';

interface SearchAccessState {
  status: SearchAccessStatus;
  isLoading: boolean;
  initialized: boolean;
  refresh: (options?: { force?: boolean; silent?: boolean }) => Promise<SearchAccessStatus>;
  overrideStatus: (status: SearchAccessStatus) => void;
  reset: () => void;
}

interface APIKeyInfo {
  api_key: string;
}

interface AuthSnapshot {
  isAuthenticated: boolean;
  isAdmin: boolean;
  token: string | null;
  apiKey: string | null;
  username: string | null;
}

const API_KEY_STATE_CACHE_TTL_MS = 30000;

let cachedBoundKeyState: { hasBoundKey: boolean; expiresAt: number; authKey: string } | null = null;
let boundKeyRequestInFlight: Promise<boolean> | null = null;

function readAuthSnapshot(): AuthSnapshot {
  const { isAuthenticated, isAdmin, token, apiKey, username } = useAuthStore.getState();
  return { isAuthenticated, isAdmin, token, apiKey, username };
}

function getAuthCacheKey(snapshot: AuthSnapshot): string {
  return [
    snapshot.isAdmin ? 'admin' : 'user',
    snapshot.username ?? '',
    snapshot.token ?? '',
    snapshot.apiKey ?? '',
  ].join('::');
}

function getImmediateStatus(snapshot: AuthSnapshot): SearchAccessStatus | null {
  if (!snapshot.isAuthenticated || (!snapshot.token && !snapshot.apiKey)) {
    return 'anonymous';
  }
  if (snapshot.isAdmin) {
    return 'search_ready';
  }
  if (snapshot.apiKey) {
    return 'api_key_only';
  }
  if (snapshot.token) {
    return null;
  }
  return 'anonymous';
}

function writeBoundKeyCache(hasBoundKey: boolean, snapshot: AuthSnapshot): void {
  cachedBoundKeyState = {
    hasBoundKey,
    expiresAt: Date.now() + API_KEY_STATE_CACHE_TTL_MS,
    authKey: getAuthCacheKey(snapshot),
  };
}

async function loadHasBoundKey(snapshot: AuthSnapshot, force = false): Promise<boolean> {
  const now = Date.now();
  const authKey = getAuthCacheKey(snapshot);

  if (!force && cachedBoundKeyState && cachedBoundKeyState.expiresAt > now && cachedBoundKeyState.authKey === authKey) {
    return cachedBoundKeyState.hasBoundKey;
  }

  if (!force && boundKeyRequestInFlight) {
    return boundKeyRequestInFlight;
  }

  boundKeyRequestInFlight = (async () => {
    try {
      await apiClient.get<APIKeyInfo>('/user/apikey');
      writeBoundKeyCache(true, snapshot);
      return true;
    } catch (error) {
      if (getErrorStatus(error) === 404) {
        writeBoundKeyCache(false, snapshot);
        return false;
      }
      throw error;
    }
  })();

  try {
    return await boundKeyRequestInFlight;
  } finally {
    boundKeyRequestInFlight = null;
  }
}

export const useSearchAccessStore = create<SearchAccessState>((set, get) => ({
  status: 'anonymous',
  isLoading: false,
  initialized: false,

  refresh: async ({ force = false, silent = false } = {}) => {
    const snapshot = readAuthSnapshot();
    const immediateStatus = getImmediateStatus(snapshot);

    if (immediateStatus) {
      set({
        status: immediateStatus,
        isLoading: false,
        initialized: true,
      });
      return immediateStatus;
    }

    if (!silent) {
      set({ isLoading: true });
    }

    try {
      const hasBoundKey = await loadHasBoundKey(snapshot, force);
      const latestSnapshot = readAuthSnapshot();
      const latestImmediateStatus = getImmediateStatus(latestSnapshot);
      const nextStatus = latestImmediateStatus ?? (hasBoundKey ? 'search_ready' : 'session_only');

      set({
        status: nextStatus,
        isLoading: false,
        initialized: true,
      });

      return nextStatus;
    } catch {
      const latestSnapshot = readAuthSnapshot();
      const latestImmediateStatus = getImmediateStatus(latestSnapshot);
      const fallbackStatus = latestImmediateStatus ?? (get().initialized ? get().status : 'session_only');
      set({
        status: fallbackStatus,
        isLoading: false,
        initialized: true,
      });
      return fallbackStatus;
    }
  },

  overrideStatus: (status) => {
    const snapshot = readAuthSnapshot();

    if (status === 'search_ready') {
      writeBoundKeyCache(true, snapshot);
    } else if (status === 'session_only') {
      writeBoundKeyCache(false, snapshot);
    } else {
      cachedBoundKeyState = null;
    }

    set({
      status,
      isLoading: false,
      initialized: true,
    });
  },

  reset: () => {
    cachedBoundKeyState = null;
    boundKeyRequestInFlight = null;
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
  const apiKey = useAuthStore((state) => state.apiKey);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = useAuthStore((state) => state.isAdmin);
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
  }, [apiKey, autoRefresh, isAdmin, isAuthenticated, refresh, token]);

  return {
    status,
    isLoading,
    initialized,
    refresh,
    overrideStatus,
  };
}
