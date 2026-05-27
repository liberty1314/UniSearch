import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CompactSurface } from '@/components/ui/CompactSurface';

describe('CompactSurface', () => {
  it('渲染紧凑后台表面并保留语义元素', () => {
    render(
      <CompactSurface as="section" density="compact" data-testid="surface">
        后台内容
      </CompactSurface>,
    );

    const surface = screen.getByTestId('surface');
    expect(surface.tagName).toBe('SECTION');
    expect(surface).toHaveAttribute('data-compact-surface', 'true');
    expect(surface).toHaveTextContent('后台内容');
    expect(surface.className).toContain('rounded-');
  });
});
