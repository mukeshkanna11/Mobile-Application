/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          indigo: '#4f46e5',
          purple: '#9333ea',
          slate: '#020617',
        },
      },
    },
  },
  plugins: [],
};
