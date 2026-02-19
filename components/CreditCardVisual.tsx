import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import type { CreditCard, CardType } from '@/lib/types';
import { formatCardNumber } from '@/lib/formatters';

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
        <MaterialCommunityIcons name={getCardTypeIcon(card.cardType)} size={32} color="rgba(255,255,255,0.9)" />
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
    fontFamily: 'Inter_400Regular',
    letterSpacing: 1,
    marginTop: 4,
  },
  numberRow: {
    marginVertical: 4,
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
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
    fontFamily: 'Inter_400Regular',
    letterSpacing: 1,
    marginBottom: 2,
  },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  typeTag: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  typeText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 2,
  },
});
