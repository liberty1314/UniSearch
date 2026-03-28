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
let searchHistoryState: string[] = [];

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
  useSearchHistory: () => searchHistoryState,
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
    searchHistoryState = [];
  });

  it('shows up to six recent searches when the input is focused', async () => {
    searchHistoryState = ['海贼王', '斗破苍穹', '庆余年', '流浪地球', '仙逆', '凡人修仙传', '三体'];

    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText('搜索网盘资源...'));

    expect(screen.getByText('最近搜索')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除历史记录 海贼王' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除历史记录 凡人修仙传' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '删除历史记录 三体' })).not.toBeInTheDocument();
  });

  it('renders plain history labels and keeps delete buttons pinned to the top-right corner', async () => {
    searchHistoryState = ['海贼王'];

    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText('搜索网盘资源...'));

    const historyButton = screen.getByRole('button', { name: '使用历史记录搜索 海贼王' });
    const deleteButton = screen.getByRole('button', { name: '删除历史记录 海贼王' });
    const deleteButtonClassName = deleteButton.getAttribute('class') ?? '';

    expect(historyButton.querySelector('svg')).toBeNull();
    expect(deleteButtonClassName).toContain('-top-1.5');
    expect(deleteButtonClassName).toContain('-right-1.5');
  });

  it('does not render the history panel when there is no search history', async () => {
    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText('搜索网盘资源...'));

    expect(screen.queryByText('最近搜索')).not.toBeInTheDocument();
  });

  it('uses the shared glass surface for the search shell and history popover', async () => {
    searchHistoryState = ['海贼王'];

    render(<SearchBox />);

    const searchShell = screen.getByTestId('search-box-surface');
    expect(searchShell).toHaveAttribute('data-glass-surface', 'true');
    expect(searchShell).toHaveAttribute('data-glass-variant', 'search');
    expect(searchShell).toHaveClass('dark:group-focus-within:border-cyan-300/32');
    expect(searchShell).toHaveClass('dark:group-focus-within:shadow-[0_36px_72px_rgba(8,145,178,0.28)]');

    await userEvent.click(screen.getByPlaceholderText('搜索网盘资源...'));

    const historyPopover = screen.getByTestId('search-history-surface');
    expect(historyPopover).toHaveAttribute('data-glass-surface', 'true');
    expect(historyPopover).toHaveAttribute('data-glass-variant', 'popover');
    expect(historyPopover).toHaveClass('dark:bg-[#08111f]/96');
    expect(historyPopover).toHaveClass('dark:border-slate-800/80');

    const historyHeader = screen.getByTestId('search-history-header');
    expect(historyHeader).toHaveClass('dark:bg-[linear-gradient(180deg,rgba(8,15,28,0.74),rgba(8,15,28,0.54))]');
    expect(historyHeader).toHaveClass('dark:border-slate-800/80');

    const historyList = screen.getByTestId('search-history-list');
    expect(historyList).toHaveClass('dark:bg-[linear-gradient(180deg,rgba(10,18,32,0.92),rgba(8,15,28,0.82))]');

    const historyItem = screen.getByRole('button', { name: '使用历史记录搜索 海贼王' });
    expect(historyItem).toHaveClass('dark:border-slate-700/80');
    expect(historyItem).toHaveClass('dark:bg-[linear-gradient(180deg,rgba(10,18,32,0.94),rgba(8,15,28,0.84))]');
  });

  it('searches and collapses the history panel after selecting a history item', async () => {
    searchHistoryState = ['仙逆', '凡人修仙传'];
    performSearchMock.mockResolvedValue(undefined);

    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText('搜索网盘资源...'));
    await userEvent.click(screen.getByRole('button', { name: '使用历史记录搜索 仙逆' }));

    await waitFor(() => {
      expect(setSearchParamsMock).toHaveBeenCalledWith({ keyword: '仙逆' });
    });
    expect(performSearchMock).toHaveBeenCalledWith({ keyword: '仙逆' });
    await waitFor(() => {
      expect(screen.queryByText('最近搜索')).not.toBeInTheDocument();
    });
  });

  it('removes a single history item without triggering a search', async () => {
    searchHistoryState = ['海贼王'];

    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText('搜索网盘资源...'));
    await userEvent.click(screen.getByRole('button', { name: '删除历史记录 海贼王' }));

    expect(removeFromHistoryMock).toHaveBeenCalledWith('海贼王');
    expect(performSearchMock).not.toHaveBeenCalled();
  });

  it('clears history and closes the panel', async () => {
    searchHistoryState = ['海贼王', '三体'];

    render(<SearchBox />);

    await userEvent.click(screen.getByPlaceholderText('搜索网盘资源...'));
    await userEvent.click(screen.getByRole('button', { name: '清空记录' }));

    expect(clearHistoryMock).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText('最近搜索')).not.toBeInTheDocument();
    });
  });

  it('closes the history panel when escape is pressed', async () => {
    searchHistoryState = ['海贼王'];

    render(<SearchBox />);

    const input = screen.getByPlaceholderText('搜索网盘资源...');
    await userEvent.click(input);
    expect(screen.getByText('最近搜索')).toBeInTheDocument();

    await userEvent.type(input, '{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('最近搜索')).not.toBeInTheDocument();
    });
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
