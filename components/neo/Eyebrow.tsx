import React from 'react';
import { Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { C, FONT } from '@/theme/neo';

export interface EyebrowProps {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export function Eyebrow({
  children,
  color = C.muted,
  style,
  numberOfLines = 1,
}: EyebrowProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.eyebrow,
        { color },
        style,
      ]}
    >
      {typeof children === 'string' ? children.toUpperCase() : children}
    </Text>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: FONT.sansBold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 2.3,
    textTransform: 'uppercase',
  },
});
