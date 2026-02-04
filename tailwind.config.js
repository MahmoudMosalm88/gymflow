/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors - Orange to Red Gradient
        primary: {
          50: '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB84D',
          400: '#FFA726',
          500: '#FF8C00',   // Primary Orange
          600: '#E67E00',
          700: '#CC6600',
          800: '#994C00',
          900: '#663200',
        },
        accent: {
          50: '#FFEBEE',
          100: '#FFCDD2',
          200: '#EF9A9A',
          300: '#E57373',
          400: '#EF5350',
          500: '#FF4500',   // Secondary Red
          600: '#E63900',
          700: '#D32F2F',
          800: '#C62828',
          900: '#B71C1C',
        },
        // Semantic Colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        // Neutral Colors - Light Mode
        background: '#FFFFFF',
        surface: '#F8F9FA',
        'surface-secondary': '#F0F2F5',
        border: '#E5E7EB',
        'text-primary': '#1F2937',
        'text-secondary': '#6B7280',
        'text-tertiary': '#9CA3AF',
        disabled: '#D1D5DB',
      },
      fontFamily: {
        'jakarta': ['Plus Jakarta Sans', 'Segoe UI', 'sans-serif'],
        'inter': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        // H1: Hero headline
        h1: ['3.5rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        // H2: Section headers
        h2: ['2.25rem', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '-0.01em' }],
        // H3: Component headers
        h3: ['1.875rem', { lineHeight: '1.4', fontWeight: '700' }],
        // H4: Subheadings
        h4: ['1.5rem', { lineHeight: '1.4', fontWeight: '600' }],
        // H5: Card subtitles
        h5: ['1.25rem', { lineHeight: '1.5', fontWeight: '600' }],
        // H6: Small headers
        h6: ['1rem', { lineHeight: '1.5', fontWeight: '600' }],
        // Body Large
        'body-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        // Body: Default body text
        body: ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        // Body Small
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        // Caption
        caption: ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
        // Label
        label: ['0.875rem', { lineHeight: '1.5', fontWeight: '600' }],
      },
      spacing: {
        // Enhanced spacing scale
        0: '0px',
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        6: '1.5rem',
        8: '2rem',
        12: '3rem',
        16: '4rem',
        20: '5rem',
        24: '6rem',
        28: '7rem',
        32: '8rem',
      },
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        default: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        md: '0 4px 12px rgba(0, 0, 0, 0.1)',
        lg: '0 4px 12px rgba(255, 140, 0, 0.15)',
        xl: '0 12px 32px rgba(255, 140, 0, 0.2)',
        'dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'dark-md': '0 4px 12px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, #FF8C00, #FF4500)',
        'gradient-primary-br': 'linear-gradient(to bottom right, #FF8C00, #FF4500)',
        'gradient-hero': 'linear-gradient(to bottom right, #FFF3E0, #FFFFFF)',
        'gradient-hero-dark': 'linear-gradient(to bottom right, #0F172A, #1E293B)',
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}
