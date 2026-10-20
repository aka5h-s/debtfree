import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Pattern, Line, Rect } from 'react-native-svg';

export interface CardSheenProps {
  style?: StyleProp<ViewStyle>;
}

export function CardSheen({ style }: CardSheenProps) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {/* 135° Gradient sheen: from top-left to bottom-right */}
      <LinearGradient
        colors={[
          'rgba(255,255,255,0.14)',
          'rgba(255,255,255,0.04)',
          'transparent',
        ]}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Faint diagonal stripes 2px every 6px at -45° */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            id="stripesPattern"
            width="6"
            height="6"
            patternTransform="rotate(-45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <Line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="2"
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#stripesPattern)" />
      </Svg>
    </View>
  );
}
