import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { Icon } from '@/components/Icon';
import { useData } from '@/contexts/DataContext';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { formatDate } from '@/lib/formatters';
import type { TransactionDirection } from '@/lib/types';
import * as Haptics from 'expo-haptics';
import { Fonts } from '@/lib/fonts';
import { DatePickerModal } from '@/components/DatePickerModal';
import { sendTestNotificationNow } from '@/lib/notifications';

export default function AddTransactionScreen() {
  const insets = useSafeAreaInsets();
  const { personId, personName } = useLocalSearchParams<{ personId: string; personName: string }>();
  const { addTransaction } = useData();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<TransactionDirection>('YOU_LENT');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [txDate, setTxDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);

  const handleSave = async () => {
    const num = parseFloat(amount);
    if (!amount || isNaN(num) || num <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.back();
    addTransaction(personId, num, direction, note.trim(), txDate.getTime(), returnDate ? returnDate.getTime() : null);
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
          scrollEnabled
          textAlignVertical="top"
        />

        <Pressable
          style={styles.dateRow}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateLabel}>TRANSACTION DATE</Text>
          <View style={styles.dateValueRow}>
            <Text style={styles.dateValue}>{formatDate(txDate.getTime())}</Text>
            <Icon name="calendar-outline" size={16} color={Colors.textMuted} />
          </View>
        </Pressable>

        {/* Return Date Row */}
        <Pressable
          style={styles.dateRow}
          onPress={() => setShowReturnDatePicker(true)}
        >
          <View style={styles.returnLabelGroup}>
            <Text style={styles.dateLabel}>RETURN DATE <Text style={styles.optionalTag}>(OPTIONAL)</Text></Text>
            {returnDate && (
              <Pressable
                onPress={() => {
                  setReturnDate(null);
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                hitSlop={12}
                style={styles.clearBtn}
              >
                <Text style={styles.clearDateText}>CLEAR</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.dateValueRow}>
            <Text style={[styles.dateValue, !returnDate && styles.dateValuePlaceholder]}>
              {returnDate ? formatDate(returnDate.getTime()) : 'NOT SET'}
            </Text>
            <Icon name="calendar-outline" size={16} color={returnDate ? Colors.primary : Colors.textMuted} />
          </View>
        </Pressable>

        {/* Quick Date Presets */}
        <View style={styles.quickPresetsRow}>
          {[
            { label: '+7d', days: 7 },
            { label: '+15d', days: 15 },
            { label: '+30d', days: 30 },
          ].map(p => {
            const target = new Date();
            target.setDate(target.getDate() + p.days);
            const isSelected = returnDate && Math.abs(returnDate.getTime() - target.getTime()) < 3600000 * 12;
            return (
              <Pressable
                key={p.label}
                style={[styles.quickPresetBtn, isSelected && styles.quickPresetBtnActive]}
                onPress={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + p.days);
                  setReturnDate(d);
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.quickPresetText, isSelected && styles.quickPresetTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <NeoPopTiltedButton onPress={handleSave} showShimmer={!isSaved}>
            <Text style={styles.ctaText}>{isSaved ? 'SAVED ✓' : 'SAVE'}</Text>
          </NeoPopTiltedButton>
        </View>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        value={txDate}
        onConfirm={(date) => { setTxDate(date); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
      />

      <DatePickerModal
        visible={showReturnDatePicker}
        value={returnDate || new Date(Date.now() + 7 * 86400000)}
        allowFuture={true}
        onConfirm={(date) => { setReturnDate(date); setShowReturnDatePicker(false); }}
        onClose={() => setShowReturnDatePicker(false)}
      />
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
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  personLabel: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginBottom: 20,
    marginTop: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
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
    fontFamily: Fonts.semibold,
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
    fontFamily: Fonts.serif,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    color: Colors.white,
    fontFamily: Fonts.serif,
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
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  inputError: {
    borderColor: Colors.negative,
  },
  multiline: {
    height: 120,
    paddingTop: 14,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.negative,
    marginTop: 6,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 2,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  dateValue: {
    fontSize: 15,
    fontFamily: Fonts.serif,
    color: Colors.primary,
  },
  actions: {
    marginTop: 24,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
  returnLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  clearDateText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.negative,
    letterSpacing: 0.5,
  },
  optionalTag: {
    fontSize: 9,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  dateValuePlaceholder: {
    color: Colors.textMuted,
  },
  quickPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  quickPresetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#141414',
  },
  quickPresetBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#1E1E14',
  },
  quickPresetText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  quickPresetTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.semibold,
  },
});

