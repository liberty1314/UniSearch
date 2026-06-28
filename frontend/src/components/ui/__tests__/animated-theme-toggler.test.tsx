import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { ACCOUNT_PREFERENCES_STORAGE_KEY } from '@/lib/accountPreferences';

describe('AnimatedThemeToggler', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('点击导航主题按钮时同步账户主题偏好并保留其他偏好', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      ACCOUNT_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        theme: 'light',
        resultView: 'list',
        defaultCloudTypes: ['aliyun'],
      })
    );

    render(<AnimatedThemeToggler />);

    await user.click(screen.getByRole('button', { name: '切换主题' }));

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(JSON.parse(localStorage.getItem(ACCOUNT_PREFERENCES_STORAGE_KEY) ?? '{}')).toEqual({
      theme: 'dark',
      resultView: 'list',
      defaultCloudTypes: ['aliyun'],
    });
  });
});
