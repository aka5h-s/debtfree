export const C = {
  bg: '#0D0D0D',          // app background (can go to #050505)
  bgDark: '#050505',
  surface: '#161616',     // cards, sheets
  surface2: '#1F1F1F',    // inputs-on-card, back button, inactive chips
  sheetBg: '#111111',     // bottom sheet background
  border: '#2A2A2A',      // 1px hairlines
  borderStrong: '#3A3A3A',
  text: '#FFFFFF',        // primary white text
  muted: '#8A8A8A',       // muted labels, secondary text
  ink: '#0D0D0D',         // text on bright buttons
  poli: '#E5FE40',        // CRED poli yellow
  poliEdge: '#8A9A1F',    // poli bottom/right 3D edge
  green: '#06C270',       // green for positive / lent
  greenEdge: '#0A6B42',   // green 3D edge
  greenDeep: '#0B3D27',   // deep green balance card surface
  red: '#EE4D37',         // red for negative / borrowed
  redEdge: '#8A2B1F',     // red 3D edge
  redDeep: '#3D1210',     // deep red balance card surface
  white: '#FFFFFF',
  whiteEdge: '#8A8A8A',
} as const;

// Extrusion faces: solid right face + bottom face (4–6px), chamfered 45°
export const FACE = {
  poli:  { right: '#8A9A1F', bottom: '#8A9A1F' },
  white: { right: '#8A8A8A', bottom: '#8A8A8A' },
  dark:  { right: '#2A2A2A', bottom: '#1A1A1A' },
  green: { right: '#0A6B42', bottom: '#0A6B42' },
  red:   { right: '#8A2B1F', bottom: '#8A2B1F' },
} as const;

export type FaceVariant = keyof typeof FACE;

export const DEPTH = { card: 4, button: 4, deep: 6 } as const;

export const FONT = {
  display: 'Fraunces_900Black',      // big numbers, titles (serif)
  displayBold: 'Fraunces_700Bold',
  sans: 'Manrope_500Medium',
  sansBold: 'Manrope_700Bold',
  sansX: 'Manrope_800ExtraBold',     // buttons, labels
  mono: 'JetBrainsMono_500Medium',   // card numbers, dates
} as const;

export const S = { pagePad: 20, gap: 12, section: 24 } as const;

export const CARD_COLORS = [
  { name: 'Black', value: '#0D0D0D' },
  { name: 'Midnight Blue', value: '#1A237E' },
  { name: 'Purple', value: '#4A148C' },
  { name: 'Green', value: '#1B5E20' },
  { name: 'Orange', value: '#E65100' },
  { name: 'Dark Red', value: '#B71C1C' },
] as const;
