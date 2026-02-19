import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface NeoPopCardProps {
  children: React.ReactNode;
  color?: string;
  depth?: number;
  borderColor?: string;
  style?: any;
}

export function NeoPopCard({ children, color = Colors.card, depth = 3, borderColor, style }: NeoPopCardProps) {
  const darken = (hex: string, factor: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.round(r * (1 - factor));
    const dg = Math.round(g * (1 - factor));
    const db = Math.round(b * (1 - factor));
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  };

  const lighten = (hex: string, factor: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lr = Math.min(255, Math.round(r + (255 - r) * factor));
    const lg = Math.min(255, Math.round(g + (255 - g) * factor));
    const lb = Math.min(255, Math.round(b + (255 - b) * factor));
    return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.rightShadow, { backgroundColor: lighten(color, 0.15), width: depth }]} />
      <View style={[styles.bottomShadow, { backgroundColor: darken(color, 0.3), height: depth }]} />
      <View style={[
        styles.card,
        { backgroundColor: color },
        borderColor ? { borderWidth: 0.5, borderColor } : null,
      ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    marginRight: 3,
  },
  card: {
    position: 'relative',
    zIndex: 2,
    padding: 16,
  },
  rightShadow: {
    position: 'absolute',
    right: -3,
    top: 3,
    bottom: 0,
    zIndex: 1,
  },
  bottomShadow: {
    position: 'absolute',
    left: 3,
    bottom: -3,
    right: 0,
    zIndex: 1,
  },
});
