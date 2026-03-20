import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UserApiKeySettings from '@/pages/UserApiKeySettings';

const { apiClientGet } = vi.hoisted(() => ({
  apiClientGet: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');

  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    token: 'token',
    apiKey: null,
    isAuthenticated: true,
  }),
}));

vi.mock('@/stores/searchAccessStore', () => ({
  useSearchAccessStatus: () => ({
    refresh: vi.fn(),
    overrideStatus: vi.fn(),
  }),
}));

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: apiClientGet,
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/components/ui/confirm-dialog', () => ({
  ConfirmDialog: () => null,
}));

vi.mock('@/components/ui/animated-grid-pattern', () => ({
  AnimatedGridPattern: ({ className }: { className?: string }) => (
    <div data-testid="animated-grid" className={className} />
  ),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => <div {...props}>{children}</div>,
    button: ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => <button {...props}>{children}</button>,
  },
}));

describe('UserApiKeySettings', () => {
  beforeEach(() => {
    apiClientGet.mockReset();
    apiClientGet.mockResolvedValue({
      api_key: '<API_KEY>',
      expires_at: '2026-03-27T00:00:00Z',
      daily_search_limit: 10,
      today_search_count: 3,
      remaining_searches: 7,
      is_valid: true,
    });
  });

  it('uses the shared homepage grid-backed page shell', async () => {
    const { container } = render(<UserApiKeySettings />);
    await screen.findByText('当前密钥状态');

    expect(container.firstChild).toHaveClass('bg-white');
    expect(container.firstChild).not.toHaveClass('bg-gray-50');
    expect(container.firstChild).toHaveClass('dark:from-gray-900');
    expect(screen.getByTestId('animated-grid')).toBeInTheDocument();
    expect(screen.getByTestId('public-page-glow')).toBeInTheDocument();
  });

  it('renders plain white panels after loading api key data', async () => {
    render(<UserApiKeySettings />);

    await screen.findByText('当前密钥状态');

    expect(screen.getByTestId('apikey-hero-card')).toHaveClass('bg-white');
    expect(screen.getByTestId('apikey-hero-card')).not.toHaveClass('bg-[linear-gradient(145deg,rgba(248,250,252,0.96),rgba(239,246,255,0.92))]');
    expect(screen.getAllByTestId('apikey-stat-card')).toHaveLength(4);
    expect(screen.getAllByTestId('apikey-stat-icon')).toHaveLength(4);
    expect(screen.getByTestId('apikey-page-summary')).toBeInTheDocument();
    expect(screen.getAllByTestId('apikey-stat-card')[0]).toHaveClass('bg-white');
  });
});
