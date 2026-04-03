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
        }
      },
    },
  },
  plugins: [],
}
