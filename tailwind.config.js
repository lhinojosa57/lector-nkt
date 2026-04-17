/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          100: '#f5f0e8',
          200: '#e8dcc8',
          300: '#c9b89a',
          400: '#9d8567',
          500: '#6b5838',
          600: '#5c4424',
          700: '#3d2c14',
          800: '#2d1f0e',
          900: '#1a1208',
        },
        parchment: {
          50: '#fdf8f0',
          100: '#f9f1e3',
          200: '#f4e9d4',
          300: '#e8d3a9',
        },
        sepia: {
          100: '#f4e9d4',
          200: '#e8d3a9',
        },
        gold: {
          300: '#e8c07e',
          400: '#d4af37',
          500: '#c9a020',
          600: '#b8960c',
        },
        crimson: {
          200: '#d68a8a',
          400: '#c75656',
          500: '#9b1c1c',
          600: '#7f1d1d',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Source Serif 4"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        manuscript: '0 2px 8px rgba(26, 18, 8, 0.15)',
        raised: '0 4px 16px rgba(26, 18, 8, 0.2)',
      },
    },
  },
  plugins: [],
}
