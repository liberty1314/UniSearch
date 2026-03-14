import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthBackground from '@/components/auth/AuthBackground';
import { authVisualPresets, type AuthVisualPreset } from '@/components/auth/authVisualPresets';

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

  it('keeps user-facing auth presets on the blue/cyan theme axis', () => {
    expect(authVisualPresets.loginPage.cardGlowGradientClass).toContain('from-blue-600');
    expect(authVisualPresets.apiKeyPage.cardGlowGradientClass).toContain('to-cyan-500');
    expect(authVisualPresets.userAuth.centerOrbGradientClass).toContain('to-cyan-500/20');

    expect(authVisualPresets.legacyLogin.topOrbGradientClass).toContain('from-blue-400/30');
    expect(authVisualPresets.legacyLogin.bottomOrbGradientClass).toContain('to-cyan-400/30');
    expect(authVisualPresets.legacyLogin.centerOrbGradientClass).toContain('from-blue-500/20');
    expect(authVisualPresets.legacyLogin.particleColorClass).toBe('bg-cyan-400/30');
    expect(authVisualPresets.legacyLogin.cardGlowGradientClass).toBe(
      'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500'
    );
  });
});
