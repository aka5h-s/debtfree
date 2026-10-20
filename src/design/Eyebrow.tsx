import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { T, C } from './tokens';

export function Eyebrow({ style, children, ...props }: TextProps) {
  return (
    <Text style={[T.caps, style]} {...props}>
      {children}
    </Text>
  );
}
