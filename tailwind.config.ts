import type { Config } from 'tailwindcss'

/** Every color resolves to a CSS variable, so light and dark themes swap in one place (src/styles.css). */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: { DEFAULT: token('surface'), 2: token('surface-2'), 3: token('surface-3') },
        line: { DEFAULT: token('line'), strong: token('line-strong') },
        ink: { DEFAULT: token('ink'), muted: token('ink-muted'), subtle: token('ink-subtle') },
        willow: { DEFAULT: token('willow'), strong: token('willow-strong'), soft: token('willow-soft'), text: token('willow-text') },
        wren: { DEFAULT: token('wren'), soft: token('wren-soft'), text: token('wren-text') },
        dusk: { DEFAULT: token('dusk'), soft: token('dusk-soft'), text: token('dusk-text') },
        honey: { DEFAULT: token('honey'), soft: token('honey-soft'), text: token('honey-text') },
        rose: { DEFAULT: token('rose'), soft: token('rose-soft'), text: token('rose-text') },
        ring: token('ring'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        card: '0 1px 2px rgb(31 42 36 / 0.05), 0 0 0 1px rgb(31 42 36 / 0.04)',
        lift: '0 12px 32px -12px rgb(31 42 36 / 0.25), 0 2px 6px -2px rgb(31 42 36 / 0.08)',
        phone: '0 40px 80px -30px rgb(31 42 36 / 0.45), 0 0 0 1px rgb(31 42 36 / 0.08)',
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      keyframes: {
        'rise-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        dot: { '0%,80%,100%': { opacity: '0.25' }, '40%': { opacity: '1' } },
        flash: { '0%': { backgroundColor: 'rgb(var(--willow-soft))' }, '100%': { backgroundColor: 'transparent' } },
      },
      animation: {
        'rise-in': 'rise-in 280ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        dot: 'dot 1.2s infinite',
        flash: 'flash 1.6s ease-out',
      },
    },
  },
} satisfies Config
