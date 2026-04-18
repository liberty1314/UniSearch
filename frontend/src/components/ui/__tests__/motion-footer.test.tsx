import { fireEvent, render, screen } from '@testing-library/react';
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
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('uses restrained Apple-style glass tokens instead of the old neon palette', () => {
    const { container } = render(<CinematicFooter />);

    const styleTag = container.querySelector('style');
    expect(styleTag).not.toBeNull();

    const styles = styleTag?.textContent ?? '';
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
