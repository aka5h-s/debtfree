import { TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

export const C = {
  background: '#0D0D0D',
  surface: '#161616',
  surface2: '#1F1F1F',
  muted: '#1F1F1F',
  border: '#2A2A2A',
  borderLight: '#525252',
  foreground: '#FAFAFA',
  mutedFg: '#9E9E9E',
  primary: '#E5FE40', // CRED "poli" yellow
  positive: '#06C270',
  positiveDeep: '#005E31',
  negative: '#EE4D37',
  negativeDeep: '#791B0C',
};

// Extrusion faces: r = right side face, b = bottom face (bottom is always darker)
export const FACE = {
  poli: { r: '#9DB030', b: '#6C7A15' },
  white: { r: '#B7B7B7', b: '#808080' },
  dark: { r: '#2A2A2A', b: '#1A1A1A' }, // default
  green: { r: '#00884B', b: '#005E31' },
  red: { r: '#8A2B1F', b: '#8A2B1F' },
};

export const DEPTH = { flat: 3, normal: 4, deep: 6 };

export const T = {
  display: { fontFamily: 'Fraunces_900Black', color: C.foreground, letterSpacing: -0.5 } as TextStyle,
  body: { fontFamily: 'Manrope_400Regular', color: C.foreground, fontSize: 14 } as TextStyle,
  bold: { fontFamily: 'Manrope_700Bold', color: C.foreground } as TextStyle,
  mono: { fontFamily: 'JetBrainsMono_700Bold', color: C.foreground } as TextStyle,
  // "label-caps" / "Eyebrow": the small uppercase labels used everywhere
  caps: { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase', color: C.mutedFg } as TextStyle,
};

export const haptic = (k: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    if (k === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    else if (k === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

export function formatRupees(amount: number): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(absVal);
  return `${isNegative ? '−' : ''}₹${formatted}`;
}

export function shade(hex: string, amt: number): string {
  if (!hex || !hex.startsWith('#')) return hex || '#0D0D0D';
  let c = hex.slice(1);
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return hex;
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0x00ff) + amt;
  let b = (num & 0x0000ff) + amt;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
