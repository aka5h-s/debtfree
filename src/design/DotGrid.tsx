import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Rect, Circle } from 'react-native-svg';

export interface DotGridProps {
  opacity?: number;
  spacing?: number;
  radius?: number;
  color?: string;
}

export function DotGrid({
  opacity = 0.09,
  spacing = 14,
  radius = 1,
  color = '#FAFAFA',
}: DotGridProps) {
  // Use fixed or sanitized safe pattern ID
  const patternId = 'neo_dotgrid_pattern';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={patternId}
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            <Circle
              cx={radius}
              cy={radius}
              r={radius}
              fill={color}
              opacity={opacity}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}
