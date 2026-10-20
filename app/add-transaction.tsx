import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useData } from '@/contexts/DataContext';
import { C, FONT } from '@/theme/neo';
import {
  BackButton,
  Field,
  Segmented,
  TiltButton,
} from '@/components/neo';
import { useToast } from '@/components/neo/Toast';
import type { TransactionDirection } from '@/lib/types';

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const { personId, personName } = useLocalSearchParams<{ personId: string; personName: string }>();
  const { addTransaction } = useData();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<TransactionDirection>('YOU_LENT');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await addTransaction(personId, num, direction, note.trim(), Date.now());
      showToast('Transaction recorded');
      router.back();
    } catch (e: any) {
      showToast(e.message || 'Failed to record transaction');
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

        <Text style={styles.title}>New Transaction</Text>
        <Text style={styles.subtitle}>With {personName || 'Contact'}</Text>

        <View style={styles.form}>
          <Segmented<TransactionDirection>
            options={[
              { value: 'YOU_LENT', label: 'I Gave', tone: 'pos' },
              { value: 'YOU_BORROWED', label: 'I Got', tone: 'neg' },
            ]}
            value={direction}
            onChange={setDirection}
          />

          <Field
            label="AMOUNT (₹)"
            value={amount}
            onChangeText={(t) => {
              setAmount(t);
              setError('');
            }}
            placeholder="0"
            keyboardType="numeric"
            error={error}
            autoFocus
          />

          <Field
            label="NOTE / PURPOSE"
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Dinner, Rent split, Cab"
          />

          <TiltButton
            disabled={submitting}
            onPress={handleSave}
            style={{ marginTop: 12 }}
          >
            {submitting ? 'RECORDING…' : 'RECORD TRANSACTION'}
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
});
