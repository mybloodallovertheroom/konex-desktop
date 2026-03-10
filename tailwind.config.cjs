/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx,html}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0b0b0d',
          800: '#111113',
          700: '#1a1a1d',
          600: '#222225',
          500: '#2a2a2d',
        },
        primary: {
          DEFAULT: '#6366f1',
          hover: '#5558e3',
          light: '#818cf8',
        },
      },
    },
  },
  plugins: [],
};
