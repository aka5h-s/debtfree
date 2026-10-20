import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { C, FONT } from '@/theme/neo';

export interface AmountProps {
  value: number;
  tone?: 'pos' | 'neg' | 'mute' | 'auto' | 'inherit';
  size?: 'hero' | 'title' | 'card' | 'sm';
  showSign?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function formatIndianCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
  });
  return `₹${formatted}`;
}

export function Amount({
  value,
  tone = 'auto',
  size = 'card',
  showSign = false,
  color,
  style,
  numberOfLines = 1,
}: AmountProps) {
  let finalTone = tone;
  if (tone === 'auto') {
    if (value > 0) finalTone = 'pos';
    else if (value < 0) finalTone = 'neg';
    else finalTone = 'mute';
  }

  let toneColor: string = C.text;
  if (color) {
    toneColor = color;
  } else if (finalTone === 'pos') {
    toneColor = C.green;
  } else if (finalTone === 'neg') {
    toneColor = C.red;
  } else if (finalTone === 'mute') {
    toneColor = C.muted;
  }

  const sign = showSign && value !== 0 ? (value > 0 ? '+' : '-') : '';
  const text = `${sign}${formatIndianCurrency(value)}`;

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        styles[size],
        { color: toneColor },
        style,
      ]}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: FONT.display,
    fontVariant: ['tabular-nums'],
  },
  hero: {
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  card: {
    fontSize: 20,
    lineHeight: 24,
  },
  sm: {
    fontSize: 16,
    lineHeight: 20,
  },
});
