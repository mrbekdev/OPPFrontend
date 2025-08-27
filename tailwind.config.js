/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontSize: {
        base: '18px',
        lg: '20px',
        xl: '22px',
      },
      colors: {
        brand: {
          DEFAULT: '#111827',
          light: '#1f2937',
        },
      },
      borderRadius: {
        xl: '16px',
      },
    },
  },
  plugins: [],
};


