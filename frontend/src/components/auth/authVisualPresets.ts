import { BLUE_CYAN_GRADIENT } from '@/lib/brandTheme';

export interface AuthVisualPreset {
  topOrbGradientClass: string;
  bottomOrbGradientClass: string;
  centerOrbGradientClass?: string;
  particleColorClass: string;
  cardGlowGradientClass: string;
}

const blueCyanOrbTop = 'bg-gradient-to-br from-blue-400/30 to-cyan-400/30';
const blueCyanOrbBottom = 'bg-gradient-to-tr from-cyan-400/30 to-blue-400/30';
const blueCyanCenterOrb = 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20';
const blueCyanCardGlow = BLUE_CYAN_GRADIENT;

export const authVisualPresets = {
  loginPage: {
    topOrbGradientClass: blueCyanOrbTop,
    bottomOrbGradientClass: blueCyanOrbBottom,
    particleColorClass: 'bg-blue-400/30',
    cardGlowGradientClass: blueCyanCardGlow,
  },
  registerPage: {
    topOrbGradientClass: 'bg-gradient-to-br from-emerald-400/30 to-teal-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-teal-400/30 to-emerald-400/30',
    particleColorClass: 'bg-emerald-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500',
  },
  apiKeyPage: {
    topOrbGradientClass: blueCyanOrbTop,
    bottomOrbGradientClass: blueCyanOrbBottom,
    particleColorClass: 'bg-blue-400/30',
    cardGlowGradientClass: blueCyanCardGlow,
  },
  adminLogin: {
    topOrbGradientClass: 'bg-gradient-to-br from-rose-500/30 to-rose-700/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-pink-500/30 to-rose-600/30',
    centerOrbGradientClass: 'bg-gradient-to-r from-red-500/20 to-rose-500/20',
    particleColorClass: 'bg-rose-500/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700',
  },
  legacyLogin: {
    topOrbGradientClass: blueCyanOrbTop,
    bottomOrbGradientClass: 'bg-gradient-to-tr from-blue-400/30 to-cyan-400/30',
    centerOrbGradientClass: blueCyanCenterOrb,
    particleColorClass: 'bg-cyan-400/30',
    cardGlowGradientClass: blueCyanCardGlow,
  },
  userAuth: {
    topOrbGradientClass: blueCyanOrbTop,
    bottomOrbGradientClass: blueCyanOrbBottom,
    centerOrbGradientClass: blueCyanCenterOrb,
    particleColorClass: 'bg-blue-400/30',
    cardGlowGradientClass: blueCyanCardGlow,
  },
} satisfies Record<string, AuthVisualPreset>;
