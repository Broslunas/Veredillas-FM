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
        }
      },
    },
  },
  plugins: [],
}
