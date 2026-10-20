import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { C, T, formatRupees } from './tokens';

export interface AmountProps extends Omit<TextProps, 'children'> {
  value: number | string;
  tone?: 'pos' | 'neg' | 'mute';
  size?: number;
  format?: boolean;
}

export function Amount({
  value,
  tone,
  size = 24,
  format = true,
  style,
  ...props
}: AmountProps) {
  const getToneColor = () => {
    if (tone === 'pos') return C.positive;
    if (tone === 'neg') return C.negative;
    if (tone === 'mute') return C.mutedFg;
    return C.foreground;
  };

  const displayText =
    typeof value === 'number'
      ? format
        ? formatRupees(value)
        : `₹${value}`
      : value;

  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
      style={[
        T.display,
        {
          fontSize: size,
          color: getToneColor(),
        },
        style,
      ]}
      {...props}
    >
      {displayText}
    </Text>
  );
}
