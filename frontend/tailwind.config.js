/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        crypt: {
          950: '#060709',
          900: '#0d0f14',
          850: '#13161f',
          800: '#1a1e2b',
          700: '#262d3f',
        },
        tombstone: {
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
        },
        ectoplasm: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        marigold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        blood: {
          500: '#ef4444',
          600: '#dc2626',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        display: ['"Cinzel Decorative"', 'serif'],
      }
    },
  },
  plugins: [],
}
