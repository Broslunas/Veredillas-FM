/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#8b5cf6',
        secondary: '#0ea5e9',
        accent: '#ec4899',
      },
      animation: {
        'marquee': 'marquee 20s linear infinite',
        'blob-float': 'blob-float 10s infinite alternate',
        'blob-float-reverse': 'blob-float 12s infinite alternate-reverse',
        'spectrum': 'spectrum 1s infinite ease-in-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'shimmer': 'shimmer 1.5s infinite',
        'blob': 'blob 10s infinite alternate',
        'eq': 'eq 1s infinite ease-in-out',
        'pulseGlow': 'pulseGlow 2s infinite',
        'spin-slow': 'spin 8s linear infinite',
        'spin-reverse-slow': 'spin 12s linear infinite reverse',
        'float-geo': 'floatGeo 6s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'blob-float': {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(50px, 50px)' },
        },
        spectrum: {
          '0%, 100%': { height: '10px', opacity: '0.5' },
          '50%': { height: '60px', opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
        eq: {
          '0%, 100%': { height: '4px' },
          '50%': { height: '12px' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(139,92,246,0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(139,92,246,0)' },
        },
        floatGeo: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-20px) rotate(5deg)' },
        }
      },
    },
  },
  plugins: [],
}
