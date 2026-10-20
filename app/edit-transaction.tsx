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

export default function EditTransactionScreen() {
  const { txId } = useLocalSearchParams<{ txId: string }>();
  const { transactions, people, updateTransaction } = useData();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const tx = transactions.find((t) => t.id === txId);
  const person = tx ? people.find((p) => p.id === tx.personId) : null;

  const [amount, setAmount] = useState(tx?.amount.toString() || '');
  const [direction, setDirection] = useState<TransactionDirection>(tx?.direction || 'YOU_LENT');
  const [note, setNote] = useState(tx?.note || '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!tx) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 24) + 16, paddingHorizontal: 20 }]}>
        <BackButton />
        <Text style={[styles.title, { marginTop: 24 }]}>Transaction not found</Text>
      </View>
    );
  }

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setError('Enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await updateTransaction(
        tx,
        num,
        direction,
        note.trim(),
        tx.date,
        tx.returnDate
      );
      showToast('Transaction updated');
      router.back();
    } catch (e: any) {
      showToast(e.message || 'Failed to update transaction');
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

        <Text style={styles.title}>Edit Transaction</Text>
        <Text style={styles.subtitle}>With {person?.name || 'Contact'}</Text>

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
            {submitting ? 'SAVING…' : 'SAVE ENTRY'}
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
