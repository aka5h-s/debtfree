import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/Icon';
import type { CreditCard } from '@/lib/types';
import { getProminentCardGradient } from '@/lib/formatters';
import { Fonts } from '@/lib/fonts';
import { CardNetworkSymbol } from '@/components/CardNetworkSymbol';

interface CreditCardVisualProps {
  card: CreditCard;
  onPress?: () => void;
  onCopy?: (label: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function CreditCardVisual({ card, onPress, onCopy, onEdit, onDelete }: CreditCardVisualProps) {
  const gradient = getProminentCardGradient(card.cardName, card.cardType);

  const copyToClipboard = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onCopy?.(label);
  };

  const getNetworkSubtitle = () => {
    switch (card.cardType) {
      case 'RUPAY':
        return 'RuPay Credit Card';
      case 'MASTERCARD':
        return 'Mastercard Credit Card';
      case 'AMEX':
        return 'Amex Credit Card';
      case 'VISA':
      default:
        return 'VISA Credit Card';
    }
  };

  const last4 = (card.cardNumber || '').replace(/\D/g, '').slice(-4) || '••••';

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.card}
    >
      {/* Specular Ambient Glow Overlay */}
      <LinearGradient
        colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.02)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 0.85 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Main Clickable Card Body (Opens 3D View) */}
      <Pressable
        style={styles.cardBodyPressable}
        onPress={() => {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          onPress?.();
        }}
      >
        {/* Top Row: Card Issuer Name & Network Logo */}
        <View style={styles.topRow}>
          <View style={styles.cardNameContainer}>
            <Text style={styles.cardNameTop} numberOfLines={1}>
              {card.cardName}
            </Text>
            <Text style={styles.cardTypeLabel}>{getNetworkSubtitle()}</Text>
          </View>
          <CardNetworkSymbol type={card.cardType} size="md" />
        </View>

        {/* Middle Row: Masked Card Number & Valid Thru */}
        <View style={styles.middleRow}>
          <View style={styles.numberContainer}>
            <Text style={styles.cardNumber}>•••• {last4}</Text>
          </View>

          <View style={styles.metaBlock}>
            <Text style={styles.validThruLabel}>VALID THRU</Text>
            <Text style={styles.metaValue}>{card.expiry || 'MM/YY'}</Text>
          </View>
        </View>
      </Pressable>

      {/* Bottom Action Strip: Compact Pill Buttons [Edit] [Delete] */}
      {(onEdit || onDelete) && (
        <View style={styles.actionRow}>
          {onEdit && (
            <Pressable
              onPress={onEdit}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            >
              <Icon name="create-outline" size={13} color="#FFFFFF" />
              <Text style={styles.actionText}>Edit</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => [styles.actionBtn, styles.deleteBtn, pressed && { opacity: 0.7 }]}
            >
              <Icon name="trash-outline" size={13} color="#FFFFFF" />
              <Text style={styles.actionText}>Delete</Text>
            </Pressable>
          )}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1.586,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 16,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
  },
  cardBodyPressable: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardNameContainer: {
    flex: 1,
    marginRight: 12,
  },
  cardNameTop: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.bold,
    letterSpacing: 0.4,
  },
  cardTypeLabel: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontSize: 11,
    fontFamily: Fonts.medium,
    marginTop: 3,
    letterSpacing: 0.2,
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 6,
  },
  numberContainer: {
    justifyContent: 'center',
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.bold,
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  metaBlock: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  cvvBlock: {
    alignItems: 'flex-end',
  },
  validThruLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 7.5,
    fontFamily: Fonts.semibold,
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  metaValue: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  deleteBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  actionText: {
    fontSize: 11.5,
    fontFamily: Fonts.semibold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
