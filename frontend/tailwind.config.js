/** @type {import('tailwindcss').Config} */

// Tokens live in src/styles/tokens.css as RGB channel triplets so that alpha
// modifiers (bg-surface-900/50, border-emerald-500/20 — 153 of them in the
// codebase) keep compiling. This helper wires a token to a Tailwind colour.
// Token names mirror class names, so `token('surface-800')` is what
// `bg-surface-800` renders.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

// `gray` and `slate` are used interchangeably for the same roles across the
// codebase (470 vs 27 uses), so both point at this one ramp. That silently
// unifies them without touching a single className.
//
// The low end is the important part: gray-500 was #6b7280 (~3.9:1) and
// gray-600 was #4b5563 (~2:1), both used for real content, not decoration.
// They now land at 4.9:1 and 3.7:1.
const neutral = {
  50:  '#F7F8F9',
  100: token('text-primary'),
  200: '#D2D6DC',
  300: '#B4BAC3',
  400: token('text-secondary'),
  500: token('text-tertiary'),
  600: '#6B737E',
  700: token('text-disabled'),
  800: token('surface-700'),
  900: token('surface-850'),
  950: token('surface-900'),
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand: UI chrome only ────────────────────────────────────────────
        brand: {
          300: token('brand-300'),
          400: token('brand-400'),
          500: token('brand-500'),
          600: token('brand-600'),
          700: token('brand-700'),
        },

        // ── Market semantics: price direction only ───────────────────────────
        up:   { DEFAULT: token('up'),   strong: token('up-strong') },
        down: { DEFAULT: token('down'), strong: token('down-strong') },
        flat: token('flat'),

        // ── Surfaces ─────────────────────────────────────────────────────────
        // surface-700 and surface-600 were referenced 13 times but never
        // defined, so those hover states rendered nothing at all. Defining
        // them here is what finally switches them on.
        surface: {
          600: token('surface-600'),
          700: token('surface-700'),
          800: token('surface-800'),
          850: token('surface-850'),
          900: token('surface-900'),
          950: token('surface-950'),
        },

        gray: neutral,
        slate: neutral,
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // Never declared before, which is why 117 `font-mono` usages fell back
        // to whatever the OS provided — and why prices rendered differently on
        // every machine.
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        // Deliberately additive. Redefining sm/base under pages that have not
        // been redesigned yet would shift every layout in the app before we
        // could review them, so the existing steps keep Tailwind's defaults and
        // each page phase picks sizes explicitly. `2xs` replaces the 20 uses of
        // the arbitrary text-[10px] that currently break the ramp.
        '2xs': ['11px', { lineHeight: '16px', letterSpacing: '0.04em' }],
      },

      borderRadius: {
        // Was 4 / 8 / 14 / 20px, with all four applied to the same "card" role.
        // Tightened to a coherent 6 / 8 / 10 / 12 / 16 ladder, which removes the
        // visual inconsistency without editing any page markup.
        DEFAULT: '6px',
        md:  '8px',
        lg:  '10px',
        xl:  '12px',
        '2xl': '16px',
        '3xl': '20px',
      },

      boxShadow: {
        xs:      'var(--shadow-xs)',
        sm:      'var(--shadow-sm)',
        md:      'var(--shadow-md)',
        lg:      'var(--shadow-lg)',
        overlay: 'var(--shadow-overlay)',
        // Retained because they are already referenced; retuned onto the scale.
        card:    'var(--shadow-sm)',
        // Still emerald-tinted: it sits on green buttons that have not migrated
        // to brand yet. Retuned when those components move, in their own phase.
        glow:    '0 0 20px rgb(16 185 129 / 0.15)',
      },

      transitionTimingFunction: {
        'out-expo':    'var(--ease-out)',
        'in-out-soft': 'var(--ease-in-out)',
      },

      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
    },
  },
  plugins: [],
}
