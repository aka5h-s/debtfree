import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import type { CreditCard, CardType } from '@/lib/types';
import { formatCardNumber } from '@/lib/formatters';
import { Fonts } from '@/lib/fonts';

import { CardNetworkSymbol } from '@/components/CardNetworkSymbol';

interface CreditCardVisualProps {
  card: CreditCard;
  onCopy?: (label: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

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
        <Text style={styles.cardNameTop}>{card.cardName}</Text>
        <CardNetworkSymbol type={card.cardType} />
      </View>

      <Pressable onPress={() => copyToClipboard(card.cardNumber, 'Card number')} style={styles.numberRow}>
        <Text style={styles.cardNumber}>{formatCardNumber(card.cardNumber, card.cardType)}</Text>
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
        <View style={[styles.infoBlock, { flex: 1, alignItems: 'flex-end' as const }]}>
          <Text style={styles.infoLabel}>CARDHOLDER</Text>
          <Pressable onPress={() => copyToClipboard(card.nameOnCard, 'Cardholder name')}>
            <Text style={styles.infoValue} numberOfLines={1}>{card.nameOnCard.toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>

      {(onEdit || onDelete) && (
        <View style={styles.actionRow}>
          {onEdit && (
            <Pressable onPress={onEdit} style={styles.actionBtn}>
              <Icon name="create-outline" size={15} color="#FFFFFF" />
              <Text style={styles.actionText}>Edit</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable onPress={onDelete} style={[styles.actionBtn, styles.deleteBtn]}>
              <Icon name="trash-outline" size={15} color="#FF6B6B" />
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 24,
    minHeight: 220,
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
  cardNameTop: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: Fonts.semibold,
    letterSpacing: 1,
  },
  numberRow: {
    marginVertical: 4,
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: Fonts.serif,
    letterSpacing: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-end',
  },
  infoBlock: {},
  infoLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontFamily: Fonts.regular,
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.serif,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  deleteBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.45)',
  },
  actionText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: '#FFFFFF',
  },
  deleteText: {
    color: '#FF6B6B',
  },
});
