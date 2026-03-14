import { render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { StatsCard } from '@/components/admin/StatsCard';

vi.mock('@/components/ui/AppleCard', () => ({
  AppleCard: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="apple-card" className={className}>
      {children}
    </div>
  ),
}));

describe('StatsCard', () => {
  it('maps legacy nebula and purple brand variants onto the blue/cyan palette', () => {
    const { container, rerender } = render(
      <StatsCard title="总览" value={12} icon={Activity} color="nebula" />
    );

    let markup = container.innerHTML;
    expect(markup).toContain('bg-blue-50');
    expect(markup).toContain('text-blue-600');
    expect(markup).toContain('dark:text-cyan-300');
    expect(markup).not.toContain('nebula');

    rerender(<StatsCard title="管理员数量" value={3} icon={Activity} color="purple" />);

    markup = container.innerHTML;
    expect(screen.getByText('管理员数量')).toBeInTheDocument();
    expect(markup).toContain('bg-cyan-50');
    expect(markup).toContain('text-cyan-700');
    expect(markup).not.toContain('purple');
  });
});
