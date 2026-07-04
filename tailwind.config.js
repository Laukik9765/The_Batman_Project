/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bat: {
          black: "#0A0A0F",
          dark: "#12121A",
          surface: "#1C1C28",
          border: "#2A2A3A",
          gold: "#F5C518",
          "gold-dim": "#C49A10",
          white: "#E8E8F0",
          gray: "#8888A0",
          danger: "#E84040",
          success: "#40C870",
          info: "#4080E8",
        }
      },
      fontFamily: {
        bebas: ["'Bebas Neue'", "sans-serif"],
        inter: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      animation: {
        'spin-slow': 'spin 60s linear infinite',
      }
    },
  },
  plugins: [],
}
