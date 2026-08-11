import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        display: ['var(--font-anton)', 'Impact', 'sans-serif'],
      },
      colors: {
        navy: {
          50: '#F0F6F9',
          100: '#DCEAF1',
          200: '#B9D4E2',
          300: '#8AB4CB',
          400: '#5B8FAC',
          500: '#3D7191',
          600: '#2C5875',
          700: '#1F425A',
          800: '#143145',
          900: '#0C2537',
          950: '#081B29',
        },
        brand: {
          50: '#FEF4EB',
          100: '#FDE6D2',
          200: '#FACCA5',
          300: '#F8AD6E',
          400: '#F69542',
          500: '#F5822B',
          600: '#E06A14',
          700: '#B95411',
          800: '#934213',
          900: '#773813',
        },
        teal: {
          50: '#EDF7F6',
          100: '#D5ECEA',
          200: '#ACDAD6',
          300: '#79C1BC',
          400: '#4BA49F',
          500: '#2FA098',
          600: '#238680',
          700: '#1F6B67',
          800: '#1D5654',
          900: '#1B4846',
        },
        mist: {
          50: '#F6FAF9',
          100: '#EDF4F3',
          200: '#E2EEEC',
          300: '#CFE2DF',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontSize: {
        'display-xl': ['clamp(2.5rem, 5.5vw, 4.5rem)', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'display-lg': ['clamp(2rem, 4vw, 3.25rem)', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'display-md': ['clamp(1.6rem, 3vw, 2.5rem)', { lineHeight: '1.2' }],
        'display-sm': ['clamp(1.35rem, 2.2vw, 1.75rem)', { lineHeight: '1.25' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 8px 30px -6px rgba(12, 37, 55, 0.10)',
        card: '0 20px 50px -20px rgba(12, 37, 55, 0.18)',
        pill: '0 10px 25px -8px rgba(245, 130, 43, 0.5)',
      },
      // Motion tokens. Values live as CSS custom properties in globals.css
      // (single source of truth) so prefers-reduced-motion can zero every
      // duration in one place; these just expose them as Tailwind utilities.
      transitionDuration: {
        micro: 'var(--motion-duration-micro)',
        ui: 'var(--motion-duration-ui)',
        reveal: 'var(--motion-duration-reveal)',
        hero: 'var(--motion-duration-hero)',
      },
      transitionTimingFunction: {
        standard: 'var(--motion-ease-standard)',
        premium: 'var(--motion-ease-premium)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'menu-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        'menu-in': 'menu-in var(--motion-duration-ui) var(--motion-ease-premium) both',
      },
    },
  },
  plugins: [],
};
export default config;
