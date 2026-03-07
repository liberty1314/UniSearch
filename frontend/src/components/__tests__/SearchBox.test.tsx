import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from '@/components/SearchBox';

const {
  performSearchMock,
  setSearchParamsMock,
  clearHistoryMock,
  removeFromHistoryMock,
  navigateMock,
  warningToastMock,
  errorToastMock,
  resolveDefaultAuthEntryPathMock,
  logoutMock,
} = vi.hoisted(() => ({
  performSearchMock: vi.fn(),
  setSearchParamsMock: vi.fn(),
  clearHistoryMock: vi.fn(),
  removeFromHistoryMock: vi.fn(),
  navigateMock: vi.fn(),
  warningToastMock: vi.fn(),
  errorToastMock: vi.fn(),
  resolveDefaultAuthEntryPathMock: vi.fn(),
  logoutMock: vi.fn(),
}));

let authState = {
  token: 'jwt-token' as string | null,
  apiKey: null as string | null,
  isAdmin: false,
};

let searchAccessStatus: 'anonymous' | 'session_only' | 'search_ready' | 'api_key_only' = 'session_only';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/stores/searchStore', () => ({
  useSearchStore: () => ({
    searchParams: { keyword: '' },
    setSearchParams: setSearchParamsMock,
    performSearch: performSearchMock,
    clearHistory: clearHistoryMock,
    removeFromHistory: removeFromHistoryMock,
    isLoading: false,
  }),
  useSearchHistory: () => [],
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    ...authState,
    logout: logoutMock,
  }),
}));

vi.mock('@/stores/searchAccessStore', () => ({
  useSearchAccessStatus: () => ({
    status: searchAccessStatus,
  }),
}));

vi.mock('@/services/systemSettingsService', () => ({
  SystemSettingsService: {
    resolveDefaultAuthEntryPath: resolveDefaultAuthEntryPathMock,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    warning: warningToastMock,
    error: errorToastMock,
  },
}));

vi.mock('@/components/ui/stateful-button', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  const StatefulButton = React.forwardRef<
    { run: (fn: () => Promise<void>) => Promise<void>; reset: () => void },
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >(({ children, onClick, ...props }, ref) => {
    React.useImperativeHandle(ref, () => ({
      run: (fn) => fn(),
      reset: vi.fn(),
    }));

    return (
      <button type="button" onClick={onClick} {...props}>
        {children}
      </button>
    );
  });

  StatefulButton.displayName = 'StatefulButton';

  return {
    Button: StatefulButton,
  };
});

describe('SearchBox', () => {
  beforeEach(() => {
    performSearchMock.mockReset();
    setSearchParamsMock.mockReset();
    clearHistoryMock.mockReset();
    removeFromHistoryMock.mockReset();
    navigateMock.mockReset();
    warningToastMock.mockReset();
    errorToastMock.mockReset();
    resolveDefaultAuthEntryPathMock.mockReset();
    logoutMock.mockReset();

    authState = {
      token: 'jwt-token',
      apiKey: null,
      isAdmin: false,
    };
    searchAccessStatus = 'session_only';
  });

  it('routes token-only users to API key binding on 403 search errors', async () => {
    performSearchMock.mockRejectedValue({
      code: 403,
      message: '请先绑定 API Key 后再进行搜索',
    });

    render(<SearchBox />);

    await userEvent.type(screen.getByPlaceholderText('搜索网盘资源...'), '仙逆');
    await userEvent.click(screen.getByRole('button', { name: '搜索' }));

    await waitFor(() => {
      expect(warningToastMock).toHaveBeenCalledWith('请先绑定 API Key 后再进行搜索', { duration: 3000 });
    });
    expect(navigateMock).toHaveBeenCalledWith('/settings/apikey');
  });

  it('logs out expired JWT sessions and sends them back to /login', async () => {
    searchAccessStatus = 'search_ready';
    performSearchMock.mockRejectedValue({
      code: 401,
      message: '登录状态已失效，请重新登录',
    });

    render(<SearchBox />);

    await userEvent.type(screen.getByPlaceholderText('搜索网盘资源...'), '凡人修仙传');
    await userEvent.click(screen.getByRole('button', { name: '搜索' }));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalled();
    });
    expect(errorToastMock).toHaveBeenCalledWith('登录状态已失效，请重新登录');
    expect(navigateMock).toHaveBeenCalledWith('/login');
  });

  it('uses system settings to choose the unauthenticated entry route', async () => {
    authState = {
      token: null,
      apiKey: null,
      isAdmin: false,
    };
    searchAccessStatus = 'anonymous';
    resolveDefaultAuthEntryPathMock.mockResolvedValue('/apikey');
    performSearchMock.mockRejectedValue({
      code: 401,
      message: '请先使用 API Key 登录后再进行搜索',
    });

    render(<SearchBox />);

    await userEvent.type(screen.getByPlaceholderText('搜索网盘资源...'), '流浪地球');
    await userEvent.click(screen.getByRole('button', { name: '搜索' }));

    await waitFor(() => {
      expect(resolveDefaultAuthEntryPathMock).toHaveBeenCalled();
    });
    expect(warningToastMock).toHaveBeenCalledWith('请先使用 API Key 登录后再进行搜索', { duration: 3000 });
    expect(navigateMock).toHaveBeenCalledWith('/apikey');
  });
});
