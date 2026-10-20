import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Pattern, Line, Rect, Circle } from 'react-native-svg';
import { CreditCard, CardType } from '@/lib/types';
import { shade } from './tokens';
import { NeoCard } from './NeoCard';

export interface CreditCardVisualProps {
  card: CreditCard;
  isRevealed?: boolean;
  onPress?: () => void;
  width?: number;
}

export function CreditCardVisual({
  card,
  isRevealed = false,
  onPress,
  width,
}: CreditCardVisualProps) {
  const baseColor = card.color || '#0D0D0D';
  const cLight = shade(baseColor, 30);
  const cDark = shade(baseColor, -50);

  // Card number with TWO spaces between groups
  const rawNum = (card.cardNumber || '').replace(/\s+/g, '');
  const last4 = rawNum.slice(-4) || '0000';
  const formattedFull = rawNum.replace(/(.{4})/g, '$1  ').trim();
  const displayedNumber = isRevealed
    ? (formattedFull || `••••  ••••  ••••  ${last4}`)
    : `••••  ••••  ••••  ${last4}`;

  const renderNetworkSymbol = (type: CardType) => {
    switch (type) {
      case 'MASTERCARD':
        return (
          <Svg width={44} height={28} viewBox="0 0 44 28">
            <Circle cx={14} cy={14} r={14} fill="#EB001B" />
            <Circle cx={30} cy={14} r={14} fill="#F79E1B" fillOpacity={0.88} />
          </Svg>
        );
      case 'VISA':
        return <Text style={styles.networkMark}>VISA</Text>;
      case 'RUPAY':
        return <Text style={styles.networkMark}>RuPay</Text>;
      case 'AMEX':
        return <Text style={styles.networkMark}>AMEX</Text>;
      default:
        return <Text style={styles.networkMark}>{type}</Text>;
    }
  };

  return (
    <NeoCard
      depth={6}
      face="dark"
      press={!!onPress}
      onPress={onPress}
      containerStyle={width ? { width, aspectRatio: 1.586 } : { width: '100%', aspectRatio: 1.586 }}
      style={{
        flex: 1,
        borderRadius: 0,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(250, 250, 250, 0.1)',
      }}
    >
      {/* 135 deg LinearGradient */}
      <LinearGradient
        colors={[cLight, cDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Sheen & Diagonal Stripes pattern overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <Pattern
              id="carousel_card_stripes"
              width="6"
              height="6"
              patternTransform="rotate(-45)"
              patternUnits="userSpaceOnUse"
            >
              <Line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeOpacity="0.03"
              />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#carousel_card_stripes)" />
        </Svg>
      </View>

      <LinearGradient
        colors={['rgba(255,255,255,0.14)', 'transparent']}
        locations={[0, 0.45]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Card Content Layout */}
      <View style={styles.cardContent}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.cardEyebrow}>CREDIT CARD</Text>
            <Text numberOfLines={1} style={styles.cardTitle}>
              {card.cardName || 'Card'}
            </Text>
          </View>

          {/* Chip */}
          <View style={styles.chip}>
            <LinearGradient
              colors={['#C4E242', '#86A71C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.chipLineH} />
            <View style={styles.chipLineV1} />
            <View style={styles.chipLineV2} />
          </View>
        </View>

        {/* Card Number in Mono */}
        <View style={styles.numberRow}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            style={styles.cardNumber}
          >
            {displayedNumber}
          </Text>
        </View>

        {/* Bottom row: Holder + Expiry on left (24px gap), Network mark on right */}
        <View style={styles.bottomRow}>
          <View style={styles.metaRow}>
            <View>
              <Text style={styles.metaLabel}>CARD HOLDER</Text>
              <Text numberOfLines={1} style={styles.metaValue}>
                {card.nameOnCard || 'CARDHOLDER'}
              </Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>EXPIRES</Text>
              <Text style={styles.metaExpiry}>{card.expiry || 'MM/YY'}</Text>
            </View>
          </View>

          <View style={styles.networkBadge}>
            {renderNetworkSymbol(card.cardType || 'VISA')}
          </View>
        </View>
      </View>
    </NeoCard>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardEyebrow: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(242, 242, 242, 0.6)',
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: 'Fraunces_900Black',
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 22,
    color: '#F2F2F2',
  },
  chip: {
    width: 38,
    height: 26,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
    position: 'relative',
    marginTop: 2,
  },
  chipLineH: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  chipLineV1: {
    position: 'absolute',
    left: 11,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  chipLineV2: {
    position: 'absolute',
    right: 11,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  numberRow: {
    marginVertical: 2,
  },
  cardNumber: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 18,
    letterSpacing: 2.2,
    color: '#F2F2F2',
    fontVariant: ['tabular-nums'],
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-end',
    flex: 1,
  },
  metaLabel: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: 'rgba(242, 242, 242, 0.5)',
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 12,
    letterSpacing: 0,
    color: '#F2F2F2',
  },
  metaExpiry: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 12,
    letterSpacing: 0,
    color: '#F2F2F2',
  },
  networkBadge: {
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  networkMark: {
    fontFamily: 'Fraunces_900Black_Italic',
    fontStyle: 'italic',
    fontSize: 18,
    letterSpacing: -0.4,
    color: '#F2F2F2',
  },
});
