import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { ACCOUNT_PREFERENCES_STORAGE_KEY } from '@/lib/accountPreferences';

describe('AnimatedThemeToggler', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      writable: true,
      value: undefined,
    });
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

  it('视图过渡动画从点击瞬间的坐标开始，避免主题切换后布局重算导致圆心偏移', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 600,
    });

    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      writable: true,
      value: vi.fn((callback: () => void) => {
        callback();
        return { ready: Promise.resolve() };
      }),
    });

    const animateSpy = vi
      .spyOn(document.documentElement, 'animate')
      .mockReturnValue({ cancel: vi.fn() } as unknown as Animation);

    render(<AnimatedThemeToggler />);

    const button = screen.getByRole('button', { name: '切换主题' });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      x: 300,
      y: 200,
      top: 200,
      left: 300,
      bottom: 240,
      right: 340,
      width: 40,
      height: 40,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.click(button, { clientX: 128, clientY: 96, detail: 1 });

    await waitFor(() => expect(animateSpy).toHaveBeenCalled());

    expect(animateSpy).toHaveBeenCalledWith(
      {
        clipPath: [
          'circle(0px at 128px 96px)',
          'circle(840px at 128px 96px)',
        ],
      },
      {
        duration: 400,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      }
    );
  });

  it('键盘触发主题切换时使用按钮中心作为视图过渡圆心', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 600,
    });

    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      writable: true,
      value: vi.fn((callback: () => void) => {
        callback();
        return { ready: Promise.resolve() };
      }),
    });

    const animateSpy = vi
      .spyOn(document.documentElement, 'animate')
      .mockReturnValue({ cancel: vi.fn() } as unknown as Animation);

    render(<AnimatedThemeToggler />);

    const button = screen.getByRole('button', { name: '切换主题' });
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
      x: 380,
      y: 280,
      top: 280,
      left: 380,
      bottom: 320,
      right: 420,
      width: 40,
      height: 40,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.click(button, { clientX: 0, clientY: 0, detail: 0 });

    await waitFor(() => expect(animateSpy).toHaveBeenCalled());

    expect(animateSpy).toHaveBeenCalledWith(
      {
        clipPath: [
          'circle(0px at 400px 300px)',
          'circle(500px at 400px 300px)',
        ],
      },
      {
        duration: 400,
        easing: 'ease-in-out',
        pseudoElement: '::view-transition-new(root)',
      }
    );
  });
});
