/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/**/*.{js,ts,jsx,tsx,html}',
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core Design System Colors (HSL CSS Variables)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Semantic Colors
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        // Traffic light colors
        traffic: {
          green: '#22c55e',
          yellow: '#eab308',
          red: '#ef4444',
        },

        // --- Existing Landing Page Colors (can be mapped or replaced as needed) ---
        // Retaining for now, will map to HSL vars or remove if redundant
        'lp-primary': { // Landing Page Primary (Orange scale)
          50: '#FFF3E0', 100: '#FFE0B2', 200: '#FFCC80', 300: '#FFB84D',
          400: '#FFA726', 500: '#FF8C00', 600: '#E67E00', 700: '#CC6600',
          800: '#994C00', 900: '#663200',
        },
        'lp-accent': { // Landing Page Accent (Red scale)
          50: '#FFEBEE', 100: '#FFCDD2', 200: '#EF9A9A', 300: '#E57373',
          400: '#EF5350', 500: '#FF4500', 600: '#E63900', 700: '#D32F2F',
          800: '#C62828', 900: '#B71C1C',
        },
        // Existing semantic (can be replaced by new HSL ones)
        'lp-success': '#10B981', 'lp-warning': '#F59E0B', 'lp-error': '#EF4444', 'lp-info': '#3B82F6',
        // Existing neutral (will be replaced by new HSL ones or mapped)
        'lp-background': '#FFFFFF', 'lp-surface': '#F8F9FA', 'lp-surface-secondary': '#F0F2F5',
        'lp-border': '#E5E7EB', 'lp-text-primary': '#1F2937', 'lp-text-secondary': '#6B7280',
        'lp-text-tertiary': '#9CA3AF', 'lp-disabled': '#D1D5DB',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'sans-serif'], // Primary Latin font
        arabic: ['IBM Plex Arabic', 'sans-serif'], // Primary Arabic font
        heading: ['IBM Plex Sans', 'sans-serif'], // Alias for heading usage
        body: ['IBM Plex Sans', 'sans-serif'], // Alias for body usage
        // Retain existing for potential backward compatibility or specific usage
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
        0: '0px', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem',
        6: '1.5rem', 8: '2rem', 12: '3rem', 16: '4rem', 20: '5rem',
        24: '6rem', 28: '7rem', 32: '8rem',
      },
      borderRadius: {
        none: '0', sm: '0.25rem', default: '0.5rem', md: '0.75rem',
        lg: '1rem', xl: '1.5rem', full: '9999px',
      },
      boxShadow: {
        sm: '2px 2px 0 #1a1a1a',
        DEFAULT: '4px 4px 0 #1a1a1a',
        md: '6px 6px 0 #1a1a1a',
        lg: '8px 8px 0 #1a1a1a',
        xl: '12px 12px 0 #1a1a1a',
        'dark-sm': '2px 2px 0 #0d0d0d',
        'dark-md': '6px 6px 0 #0d0d0d',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, #FF8C00, #FF4500)',
        'gradient-primary-br': 'linear-gradient(to bottom right, #FF8C00, #FF4500)',
        'gradient-hero': 'linear-gradient(to bottom right, #FFF3E0, #FFFFFF)',
        'gradient-hero-dark': 'linear-gradient(to bottom right, #0F172A, #1E293B)',
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease-out',
      },
      screens: {
        xs: '375px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
      },
    },
  },
  plugins: [],
}
