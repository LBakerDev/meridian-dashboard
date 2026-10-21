import {
  Badge,
  Button,
  Card,
  Drawer,
  NumberInput,
  Paper,
  Table,
  createTheme,
  rem,
  type CSSVariablesResolver,
  type MantineColorsTuple,
} from '@mantine/core'

/**
 * Visual language: warm paper neutrals, near-black ink for actions, and color
 * reserved for meaning (gain, loss, pending). Numbers use a monospace face so
 * columns of figures line up.
 */

// Primary actions. Shade 9 is the ink used for filled buttons and focus rings.
const ink: MantineColorsTuple = [
  '#f5f5f4', '#e7e6e3', '#cfcdc8', '#a9a7a1', '#83817b',
  '#5e5c57', '#454440', '#2f2e2b', '#1d1d1b', '#111111',
]

// Warm grays replace Mantine's cool default scale (backgrounds, borders, muted text).
const gray: MantineColorsTuple = [
  '#fafaf7', '#f3f1ec', '#efede8', '#e9e7e1', '#dcd9d0',
  '#b9b6ad', '#9a9890', '#6b6b6b', '#4a4945', '#2b2b2b',
]

const sans = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
const mono = '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace'

export const theme = createTheme({
  colors: { ink, gray },
  primaryColor: 'ink',
  primaryShade: 9,
  black: '#111111',
  white: '#ffffff',

  fontFamily: sans,
  fontFamilyMonospace: mono,
  headings: { fontFamily: sans, fontWeight: '600' },

  defaultRadius: 'md',
  radius: { xs: rem(4), sm: rem(8), md: rem(12), lg: rem(14), xl: rem(18) },
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
    Card: Card.extend({ defaultProps: { withBorder: true, padding: 'lg', shadow: 'xs' } }),
    Paper: Paper.extend({ defaultProps: { withBorder: true } }),
    Button: Button.extend({ defaultProps: { radius: 'sm' } }),
    Badge: Badge.extend({ defaultProps: { variant: 'light', radius: 'sm', tt: 'none', fw: 500 } }),
    Table: Table.extend({ defaultProps: { highlightOnHover: true, verticalSpacing: 'sm', horizontalSpacing: 'md' } }),
    Drawer: Drawer.extend({ defaultProps: { position: 'right', size: 460, overlayProps: { backgroundOpacity: 0.25 } } }),
    NumberInput: NumberInput.extend({ defaultProps: { thousandSeparator: ',', hideControls: true, allowNegative: false } }),
  },
})

/**
 * Page-level colors and our own semantic tokens. Gain/loss/pending are exposed
 * as CSS variables so CSS Modules can use them, e.g. `color: var(--meridian-loss)`.
 * Brand is a neutral accent for figures that are neither good nor bad (capital called).
 */
export const cssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--meridian-brand': '#3a4e8c',
    '--meridian-gain': '#0f8a4f',
    '--meridian-loss': '#c0392b',
    '--meridian-pending': '#a8650f',
  },
  light: {
    '--mantine-color-body': '#fafaf7',
    '--mantine-color-text': '#111111',
    '--mantine-color-dimmed': '#6b6b6b',
    '--mantine-color-default-border': '#e9e7e1',
    '--mantine-color-error': '#c0392b',
  },
  dark: {},
})
