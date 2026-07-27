import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotFoundPage from '@/components/ui/page-not-found';

const navigateMock = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');

  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

beforeEach(() => {
  navigateMock.mockReset();
});

describe('NotFoundPage', () => {
  it('renders the hero copy and CTA actions', () => {
    render(<NotFoundPage />);

    expect(screen.queryByText('页面提示')).not.toBeInTheDocument();
    expect(screen.getByText('页面未找到')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回上一页' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '回到首页' })).toBeInTheDocument();
  });

  it('navigates backward and home when CTA buttons are clicked', () => {
    render(<NotFoundPage />);

    fireEvent.click(screen.getByRole('button', { name: '返回上一页' }));
    fireEvent.click(screen.getByRole('button', { name: '回到首页' }));

    expect(navigateMock).toHaveBeenNthCalledWith(1, -1);
    expect(navigateMock).toHaveBeenNthCalledWith(2, '/');
  });

  it('positions the static bottom figure on the left side', () => {
    const { container } = render(<NotFoundPage />);

    const staticFigure = container.querySelector('[data-stick-role="static-left"]');
    const charactersLayer = container.querySelector('[data-layer="characters"]');

    expect(staticFigure).toBeInTheDocument();
    expect(staticFigure).toHaveStyle({ left: '8%' });
    expect(charactersLayer).toHaveClass('z-[110]');
    expect(charactersLayer).toHaveClass('pointer-events-none');
  });

  it('uses the blue/cyan accent system without purple or legacy cosmic accents', () => {
    const { container } = render(<NotFoundPage />);

    const pageShell = container.firstChild as HTMLElement;
    const codeHeading = screen.getByText('404');
    const backButton = screen.getByRole('button', { name: '返回上一页' });
    const homeButton = screen.getByRole('button', { name: '回到首页' });

    expect(pageShell.className).toContain('rgba(6,182,212,0.16)');
    expect(pageShell.className).toContain('rgba(59,130,246,0.16)');
    expect(codeHeading.className).toContain('from-blue-600');
    expect(codeHeading.className).toContain('via-blue-500');
    expect(codeHeading.className).toContain('to-cyan-500');
    expect(codeHeading.className).not.toContain('cosmic');
    expect(backButton.className).toContain('hover:border-cyan-300');
    expect(backButton.className).toContain('hover:text-cyan-700');
    expect(homeButton.className).toContain('from-blue-600');
    expect(homeButton.className).toContain('via-blue-500');
    expect(homeButton.className).toContain('to-cyan-500');
  });
});
