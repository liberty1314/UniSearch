import { fireEvent, render, screen } from '@testing-library/react';
import { gsap } from 'gsap';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CinematicFooter } from '@/components/ui/motion-footer';

const gsapRevert = vi.fn();

vi.mock('gsap', () => ({
  gsap: {
    context: vi.fn((callback: () => void) => {
      callback();
      return { revert: gsapRevert };
    }),
    fromTo: vi.fn(),
    registerPlugin: vi.fn(),
    to: vi.fn(),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {},
}));

describe('CinematicFooter', () => {
  const setReducedMotion = (matches: boolean) => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setReducedMotion(false);
    window.scrollTo = vi.fn();
  });

  it('renders UniSearch footer navigation', () => {
    render(<CinematicFooter />);

    expect(screen.getByText('UNISEARCH')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '准备开始探索？' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始搜索' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '开始搜索' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '个人中心' })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('link', { name: '免责声明' })).toHaveAttribute('href', '/disclaimer');
    expect(screen.getByRole('link', { name: '联系我们' })).toHaveAttribute(
      'href',
      'mailto:UniSearch@163.com'
    );
  });

  it('hides decorative cinematic layers from accessibility semantics', () => {
    const { container } = render(<CinematicFooter />);

    expect(container.querySelector('.footer-giant-bg-text')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.footer-marquee-band')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.footer-aurora')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.footer-bg-grid')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('link', { name: /UNISEARCH/ })).not.toBeInTheDocument();
  });

  it('skips GSAP scroll motion when reduced motion is preferred', () => {
    setReducedMotion(true);

    render(<CinematicFooter />);

    expect(gsap.fromTo).not.toHaveBeenCalled();
  });

  it('从静态样式表加载克制的玻璃质感令牌且不注入内联样式', () => {
    const { container } = render(<CinematicFooter />);

    expect(container.querySelector('style')).toBeNull();

    const styles = readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8');
    expect(styles).toContain('#0071e3');
    expect(styles).toContain('rgba(29, 29, 31, 0.82)');
    expect(styles).toContain('.footer-aurora');
    expect(styles).toContain('.footer-marquee-band');
    expect(styles).not.toContain('--footer-cyan');
  });

  it('scrolls back to the top from the primary search button', () => {
    render(<CinematicFooter />);

    fireEvent.click(screen.getByRole('button', { name: '开始搜索' }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('scrolls back to the top from the footer button', () => {
    render(<CinematicFooter />);

    fireEvent.click(screen.getByRole('button', { name: '返回顶部' }));

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});
