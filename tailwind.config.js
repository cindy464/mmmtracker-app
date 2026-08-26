/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: '#3c3b8e',
          teal: '#00afaa',
          orange: '#f97316',
          magenta: '#d4147a',
          green: '#22c55e',
        },
      },
      fontFamily: {
        sans: ['Noto Sans', 'system-ui', 'sans-serif'],
        heading: ['Ranchers', 'cursive'],
        mono: ['monospace'],
      },
    },
  },
  plugins: [],
};
