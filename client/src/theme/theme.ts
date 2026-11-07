import {
  Badge,
  Button,
  Card,
  Drawer,
  NumberInput,
  Paper,
  SegmentedControl,
  Table,
  createTheme,
  rem,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from '@mantine/core'

/**
 * Two looks, one set of tokens.
 *
 * - Dark (default): near-black surfaces, friendly sans figures, a teal growth
 *   chart and a color per goal. The consumer skin.
 * - Light: warm paper and ink, with monospaced figures, white cards, a deep
 *   teal chart and each goal's color deepened to read on paper.
 *
 * Components use the `--meridian-*` tokens below rather than raw colors, so they
 * follow whichever scheme is on. Color is otherwise kept for meaning: gain,
 * loss, pending.
 */

// Near-black ink for text and neutral shapes in light mode.
const ink: MantineColorsTuple = [
  '#f5f5f4', '#e7e6e3', '#cfcdc8', '#a9a7a1', '#83817b',
  '#5e5c57', '#454440', '#2f2e2b', '#1d1d1b', '#111111',
]

// Warm grays for light mode backgrounds, borders and muted text.
const gray: MantineColorsTuple = [
  '#fafaf7', '#f3f1ec', '#efede8', '#e9e7e1', '#dcd9d0',
  '#b9b6ad', '#9a9890', '#6b6b6b', '#4a4945', '#2b2b2b',
]

// The accent for main actions. Light mode uses shade 7 (deep indigo, white text);
// dark mode uses shade 4 (bright periwinkle, dark text, chosen by autoContrast).
const brand: MantineColorsTuple = [
  '#eef1f9', '#dce2f1', '#b7c2e2', '#a3abff', '#8b93ff',
  '#7a83f5', '#4a5fa6', '#3a4e8c', '#2f4073', '#23305a',
]

// Mantine's dark surfaces: 0 text · 2 dimmed · 4 borders · 5 hover · 6 cards and inputs · 7 page.
const dark: MantineColorsTuple = [
  '#f1f3f5', '#c1c6cd', '#8d95a1', '#5d6470', '#23272e',
  '#1d2127', '#15181d', '#0d0f12', '#0a0b0d', '#060708',
]

const sans = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
const mono = '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace'

export const theme = createTheme({
  colors: { ink, gray, brand, dark },
  primaryColor: 'brand',
  primaryShade: { light: 7, dark: 4 },
  // Picks dark or light text for filled buttons, so the bright dark-mode accent gets dark text.
  autoContrast: true,
  black: '#111111',
  white: '#ffffff',

  fontFamily: sans,
  fontFamilyMonospace: mono,
  headings: { fontFamily: sans, fontWeight: '600' },

  defaultRadius: 'md',
  radius: { xs: rem(4), sm: rem(8), md: rem(12), lg: rem(16), xl: rem(18) },
  shadows: {
    xs: '0 1px 2px rgba(17, 17, 17, 0.04)',
    sm: '0 1px 3px rgba(17, 17, 17, 0.06)',
    md: '0 8px 24px -12px rgba(17, 17, 17, 0.18)',
    lg: '0 16px 40px -16px rgba(17, 17, 17, 0.25)',
    xl: '0 24px 60px -20px rgba(17, 17, 17, 0.35)',
  },

  cursorType: 'pointer',
  respectReducedMotion: true,

  components: {
    Card: Card.extend({
      defaultProps: { withBorder: true, padding: 'lg', radius: 'lg' },
      styles: { root: { backgroundColor: 'var(--meridian-card)', boxShadow: 'var(--meridian-card-shadow)' } },
    }),
    Paper: Paper.extend({ defaultProps: { withBorder: true } }),
    Button: Button.extend({ defaultProps: { radius: 'xl' } }),
    Badge: Badge.extend({ defaultProps: { variant: 'light', radius: 'xl', tt: 'none', fw: 500 } }),
    SegmentedControl: SegmentedControl.extend({ defaultProps: { radius: 'xl' } }),
    Table: Table.extend({ defaultProps: { highlightOnHover: true, verticalSpacing: 'sm', horizontalSpacing: 'md' } }),
    Drawer: Drawer.extend({
      defaultProps: { position: 'right', size: 440, overlayProps: { backgroundOpacity: 0.45, blur: 2 } },
      styles: {
        content: { backgroundColor: 'var(--meridian-card)' },
        header: { backgroundColor: 'var(--meridian-card)' },
      },
    }),
    NumberInput: NumberInput.extend({ defaultProps: { thousandSeparator: ',', hideControls: true, allowNegative: false } }),
  },
})

/**
 * Page colors and our own tokens, per color scheme.
 *
 * - gain / loss / pending: meaning colors (lighter in dark mode, for contrast).
 * - card, card-shadow, surface-muted: surfaces.
 * - ink: neutral text and shapes.
 * - track: the empty part of a bar.
 * - chart-line / chart-dash / chart-grid: the value chart.
 * - figure-font: numbers. Monospace on paper, the UI sans in dark.
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {
    '--mantine-color-body': '#fafaf7',
    '--mantine-color-text': '#111111',
    '--mantine-color-dimmed': '#6b6b6b',
    '--mantine-color-default-border': '#e9e7e1',
    '--mantine-color-error': '#c0392b',
    '--meridian-page': '#fafaf7',
    '--meridian-card': '#ffffff',
    '--meridian-card-shadow': '0 1px 2px rgba(17, 17, 17, 0.04), 0 12px 32px -20px rgba(17, 17, 17, 0.16)',
    '--meridian-surface-muted': '#f3f1ec',
    '--meridian-gain': '#0f8a4f',
    '--meridian-loss': '#c0392b',
    '--meridian-pending': '#a8650f',
    '--meridian-ink': '#111111',
    '--meridian-track': '#e9e7e1',
    '--meridian-chart-line': '#0f766e',
    '--meridian-chart-fill-opacity': '0.09',
    '--meridian-chart-dash': '#a9a7a1',
    '--meridian-chart-grid': '#e9e7e1',
    '--meridian-tooltip': '#111111',
    '--meridian-figure-font': mono,
    '--meridian-hero-weight': '500',
  },
  dark: {
    '--mantine-color-body': 'var(--mantine-color-dark-7)',
    '--mantine-color-text': 'var(--mantine-color-dark-0)',
    '--mantine-color-dimmed': 'var(--mantine-color-dark-2)',
    '--mantine-color-default-border': 'var(--mantine-color-dark-4)',
    '--mantine-color-error': '#f87171',
    '--meridian-page': 'var(--mantine-color-dark-7)',
    '--meridian-card': 'var(--mantine-color-dark-6)',
    '--meridian-card-shadow': 'none',
    '--meridian-surface-muted': 'var(--mantine-color-dark-5)',
    '--meridian-gain': '#4ade80',
    '--meridian-loss': '#f87171',
    '--meridian-pending': '#fbbf24',
    '--meridian-ink': 'var(--mantine-color-dark-0)',
    '--meridian-track': '#262b33',
    '--meridian-chart-line': '#5eead4',
    '--meridian-chart-fill-opacity': '0.28',
    '--meridian-chart-dash': '#59616d',
    '--meridian-chart-grid': '#1f2329',
    '--meridian-tooltip': '#262b33',
    '--meridian-figure-font': sans,
    '--meridian-hero-weight': '600',
  },
})
