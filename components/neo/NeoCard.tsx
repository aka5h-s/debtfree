import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Extruded, ExtrudedProps } from './Extruded';
import { C } from '@/theme/neo';

export interface NeoCardProps extends Omit<ExtrudedProps, 'depth'> {
  depth?: number;
  innerPadding?: number;
}

export function NeoCard({
  depth = 3,
  face = 'dark',
  bg = C.surface,
  borderColor = C.border,
  innerPadding = 16,
  style,
  contentStyle,
  children,
  ...rest
}: NeoCardProps) {
  return (
    <Extruded
      depth={depth}
      face={face}
      bg={bg}
      borderColor={borderColor}
      style={style}
      contentStyle={[
        { padding: innerPadding },
        contentStyle,
      ]}
      {...rest}
    >
      {children}
    </Extruded>
  );
}
