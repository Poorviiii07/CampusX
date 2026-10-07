import type { Config } from 'tailwindcss';

/**
 * CAMPUS-X Color Palette
 * Source: https://coolors.co/c3dfe0-bcd979-9dad6f-7d6d61-5e574d
 *
 * #C3DFE0 — Powder Teal    → accent light
 * #BCD979 — Lime Green     → success / highlight
 * #9DAD6F — Olive Green    → accent mid
 * #7D6D61 — Warm Taupe     → primary mid
 * #5E574D — Dark Charcoal  → primary dark (sidebar/navbar)
 */

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // PRIMARY — Brown/Charcoal scale (sidebar, topbar, primary buttons)
        primary: {
          50:  '#F5F3F1',
          100: '#EBE7E3',
          200: '#D6CFC8',
          300: '#BFB5AC',
          400: '#A89B91',
          500: '#9A8C83',
          600: '#7D6D61',   // #7D6D61 warm taupe
          700: '#6B5D52',
          800: '#5E574D',   // #5E574D dark charcoal
          900: '#3D3530',
          950: '#1E1A17',
        },
        // ACCENT — Teal/Olive scale (links, focus rings, highlights)
        accent: {
          50:  '#F3F8F8',
          100: '#E4F1F2',
          200: '#C3DFE0',   // #C3DFE0 powder teal
          300: '#A8CBCC',
          400: '#8CB8BA',
          500: '#9DAD6F',   // #9DAD6F olive green
          600: '#8A9A5F',
          700: '#74824E',
          800: '#5E6A3F',
          900: '#3F4729',
        },
        // SUCCESS — Lime/Olive green scale
        success: {
          50:  '#F6FAE8',
          100: '#EBF3CB',
          200: '#D6E89E',
          300: '#BCD979',   // #BCD979 lime green
          400: '#AACA61',
          500: '#9DAD6F',   // #9DAD6F olive
          600: '#849252',
          700: '#6B763F',
          800: '#52592E',
          900: '#363C1E',
        },
        // DANGER — Kept red for accessibility/semantics
        danger: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },
        // WARNING — Kept amber for accessibility/semantics
        warning: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
      },
    },
  },
  plugins: [],
};

export default config;
