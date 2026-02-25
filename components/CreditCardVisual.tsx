import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import type { CreditCard, CardType } from '@/lib/types';
import { formatCardNumber } from '@/lib/formatters';
import { Fonts } from '@/lib/fonts';

interface CreditCardVisualProps {
  card: CreditCard;
  onCopy?: (label: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function getCardTypeIcon(type: CardType) {
  switch (type) {
    case 'VISA': return 'credit-card';
    case 'MASTERCARD': return 'credit-card-multiple';
    case 'RUPAY': return 'credit-card-chip';
  }
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
        <Icon family="material-community" name={getCardTypeIcon(card.cardType)} size={32} color="rgba(255,255,255,0.9)" />
        <Text style={styles.cardNameTop}>{card.cardName}</Text>
      </View>

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
        <View style={[styles.infoBlock, { flex: 1, alignItems: 'flex-end' as const }]}>
          <Text style={styles.infoLabel}>CARDHOLDER</Text>
          <Pressable onPress={() => copyToClipboard(card.nameOnCard, 'Cardholder name')}>
            <Text style={styles.infoValue} numberOfLines={1}>{card.nameOnCard.toUpperCase()}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.typeTag}>
        <Text style={styles.typeText}>{card.cardType}</Text>
      </View>

      {(onEdit || onDelete) && (
        <View style={styles.actionRow}>
          {onEdit && (
            <Pressable onPress={onEdit} style={styles.actionBtn}>
              <Icon name="create-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.actionText}>Edit</Text>
            </Pressable>
          )}
          {onDelete && (
            <Pressable onPress={onDelete} style={[styles.actionBtn, styles.deleteBtn]}>
              <Icon name="trash-outline" size={16} color="#EE4D37" />
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
    minHeight: 200,
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
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    letterSpacing: 1,
  },
  numberRow: {
    marginVertical: 4,
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
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
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
  },
  typeTag: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  typeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    letterSpacing: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  deleteBtn: {
    backgroundColor: 'rgba(238,77,55,0.15)',
  },
  actionText: {
    fontSize: 12,
    fontFamily: Fonts.medium, fontWeight: "500" as const,
    color: 'rgba(255,255,255,0.8)',
  },
  deleteText: {
    color: '#EE4D37',
  },
});
