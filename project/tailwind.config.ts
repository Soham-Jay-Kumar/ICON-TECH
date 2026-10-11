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
        // Named `panel`, not `card`: Tailwind auto-generates a `shadow-card`
        // utility from the `colors.card` theme token (shadcn's
        // `hsl(var(--card))`, which resolves to white) and that utility wins
        // the cascade over this one — silently rewriting the intended navy
        // shadow to a solid white glow. Invisible on the white panels this
        // was originally used on; unmissable once a panel sits on a dark
        // background (schedule-demo).
        panel: '0 20px 50px -20px rgba(12, 37, 55, 0.18)',
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
        cinematic: 'var(--motion-duration-cinematic)',
        epic: 'var(--motion-duration-epic)',
      },
      transitionTimingFunction: {
        standard: 'var(--motion-ease-standard)',
        premium: 'var(--motion-ease-premium)',
        cine: 'var(--motion-ease-cine)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        // transitions.dev texts reveal, as a mount animation: the recipe's
        // 12px rise out of a 3px blur (app/transitions.css tokens).
        'field-in': {
          '0%': {
            opacity: '0',
            transform: 'translateY(var(--stagger-distance))',
            filter: 'blur(var(--stagger-blur))',
          },
          '100%': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
        // transitions.dev modal open: up from --scale-large (0.96).
        'panel-in': {
          '0%': { opacity: '0', transform: 'scale(var(--scale-large))' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Vision glyph. Paired with steps(12) so the bitten wedge jumps 30° at
        // a time instead of gliding — the difference between a clock hand and
        // a spinner.
        'glyph-tick': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        // Mission glyph. Arrow drops in along its own up-right axis, buries
        // itself in the bullseye, kicks back a touch on impact, holds, then
        // clears for the next pass. Compressed from the original cut: the
        // hold used to eat more than half of every cycle, so a reader glancing
        // over was more likely to catch the arrow sitting still than actually
        // striking. Contact now lands at 22%, matched by target-pulse and the
        // impact flash (vision-mission.tsx).
        'arrow-strike': {
          '0%': { opacity: '0', transform: 'translate(17px, -17px)' },
          '9%': { opacity: '1' },
          '22%': { transform: 'translate(0px, 0px)' },
          '27%': { transform: 'translate(2.5px, -2.5px)' },
          '33%': { transform: 'translate(0px, 0px)' },
          '74%': { opacity: '1', transform: 'translate(0px, 0px)' },
          '92%': { opacity: '0', transform: 'translate(0px, 0px)' },
          '100%': { opacity: '0', transform: 'translate(17px, -17px)' },
        },
        // Rings absorb the hit — timed to land on arrow-strike's 22% contact.
        'target-pulse': {
          '0%, 20%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.12)' },
          '35%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
        // `backwards`, not `both`: nothing (no transform, no filter) is left
        // on the element once it has settled.
        'field-in':
          'field-in var(--motion-duration-reveal) var(--motion-ease-premium) backwards',
        'panel-in':
          'panel-in var(--motion-duration-ui) var(--motion-ease-premium) backwards',
        // Cycle lengths are in seconds like `marquee` — these are ambient
        // loops, not token-scaled UI transitions. Sped up from the original
        // 12s/5s/5s cut, which was tuned for restraint over noticeability;
        // the Vision/Mission panels are now the one place on the page asked
        // to read as animated at a glance rather than reward lingering.
        'glyph-tick': 'glyph-tick 8s steps(12, end) infinite',
        'arrow-strike': 'arrow-strike 3.4s var(--motion-ease-premium) infinite',
        'target-pulse': 'target-pulse 3.4s var(--motion-ease-standard) infinite',
      },
    },
  },
  plugins: [],
};
export default config;
