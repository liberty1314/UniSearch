import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { ACCOUNT_PREFERENCES_STORAGE_KEY } from '@/lib/accountPreferences';

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

const createDeferred = (): Deferred => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
};

const setViewport = (width = 800, height = 600) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: height,
  });
};

const mockThemeMediaQueries = ({ reduceMotion = false, darkMode = false } = {}) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduceMotion : darkMode,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const setStartViewTransition = (value: unknown) => {
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    writable: true,
    value,
  });
};

const mockButtonRect = (button: HTMLElement) => {
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
};

describe('AnimatedThemeToggler', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    delete document.documentElement.dataset.magicuiThemeVt;
    document.documentElement.style.removeProperty('--magicui-theme-toggle-vt-duration');
    document.documentElement.style.removeProperty('--magicui-theme-vt-clip-from');
    setViewport();
    setStartViewTransition(undefined);
    mockThemeMediaQueries();
  });

  it('无视图过渡 API 时切换显式主题并保留其他账户偏好', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      ACCOUNT_PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        theme: 'system',
        resultView: 'list',
        defaultCloudTypes: ['aliyun'],
      })
    );

    render(<AnimatedThemeToggler />);

    await user.click(screen.getByRole('button'));

    expect(document.documentElement).toHaveClass('dark');
    expect(screen.getByRole('button', { name: '切换到浅色主题' })).toBeInTheDocument();
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(JSON.parse(localStorage.getItem(ACCOUNT_PREFERENCES_STORAGE_KEY) ?? '{}')).toEqual({
      theme: 'dark',
      resultView: 'list',
      defaultCloudTypes: ['aliyun'],
    });
  });

  it('从按钮中心使用百分比圆形裁剪并同步过渡生命周期', async () => {
    const finished = createDeferred();
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return {
        ready: Promise.resolve(),
        finished: finished.promise,
      };
    });
    setStartViewTransition(startViewTransition);

    const animateSpy = vi
      .spyOn(document.documentElement, 'animate')
      .mockReturnValue({ cancel: vi.fn() } as unknown as Animation);

    render(<AnimatedThemeToggler />);

    const button = screen.getByRole('button');
    mockButtonRect(button);
    fireEvent.click(button, { clientX: 128, clientY: 96, detail: 1 });

    await waitFor(() => expect(animateSpy).toHaveBeenCalled());

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.magicuiThemeVt).toBe('active');
    expect(
      document.documentElement.style.getPropertyValue('--magicui-theme-toggle-vt-duration')
    ).toBe('400ms');
    expect(document.documentElement.style.getPropertyValue('--magicui-theme-vt-clip-from')).toBe(
      'circle(0% at 50% 50%)'
    );
    expect(animateSpy).toHaveBeenCalledWith(
      {
        clipPath: [
          'circle(0% at 50% 50%)',
          'circle(70.71067811865476% at 50% 50%)',
        ],
      },
      {
        duration: 400,
        easing: 'ease-in-out',
        fill: 'forwards',
        pseudoElement: '::view-transition-new(root)',
      }
    );

    await act(async () => {
      finished.resolve();
      await finished.promise;
    });

    expect(document.documentElement.dataset.magicuiThemeVt).toBeUndefined();
    expect(
      document.documentElement.style.getPropertyValue('--magicui-theme-toggle-vt-duration')
    ).toBe('');
    expect(document.documentElement.style.getPropertyValue('--magicui-theme-vt-clip-from')).toBe('');
  });

  it('动画进行中阻止其他主题按钮再次启动过渡并同步图标状态', async () => {
    const finished = createDeferred();
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return {
        ready: Promise.resolve(),
        finished: finished.promise,
      };
    });
    setStartViewTransition(startViewTransition);
    vi.spyOn(document.documentElement, 'animate').mockReturnValue({
      cancel: vi.fn(),
    } as unknown as Animation);

    render(
      <>
        <AnimatedThemeToggler />
        <AnimatedThemeToggler />
      </>
    );

    const buttons = screen.getAllByRole('button');
    mockButtonRect(buttons[0]);
    mockButtonRect(buttons[1]);
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    await waitFor(() => expect(startViewTransition).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '切换到浅色主题' })).toHaveLength(2);
    });

    await act(async () => {
      finished.resolve();
      await finished.promise;
    });
  });

  it('减少动态效果时直接切换且不启动视图过渡', async () => {
    mockThemeMediaQueries({ reduceMotion: true });
    const startViewTransition = vi.fn();
    setStartViewTransition(startViewTransition);
    const user = userEvent.setup();

    render(<AnimatedThemeToggler />);

    await user.click(screen.getByRole('button'));

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.dataset.magicuiThemeVt).toBeUndefined();
  });

  it('启动视图过渡同步抛错时清理状态并降级完成主题切换', () => {
    setStartViewTransition(
      vi.fn(() => {
        throw new Error('视图过渡启动失败');
      })
    );

    render(<AnimatedThemeToggler />);

    const button = screen.getByRole('button');
    mockButtonRect(button);

    expect(() => fireEvent.click(button)).not.toThrow();
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.dataset.magicuiThemeVt).toBeUndefined();
  });

  it('ready 拒绝时立即释放全局过渡锁且不执行裁剪动画', async () => {
    const finished = createDeferred();
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return {
        ready: Promise.reject(new Error('视图过渡未就绪')),
        finished: finished.promise,
      };
    });
    setStartViewTransition(startViewTransition);
    const animateSpy = vi.spyOn(document.documentElement, 'animate');

    render(<AnimatedThemeToggler />);
    const button = screen.getByRole('button');
    mockButtonRect(button);
    fireEvent.click(button);

    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    await waitFor(() => {
      expect(document.documentElement.dataset.magicuiThemeVt).toBeUndefined();
    });
    expect(animateSpy).not.toHaveBeenCalled();

    finished.resolve();
  });

  it('finished 拒绝时仍清理根元素临时状态', async () => {
    const finished = createDeferred();
    const startViewTransition = vi.fn((callback: () => void) => {
      callback();
      return {
        ready: Promise.resolve(),
        finished: finished.promise,
      };
    });
    setStartViewTransition(startViewTransition);
    vi.spyOn(document.documentElement, 'animate').mockReturnValue({
      cancel: vi.fn(),
    } as unknown as Animation);

    render(<AnimatedThemeToggler />);
    const button = screen.getByRole('button');
    mockButtonRect(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(document.documentElement.dataset.magicuiThemeVt).toBe('active');
    });
    await act(async () => {
      finished.reject(new Error('视图过渡结束失败'));
      await finished.promise.catch(() => {});
    });

    expect(document.documentElement.dataset.magicuiThemeVt).toBeUndefined();
    expect(
      document.documentElement.style.getPropertyValue('--magicui-theme-toggle-vt-duration')
    ).toBe('');
    expect(document.documentElement.style.getPropertyValue('--magicui-theme-vt-clip-from')).toBe('');
  });
});
