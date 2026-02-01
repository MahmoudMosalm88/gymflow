/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Traffic light colors
        'traffic-green': '#22c55e',
        'traffic-yellow': '#eab308',
        'traffic-red': '#ef4444',
        // Brand colors
        'gym-primary': '#3b82f6',
        'gym-secondary': '#6366f1'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')
  ]
}
