import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0908",    // Warm near-black stone
        foreground: "#c9bfa8",    // Warm parchment text

        // Amber gold palette — torch/candlelight accents
        amber: {
          300: "#fde68a",
          400: "#fbbf24",
          500: "#ca8a04",
          600: "#92400e",
          700: "#78350f",
          900: "#1c0f03",
        },

        // Parchment — warm aged paper tones
        parchment: {
          50:  "#fdf8ec",
          100: "#f7edd4",
          200: "#e8dcc4",
          300: "#d9c5a0",
          400: "#c4a87c",
          900: "#1f1b14",
          950: "#120f0b",
        },

        // Blood/crimson — danger, damage, combat
        blood: {
          400: "#b91c1c",
          500: "#8a0303",
          600: "#5e0000",
          700: "#3b0000",
          800: "#1e0000",
        },

        // Magic — keep for oracle/magic effects  
        magic: {
          300: "#a78bfa",
          400: "#7c3aed",
          500: "#6d28d9",
          600: "#4c1d95",
          900: "#1e0050",
        },

        // Stone — neutral dark surface tones
        stone: {
          750: "#2a2520",
          800: "#1c1917",
          850: "#141211",
          900: "#0c0a09",
          950: "#080706",
        },
      },
      fontFamily: {
        serif:     ['var(--font-cinzel)',      'ui-serif',      'Georgia'],
        sans:      ['var(--font-inter)',       'ui-sans-serif', 'system-ui'],
        narrative: ['var(--font-im-fell)',     'ui-serif',      'Georgia'],
        display:   ['var(--font-cinzel)',      'ui-serif',      'Georgia'],
        mono:      ['var(--font-jetbrains)',   'ui-monospace',  'SFMono-Regular'],
      },
      animation: {
        'ember-float':   'ember-float 6s ease-in-out infinite',
        'flicker':       'flicker 3s ease-in-out infinite',
        'glow-pulse':    'glow-pulse 2s ease-in-out infinite',
        'text-shimmer':  'text-shimmer 3s ease-in-out infinite',
        'fade-up':       'fade-up 0.5s ease-out forwards',
        'typewriter':    'typewriter 0.05s steps(1) forwards',
      },
      keyframes: {
        'ember-float': {
          '0%, 100%': { transform: 'translateY(0) translateX(0) scale(1)',   opacity: '0' },
          '10%':       { opacity: '0.8' },
          '90%':       { opacity: '0.6' },
          '100%':      { transform: 'translateY(-120px) translateX(20px) scale(0.3)', opacity: '0' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1'   },
          '50%':      { opacity: '0.8' },
          '75%':      { opacity: '0.95' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(202, 138, 4, 0.3)' },
          '50%':      { boxShadow: '0 0 20px 6px rgba(202, 138, 4, 0.6)' },
        },
        'text-shimmer': {
          '0%, 100%': { backgroundPosition: '0% 50%'   },
          '50%':      { backgroundPosition: '100% 50%' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
      },
      backgroundImage: {
        'stone-texture':    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E\")",
        'torch-glow':       'radial-gradient(ellipse at top, rgba(202,138,4,0.08) 0%, transparent 60%)',
        'blood-glow':       'radial-gradient(ellipse at bottom, rgba(138,3,3,0.1) 0%, transparent 60%)',
        'parchment-fade':   'linear-gradient(180deg, rgba(253,248,236,0.04) 0%, transparent 100%)',
      },
      dropShadow: {
        'torch':    ['0 0 8px rgba(202,138,4,0.5)'],
        'blood':    ['0 0 8px rgba(138,3,3,0.5)'],
        'glow-sm':  ['0 0 4px rgba(202,138,4,0.3)'],
      },
      boxShadow: {
        'torch-sm':  '0 0 12px -4px rgba(202,138,4,0.4)',
        'torch':     '0 0 24px -6px rgba(202,138,4,0.5)',
        'torch-lg':  '0 0 40px -8px rgba(202,138,4,0.6)',
        'blood-sm':  '0 0 12px -4px rgba(138,3,3,0.4)',
        'blood':     '0 0 24px -6px rgba(138,3,3,0.5)',
        'inner-glow':'inset 0 0 20px rgba(202,138,4,0.05)',
        'card':      '0 4px 24px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.03)',
      }
    },
  },
  plugins: [],
};

export default config;
