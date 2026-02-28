export interface AuthVisualPreset {
  topOrbGradientClass: string;
  bottomOrbGradientClass: string;
  centerOrbGradientClass?: string;
  particleColorClass: string;
  cardGlowGradientClass: string;
}

export const authVisualPresets = {
  loginPage: {
    topOrbGradientClass: 'bg-gradient-to-br from-blue-400/30 to-cyan-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-cyan-400/30 to-blue-400/30',
    particleColorClass: 'bg-blue-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500',
  },
  registerPage: {
    topOrbGradientClass: 'bg-gradient-to-br from-emerald-400/30 to-teal-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-teal-400/30 to-emerald-400/30',
    particleColorClass: 'bg-emerald-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500',
  },
  apiKeyPage: {
    topOrbGradientClass: 'bg-gradient-to-br from-blue-400/30 to-cyan-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-cyan-400/30 to-blue-400/30',
    particleColorClass: 'bg-blue-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500',
  },
  adminLogin: {
    topOrbGradientClass: 'bg-gradient-to-br from-rose-500/30 to-rose-700/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-pink-500/30 to-rose-600/30',
    centerOrbGradientClass: 'bg-gradient-to-r from-red-500/20 to-rose-500/20',
    particleColorClass: 'bg-rose-500/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700',
  },
  legacyLogin: {
    topOrbGradientClass: 'bg-gradient-to-br from-indigo-400/30 to-blue-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-blue-400/30 to-indigo-400/30',
    centerOrbGradientClass: 'bg-gradient-to-r from-indigo-400/20 to-blue-400/20',
    particleColorClass: 'bg-indigo-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600',
  },
  userAuth: {
    topOrbGradientClass: 'bg-gradient-to-br from-blue-400/30 to-cyan-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-cyan-400/30 to-blue-400/30',
    centerOrbGradientClass: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
    particleColorClass: 'bg-blue-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500',
  },
} satisfies Record<string, AuthVisualPreset>;
