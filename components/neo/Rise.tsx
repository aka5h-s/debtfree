import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

export interface RiseProps {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export function Rise({
  children,
  style,
}: RiseProps) {
  return (
    <View style={style}>
      {children}
    </View>
  );
}
