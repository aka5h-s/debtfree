import React, { useId } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Svg, { Defs, Pattern, Circle, Rect } from 'react-native-svg';

export interface DotGridProps {
  style?: StyleProp<ViewStyle>;
  dotColor?: string;
  dotSize?: number;
  spacing?: number;
}

export function DotGrid({
  style,
  dotColor = 'rgba(255, 255, 255, 0.09)',
  dotSize = 1,
  spacing = 14,
}: DotGridProps) {
  const rawId = useId();
  const patternId = 'dotgrid_' + rawId.replace(/[^a-zA-Z0-9]/g, '_');

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={patternId}
            x="0"
            y="0"
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            <Circle
              cx={spacing / 2}
              cy={spacing / 2}
              r={dotSize}
              fill={dotColor}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}
