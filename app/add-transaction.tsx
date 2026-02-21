import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { Icon } from '@/components/Icon';
import { useData } from '@/contexts/DataContext';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { NeoPopButton } from '@/components/NeoPopButton';
import { formatDate } from '@/lib/formatters';
import type { TransactionDirection } from '@/lib/types';
import * as Haptics from 'expo-haptics';

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const { personId, personName } = useLocalSearchParams<{ personId: string; personName: string }>();
  const { addTransaction } = useData();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<TransactionDirection>('YOU_LENT');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setError('Enter a valid amount');
      return;
    }
    await addTransaction(personId, num, direction, note.trim());
    router.back();
  };

  const toggleDirection = (d: TransactionDirection) => {
    setDirection(d);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 12 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>New Transaction</Text>
            <Text style={styles.personLabel}>with {personName}</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Icon name="close" size={24} color={Colors.white} />
          </Pressable>
        </View>

        <Text style={styles.label}>DIRECTION</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, direction === 'YOU_LENT' && styles.toggleActive]}
            onPress={() => toggleDirection('YOU_LENT')}
          >
            <Text style={[styles.toggleText, direction === 'YOU_LENT' && styles.toggleTextActive]}>YOU LENT</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, direction === 'YOU_BORROWED' && styles.toggleActiveBorrow]}
            onPress={() => toggleDirection('YOU_BORROWED')}
          >
            <Text style={[styles.toggleText, direction === 'YOU_BORROWED' && styles.toggleTextActiveBorrow]}>YOU BORROWED</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>AMOUNT</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currencySymbol}>{'\u20B9'}</Text>
          <TextInput
            style={[styles.amountInput, error ? styles.inputError : null]}
            value={amount}
            onChangeText={(t) => { setAmount(t.replace(/[^0-9.]/g, '')); setError(''); }}
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.label}>NOTE (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={note}
          onChangeText={setNote}
          placeholder="What was this for?"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />

        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>DATE</Text>
          <Text style={styles.dateValue}>{formatDate(Date.now())}</Text>
        </View>

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
    fontFamily: 'Outfit_700Bold',
    color: Colors.white,
  },
  personLabel: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: Colors.textSecondary,
    marginBottom: 20,
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
    marginTop: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 0,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleActive: {
    backgroundColor: Colors.cardGreen,
    borderColor: Colors.positive,
  },
  toggleActiveBorrow: {
    backgroundColor: Colors.cardRed,
    borderColor: Colors.negative,
  },
  toggleText: {
    fontSize: 13,
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  toggleTextActive: {
    color: Colors.positive,
  },
  toggleTextActiveBorrow: {
    color: Colors.negative,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 24,
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.textSecondary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: Colors.white,
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    paddingVertical: 14,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
    color: Colors.white,
    fontFamily: 'Outfit_400Regular',
    fontSize: 16,
  },
  inputError: {
    borderColor: Colors.negative,
  },
  multiline: {
    height: 60,
    paddingTop: 14,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Outfit_400Regular',
    color: Colors.negative,
    marginTop: 6,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  dateLabel: {
    fontSize: 11,
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  dateValue: {
    fontSize: 14,
    fontFamily: 'Outfit_500Medium',
    color: Colors.textSecondary,
  },
  actions: {
    marginTop: 24,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Outfit_700Bold',
    color: '#000',
    letterSpacing: 1,
  },
});
