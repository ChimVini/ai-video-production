/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary accent — electric violet
        accent: {
          50: '#f5f0ff',
          100: '#ede5ff',
          200: '#d4c4ff',
          300: '#b794ff',
          400: '#9b6dff',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Secondary accent — electric cyan
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        // Surface system — layered dark
        s: {
          0: '#0c0c0f',   // deepest bg
          1: '#111114',   // app bg
          2: '#18181c',   // sidebar / panels
          3: '#1e1e23',   // card bg
          4: '#26262d',   // elevated card / hover
          5: '#2e2e37',   // input bg
          6: '#3a3a45',   // borders, dividers
          7: '#4a4a58',   // strong borders
        },
        // Text system
        t: {
          1: '#f4f4f6',   // primary text
          2: '#c8c8d0',   // secondary text
          3: '#8e8e9a',   // tertiary/muted
          4: '#5c5c6a',   // disabled/faint
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'glow-sm': '0 0 12px -3px rgba(139, 92, 246, 0.3)',
        'glow': '0 0 24px -6px rgba(139, 92, 246, 0.35)',
        'glow-lg': '0 0 40px -8px rgba(139, 92, 246, 0.4)',
        'card': '0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(139, 92, 246, 0.15)',
        'elevated': '0 8px 32px rgba(0,0,0,0.5)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'noise': 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
      },
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { opacity: 0.5 },
          '50%': { opacity: 1 },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(139,92,246,0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(139,92,246,0.5)' },
        },
        'slide-up': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
