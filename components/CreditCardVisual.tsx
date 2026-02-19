import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import type { CreditCard, CardType } from '@/lib/types';
import { formatCardNumber } from '@/lib/formatters';

interface CreditCardVisualProps {
  card: CreditCard;
  onCopy?: (label: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function CardBrandLogo({ type }: { type: CardType }) {
  switch (type) {
    case 'VISA':
      return <FontAwesome5 name="cc-visa" size={36} color="rgba(255,255,255,0.9)" />;
    case 'MASTERCARD':
      return <FontAwesome5 name="cc-mastercard" size={36} color="rgba(255,255,255,0.9)" />;
    case 'AMEX':
      return <FontAwesome5 name="cc-amex" size={36} color="rgba(255,255,255,0.9)" />;
    case 'RUPAY':
      return (
        <View style={logoStyles.rupayBadge}>
          <Text style={logoStyles.rupayText}>RuPay</Text>
        </View>
      );
    default:
      return <FontAwesome5 name="credit-card" size={32} color="rgba(255,255,255,0.9)" />;
  }
}

const logoStyles = StyleSheet.create({
  rupayBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  rupayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    letterSpacing: 1,
  },
});

export function CreditCardVisual({ card, onCopy, onEdit, onDelete }: CreditCardVisualProps) {
  const copyToClipboard = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onCopy?.(label);
  };

  return (
    <View style={[styles.card, { backgroundColor: card.color }]}>
      <View style={styles.cardOverlay} />
      <View style={styles.topRow}>
        <View style={styles.chipIcon}>
          <FontAwesome5 name="sim-card" size={24} color="rgba(255,215,0,0.6)" />
        </View>
        <View style={styles.cardActions}>
          {onEdit && (
            <Pressable onPress={onEdit} hitSlop={8} style={styles.cardActionBtn}>
              <Ionicons name="create-outline" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
          {onDelete && (
            <Pressable onPress={onDelete} hitSlop={8} style={styles.cardActionBtn}>
              <Ionicons name="trash-outline" size={18} color="rgba(255,107,107,0.8)" />
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.cardNameLabel}>{card.cardName}</Text>

      <Pressable onPress={() => copyToClipboard(card.cardNumber, 'Card number')} style={styles.numberRow}>
        <Text style={styles.cardNumber}>{formatCardNumber(card.cardNumber)}</Text>
      </Pressable>

      <View style={styles.bottomRow}>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>EXPIRES</Text>
          <Pressable onPress={() => copyToClipboard(card.expiry, 'Expiry')}>
            <Text style={styles.infoValue}>{card.expiry}</Text>
          </Pressable>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>CVV</Text>
          <Pressable onPress={() => copyToClipboard(card.cvv, 'CVV')}>
            <Text style={styles.infoValue}>{card.cvv}</Text>
          </Pressable>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>CARDHOLDER</Text>
          <Pressable onPress={() => copyToClipboard(card.nameOnCard, 'Cardholder name')}>
            <Text style={styles.infoValue} numberOfLines={1}>{card.nameOnCard.toUpperCase()}</Text>
          </Pressable>
        </View>
        <View style={styles.brandBlock}>
          <CardBrandLogo type={card.cardType} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 24,
    aspectRatio: 1.586,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipIcon: {
    transform: [{ rotate: '90deg' }],
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cardActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNameLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontFamily: 'Outfit_400Regular',
    letterSpacing: 1,
    marginTop: 4,
  },
  numberRow: {
    marginVertical: 4,
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Outfit_600SemiBold',
    letterSpacing: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-end',
  },
  infoBlock: {},
  infoLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontFamily: 'Outfit_400Regular',
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Outfit_600SemiBold',
  },
  brandBlock: {
    flex: 1,
    alignItems: 'flex-end' as const,
    justifyContent: 'flex-end' as const,
  },
});
