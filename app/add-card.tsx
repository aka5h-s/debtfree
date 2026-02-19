import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { CARD_COLORS } from '@/lib/types';
import type { CardType, CardColor } from '@/lib/types';

const CARD_TYPES: CardType[] = ['VISA', 'MASTERCARD', 'RUPAY'];

export default function AddCardScreen() {
  const { addCard } = useData();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardType, setCardType] = useState<CardType>('VISA');
  const [nameOnCard, setNameOnCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [color, setColor] = useState<CardColor>(CARD_COLORS[0].value);
  const [error, setError] = useState('');

  const formatCardInput = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiryInput = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
    return digits;
  };

  const handleSave = async () => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (!cardName.trim() || cleanNumber.length !== 16 || !nameOnCard.trim() || expiry.length !== 5 || cvv.length !== 3) {
      setError('All fields are required. Card number must be 16 digits, expiry MM/YY, CVV 3 digits.');
      return;
    }
    await addCard({ cardName: cardName.trim(), cardNumber: cleanNumber, cardType, nameOnCard: nameOnCard.trim(), expiry, cvv, color });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 12 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Add Card</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.white} />
          </Pressable>
        </View>

        <Text style={styles.label}>CARD NAME</Text>
        <TextInput
          style={styles.input}
          value={cardName}
          onChangeText={(t) => { setCardName(t); setError(''); }}
          placeholder="e.g., HDFC Millennia"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.label}>CARD NUMBER</Text>
        <TextInput
          style={styles.input}
          value={cardNumber}
          onChangeText={(t) => setCardNumber(formatCardInput(t))}
          placeholder="XXXX XXXX XXXX XXXX"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          maxLength={19}
        />

        <Text style={styles.label}>CARD TYPE</Text>
        <View style={styles.typeRow}>
          {CARD_TYPES.map(t => (
            <Pressable
              key={t}
              style={[styles.typeBtn, cardType === t && styles.typeBtnActive]}
              onPress={() => {
                setCardType(t);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.typeText, cardType === t && styles.typeTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>NAME ON CARD</Text>
        <TextInput
          style={styles.input}
          value={nameOnCard}
          onChangeText={setNameOnCard}
          placeholder="Cardholder name"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="characters"
        />

        <View style={styles.rowFields}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>EXPIRY (MM/YY)</Text>
            <TextInput
              style={styles.input}
              value={expiry}
              onChangeText={(t) => setExpiry(formatExpiryInput(t))}
              placeholder="MM/YY"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>CVV</Text>
            <TextInput
              style={styles.input}
              value={cvv}
              onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 3))}
              placeholder="***"
              placeholderTextColor={Colors.textMuted}
              keyboardType="number-pad"
              maxLength={3}
              secureTextEntry
            />
          </View>
        </View>

        <Text style={styles.label}>CARD COLOR</Text>
        <View style={styles.colorRow}>
          {CARD_COLORS.map(c => (
            <Pressable
              key={c.value}
              style={[styles.colorBtn, { backgroundColor: c.value }, color === c.value && styles.colorBtnActive]}
              onPress={() => {
                setColor(c.value);
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              {color === c.value && <Ionicons name="checkmark" size={16} color="#fff" />}
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actions}>
          <NeoPopTiltedButton onPress={handleSave} showShimmer>
            <Text style={styles.ctaText}>SAVE</Text>
          </NeoPopTiltedButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    overflow: 'hidden' as const,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 4,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
    color: Colors.white,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
  },
  typeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255, 235, 52, 0.1)',
  },
  typeText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  typeTextActive: {
    color: Colors.primary,
  },
  rowFields: {
    flexDirection: 'row',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  colorBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorBtnActive: {
    borderColor: Colors.primary,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.negative,
    marginTop: 12,
  },
  actions: {
    marginTop: 24,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    letterSpacing: 1,
  },
});
