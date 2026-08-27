/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B2B26',
        primary: {
          50: '#EEF5F2',
          100: '#D6E7E0',
          200: '#B8D5CB',
          300: '#8FBBAC',
          400: '#649C8B',
          500: '#3E7A67',
          600: '#2E6152',
          700: '#234A3F',
          800: '#1B3A31',
          900: '#132922',
        },
        gold: {
          400: '#D9A94E',
          500: '#C4933A',
        },
        cream: '#FBF9F4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['"Noto Naskh Arabic"', '"Amiri"', 'serif'],
        display: ['"Cormorant Garamond"', 'serif'],
      },
    },
  },
  plugins: [],
};
