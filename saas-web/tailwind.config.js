/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#FF8C00",
          light: "#FFA726",
          dark: "#E67E00"
        },
        surface: {
          DEFAULT: "#090f1f",
          card: "rgba(9, 14, 33, 0.64)",
          elevated: "rgba(13, 19, 39, 0.74)"
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.09)",
          hover: "rgba(255, 255, 255, 0.18)"
        }
      },
      fontFamily: {
        sans: ["Segoe UI", "Tahoma", "Geneva", "Verdana", "sans-serif"]
      }
    }
  },
  plugins: []
};
