/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      colors: {
        // Apple-inspired color palette
        apple: {
          blue: '#007AFF',
          green: '#34C759',
          orange: '#FF9500',
          red: '#FF3B30',
          purple: '#AF52DE',
          pink: '#FF2D92',
          yellow: '#FFCC00',
        },
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        // 搜索状态颜色
        search: {
          orange: '#FF9500',
          'orange-light': '#FFB340',
          'orange-dark': '#E6850E',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        'hero': 'clamp(3rem, 8vw, 6rem)',
      },
      borderRadius: {
        'apple': '8px',
        'card': '12px',
        'large': '16px',
      },
      boxShadow: {
        'apple': '0 4px 16px rgba(0, 0, 0, 0.1)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'hover': '0 8px 24px rgba(0, 0, 0, 0.15)',
        'button': '0 2px 8px rgba(0, 122, 255, 0.3)',
        'button-hover': '0 4px 16px rgba(0, 122, 255, 0.4)',
        'button-active': '0 1px 4px rgba(0, 122, 255, 0.5)',
        'button-orange': '0 2px 8px rgba(255, 149, 0, 0.3)',
        'button-orange-hover': '0 4px 16px rgba(255, 149, 0, 0.4)',
        'button-orange-active': '0 1px 4px rgba(255, 149, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'button-press': 'buttonPress 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        'button-release': 'buttonRelease 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'loading-pulse': 'loadingPulse 1.5s ease-in-out infinite',
        'text-fade': 'textFade 0.2s ease-in-out',
        'icon-rotate': 'iconRotate 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-bounce': 'scaleBounce 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'ripple': 'ripple 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        buttonPress: {
          '0%': { transform: 'scale(1)', boxShadow: '0 4px 16px rgba(0, 122, 255, 0.4)' },
          '50%': { transform: 'scale(0.95)', boxShadow: '0 2px 8px rgba(0, 122, 255, 0.5)' },
          '100%': { transform: 'scale(0.98)', boxShadow: '0 1px 4px rgba(0, 122, 255, 0.5)' },
        },
        buttonRelease: {
          '0%': { transform: 'scale(0.98)', boxShadow: '0 1px 4px rgba(0, 122, 255, 0.5)' },
          '100%': { transform: 'scale(1)', boxShadow: '0 4px 16px rgba(0, 122, 255, 0.4)' },
        },
        loadingPulse: {
          '0%, 100%': { 
            opacity: '1',
            transform: 'scale(1) rotate(0deg)',
          },
          '50%': { 
            opacity: '0.7',
            transform: 'scale(1.1) rotate(180deg)',
          },
        },
        textFade: {
          '0%': { opacity: '0', transform: 'translateY(2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        iconRotate: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(180deg) scale(1.1)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
        scaleBounce: {
          '0%': { transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        ripple: {
          '0%': { 
            transform: 'scale(0)',
            opacity: '1',
          },
          '100%': { 
            transform: 'scale(4)',
            opacity: '0',
          },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'ease-out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      },
    },
  },
  plugins: [],
};
