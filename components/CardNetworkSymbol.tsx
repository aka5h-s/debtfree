import React from 'react';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';
import type { CardType } from '@/lib/types';

const NETWORK_LOGOS = {
  VISA: require('@/assets/images/logos/visa.png'),
  MASTERCARD: require('@/assets/images/logos/mastercard.png'),
  RUPAY: require('@/assets/images/logos/rupay.png'),
  AMEX: require('@/assets/images/logos/amex.png'),
};

export interface CardNetworkSymbolProps {
  type: CardType;
  size?: 'sm' | 'md' | 'lg';
  width?: number;
  height?: number;
  style?: ViewStyle | ViewStyle[];
}

export function CardNetworkSymbol({
  type,
  size = 'md',
  width,
  height,
  style,
}: CardNetworkSymbolProps) {
  const source = NETWORK_LOGOS[type];
  if (!source) return null;

  // Aspect-ratio-calibrated dimensions for each network logo
  // Visa: aspect 3.10, RuPay: aspect 3.77, Mastercard: aspect 1.62, Amex: aspect 1.00
  const dimensions = {
    sm: {
      RUPAY: { w: 52, h: 14 },
      VISA: { w: 46, h: 15 },
      MASTERCARD: { w: 32, h: 20 },
      AMEX: { w: 24, h: 24 },
    },
    md: {
      RUPAY: { w: 68, h: 18 },
      VISA: { w: 60, h: 20 },
      MASTERCARD: { w: 42, h: 26 },
      AMEX: { w: 32, h: 32 },
    },
    lg: {
      RUPAY: { w: 82, h: 22 },
      VISA: { w: 74, h: 24 },
      MASTERCARD: { w: 52, h: 32 },
      AMEX: { w: 38, h: 38 },
    },
  }[size][type] || { w: 50, h: 20 };

  const finalW = width ?? dimensions.w;
  const finalH = height ?? dimensions.h;

  return (
    <View style={[styles.container, { width: finalW, height: finalH }, style]}>
      <Image
        source={source}
        style={{ width: finalW, height: finalH }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
