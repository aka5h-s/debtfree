import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/contexts/DataContext';
import { C, FONT, CARD_COLORS } from '@/theme/neo';
import {
  BackButton,
  Field,
  TiltButton,
  Extruded,
  Eyebrow,
} from '@/components/neo';
import { useToast } from '@/components/neo/Toast';
import { tap } from '@/lib/tap';
import type { CardType } from '@/lib/types';

function formatCardNumber(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export default function EditCardScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const insets = useSafeAreaInsets();
  const { cards, updateCard } = useData();
  const { showToast } = useToast();

  const card = cards.find((c) => c.id === cardId);

  const [cardBank, setCardBank] = useState(card?.cardName || '');
  const [nameOnCard, setNameOnCard] = useState(card?.nameOnCard || '');
  const [cardNumber, setCardNumber] = useState(card ? formatCardNumber(card.cardNumber) : '');
  const [cardType, setCardType] = useState<CardType>(card?.cardType || 'VISA');
  const [expiry, setExpiry] = useState(card?.expiry || '');
  const [cvv, setCvv] = useState(card?.cvv || '');
  const [dueAmount, setDueAmount] = useState(card?.currentBill ? card.currentBill.toString() : '');
  const [cardColor, setCardColor] = useState<string>(card?.color || '#0D0D0D');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!card) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 24) + 16, paddingHorizontal: 20 }]}>
        <BackButton />
        <Text style={[styles.title, { marginTop: 24 }]}>Card not found</Text>
      </View>
    );
  }

  const handleCardNumberChange = (text: string) => {
    const raw = text.replace(/\D/g, '');
    if (raw.startsWith('4')) setCardType('VISA');
    else if (raw.startsWith('5')) setCardType('MASTERCARD');
    else if (raw.startsWith('6')) setCardType('RUPAY');
    else if (raw.startsWith('3')) setCardType('AMEX');
    setCardNumber(formatCardNumber(text));
    setError('');
  };

  const handleSave = async () => {
    const trimmedBank = cardBank.trim();
    const rawNum = cardNumber.replace(/\s+/g, '');

    if (!trimmedBank) {
      setError('Card / Bank name is required');
      return;
    }
    if (!rawNum || rawNum.length < 12) {
      setError('Enter a valid card number');
      return;
    }

    setSubmitting(true);
    try {
      await updateCard({
        ...card,
        cardName: trimmedBank,
        nameOnCard: nameOnCard.trim(),
        cardNumber: rawNum,
        cardType,
        expiry: expiry.trim(),
        cvv: cvv.trim(),
        color: cardColor,
        currentBill: parseFloat(dueAmount) || 0,
      });
      showToast('Card updated');
      router.back();
    } catch (e: any) {
      showToast(e.message || 'Failed to update card');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, 24) + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <BackButton />
        </View>

        <Text style={styles.title}>Edit Card</Text>
        <Text style={styles.subtitle}>Update card details for {card.cardName}</Text>

        <View style={styles.form}>
          <Field
            label="BANK / CARD NAME"
            value={cardBank}
            onChangeText={(t) => {
              setCardBank(t);
              setError('');
            }}
            placeholder="e.g. HDFC Millennia"
            error={error}
          />

          <Field
            label="NAME ON CARD"
            value={nameOnCard}
            onChangeText={setNameOnCard}
            placeholder="e.g. Rahul Sharma"
            autoCapitalize="characters"
          />

          <Field
            label="CARD NUMBER"
            value={cardNumber}
            onChangeText={handleCardNumberChange}
            placeholder="•••• •••• •••• ••••"
            keyboardType="numeric"
          />

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Field
                label="EXPIRY"
                value={expiry}
                onChangeText={(t) => setExpiry(formatExpiry(t))}
                placeholder="MM/YY"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="CVV"
                value={cvv}
                onChangeText={setCvv}
                placeholder="•••"
                keyboardType="numeric"
                secureTextEntry
              />
            </View>
          </View>

          <Field
            label="CURRENT DUE (₹)"
            value={dueAmount}
            onChangeText={setDueAmount}
            placeholder="0"
            keyboardType="numeric"
          />

          <View style={styles.swatchesSection}>
            <Eyebrow style={{ marginBottom: 10 }}>CARD COLOR</Eyebrow>
            <View style={styles.swatchesRow}>
              {CARD_COLORS.map((col) => {
                const isSelected = cardColor === col.value;
                return (
                  <Pressable
                    key={col.value}
                    onPress={() => {
                      tap('light');
                      setCardColor(col.value);
                    }}
                    style={[
                      styles.swatchWrap,
                      isSelected && styles.swatchSelected,
                    ]}
                  >
                    <Extruded
                      depth={3}
                      face="dark"
                      bg={col.value}
                      contentStyle={styles.swatchBox}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TiltButton
            disabled={submitting}
            onPress={handleSave}
            style={{ marginTop: 12 }}
          >
            {submitting ? 'SAVING…' : 'SAVE CHANGES'}
          </TiltButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  topBar: {
    marginBottom: 20,
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: C.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONT.sans,
    fontSize: 14,
    color: C.muted,
    marginBottom: 24,
  },
  form: {
    gap: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  swatchesSection: {
    marginTop: 4,
  },
  swatchesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  swatchWrap: {
    padding: 2,
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: C.poli,
  },
  swatchBox: {
    width: 36,
    height: 36,
  },
});
