import React from 'react';
import { cn } from '@/lib/utils';
import { toStyleVars } from '@/lib/styleVars';
import type { AuthVisualPreset } from './authVisualPresets';
import type { AuthParticle } from './useAuthParticles';

export interface AuthBackgroundProps {
  preset: AuthVisualPreset;
  particles: AuthParticle[];
  className?: string;
}

const AuthBackground: React.FC<AuthBackgroundProps> = ({ preset, particles, className }) => {
  return (
    <>
      <div className={cn('auth-bg-layer', className)}>
        <div className={cn('auth-bg-orb auth-bg-orb-top', preset.topOrbGradientClass)} />
        <div className={cn('auth-bg-orb auth-bg-orb-bottom auth-delay-1000', preset.bottomOrbGradientClass)} />
        {preset.centerOrbGradientClass ? (
          <div className={cn('auth-bg-orb auth-bg-orb-center auth-delay-2000', preset.centerOrbGradientClass)} />
        ) : null}

        {particles.map((particle) => (
          <div
            key={particle.id}
            className={cn('auth-bg-particle', preset.particleColorClass)}
            style={toStyleVars({
              '--auth-particle-x': `${particle.x}%`,
              '--auth-particle-y': `${particle.y}%`,
              '--auth-particle-delay': `${particle.delay}s`,
              '--auth-particle-duration': `${particle.duration}s`,
            })}
          />
        ))}
      </div>

      <div className="auth-bg-grid" />
    </>
  );
};

export default AuthBackground;
