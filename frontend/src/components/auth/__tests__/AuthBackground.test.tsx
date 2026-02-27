import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthBackground from '@/components/auth/AuthBackground';
import type { AuthVisualPreset } from '@/components/auth/authVisualPresets';

const preset: AuthVisualPreset = {
  topOrbGradientClass: 'from-a to-b',
  bottomOrbGradientClass: 'from-c to-d',
  centerOrbGradientClass: 'from-e to-f',
  particleColorClass: 'bg-x',
  cardGlowGradientClass: 'from-g to-h',
};

describe('AuthBackground', () => {
  it('renders layers and particles with css vars', () => {
    const { container } = render(
      <AuthBackground
        preset={preset}
        particles={[
          { id: 1, x: 12, y: 34, delay: 0.5, duration: 11 },
          { id: 2, x: 56, y: 78, delay: 0.7, duration: 13 },
        ]}
      />
    );

    expect(container.querySelectorAll('.auth-bg-orb').length).toBe(3);
    expect(container.querySelector('.auth-bg-grid')).toBeTruthy();

    const particle = container.querySelector('.auth-bg-particle') as HTMLElement;
    expect(particle).toBeTruthy();
    expect(particle.style.getPropertyValue('--auth-particle-x')).toBe('12%');
    expect(particle.style.getPropertyValue('--auth-particle-y')).toBe('34%');
    expect(particle.style.getPropertyValue('--auth-particle-delay')).toBe('0.5s');
    expect(particle.style.getPropertyValue('--auth-particle-duration')).toBe('11s');
  });

  it('does not render center orb when preset omits it', () => {
    const noCenterPreset: AuthVisualPreset = {
      ...preset,
      centerOrbGradientClass: undefined,
    };

    const { container } = render(
      <AuthBackground preset={noCenterPreset} particles={[]} />
    );

    expect(container.querySelectorAll('.auth-bg-orb').length).toBe(2);
  });
});
