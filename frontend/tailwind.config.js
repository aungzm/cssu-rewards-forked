/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class', // or 'media' if you prefer OS setting
    content: [
      "./index.html",
      "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors : {},
      },
    },
    plugins: [],
  }
  