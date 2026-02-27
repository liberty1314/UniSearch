export interface AuthVisualPreset {
  topOrbGradientClass: string;
  bottomOrbGradientClass: string;
  centerOrbGradientClass?: string;
  particleColorClass: string;
  cardGlowGradientClass: string;
}

export const authVisualPresets = {
  loginPage: {
    topOrbGradientClass: 'bg-gradient-to-br from-nebula-400/30 to-cosmic-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-green-400/30 to-blue-400/30',
    particleColorClass: 'bg-nebula-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-nebula-500 via-cosmic-500 to-purple-500',
  },
  registerPage: {
    topOrbGradientClass: 'bg-gradient-to-br from-nebula-400/30 to-cosmic-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-green-400/30 to-blue-400/30',
    particleColorClass: 'bg-nebula-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-emerald-500 via-nebula-500 to-cosmic-500',
  },
  apiKeyPage: {
    topOrbGradientClass: 'bg-gradient-to-br from-blue-400/30 to-purple-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-cyan-400/30 to-blue-400/30',
    particleColorClass: 'bg-blue-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-blue-500 via-cyan-500 to-purple-500',
  },
  adminLogin: {
    topOrbGradientClass: 'bg-gradient-to-br from-nebula-400/30 to-cosmic-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-cosmic-400/30 to-purple-400/30',
    centerOrbGradientClass: 'bg-gradient-to-r from-nebula-400/20 to-cosmic-400/20',
    particleColorClass: 'bg-nebula-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-nebula-500 via-cosmic-500 to-purple-500',
  },
  legacyLogin: {
    topOrbGradientClass: 'bg-gradient-to-br from-blue-400/30 to-purple-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-green-400/30 to-blue-400/30',
    centerOrbGradientClass: 'bg-gradient-to-r from-purple-400/20 to-pink-400/20',
    particleColorClass: 'bg-blue-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500',
  },
  userAuth: {
    topOrbGradientClass: 'bg-gradient-to-br from-nebula-400/30 to-cosmic-400/30',
    bottomOrbGradientClass: 'bg-gradient-to-tr from-green-400/30 to-blue-400/30',
    centerOrbGradientClass: 'bg-gradient-to-r from-nebula-400/20 to-cosmic-400/20',
    particleColorClass: 'bg-nebula-400/30',
    cardGlowGradientClass: 'bg-gradient-to-r from-nebula-500 via-cosmic-500 to-purple-500',
  },
} satisfies Record<string, AuthVisualPreset>;
