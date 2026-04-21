import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: colors.blue,
        gray: colors.blue,
        zinc: colors.blue,
        rose: colors.blue,
        pink: colors.sky,
        emerald: colors.blue,
        violet: colors.blue,
        indigo: colors.blue,
      }
    },
  },
  plugins: [],
}
