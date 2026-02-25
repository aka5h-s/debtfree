import React, { useMemo } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopCard } from '@/components/NeoPopCard';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { NeoPopButton } from '@/components/NeoPopButton';
import { ShimmerText } from '@/components/ShimmerText';
import { formatCurrency, formatRelativeDate } from '@/lib/formatters';
import type { Transaction } from '@/lib/types';
import { Fonts } from '@/lib/fonts';

function TransactionItem({ tx, onEdit, onDelete, onHistory }: { tx: Transaction; onEdit: () => void; onDelete: () => void; onHistory: () => void }) {
  const isLent = tx.direction === 'YOU_LENT';
  const color = isLent ? Colors.positive : Colors.negative;
  const label = isLent ? 'YOU LENT' : 'YOU BORROWED';

  return (
    <View style={styles.txContainer}>
      <NeoPopCard color={Colors.surface} depth={2}>
        <View style={styles.txContent}>
          <View style={[styles.txIndicator, { backgroundColor: color }]} />
          <View style={styles.txMain}>
            <View style={styles.txTopRow}>
              <Text style={[styles.txLabel, { color }]}>{label}</Text>
              <Text style={[styles.txAmount, { color }]}>{formatCurrency(tx.amount)}</Text>
            </View>
            {tx.note ? <Text style={styles.txNote} numberOfLines={2}>{tx.note}</Text> : null}
            <Text style={styles.txDate}>{formatRelativeDate(tx.date)}</Text>
            <View style={styles.txActions}>
              <Pressable onPress={onHistory} style={styles.txActionBtn} hitSlop={8}>
                <Icon name="time-outline" size={16} color={Colors.textMuted} />
              </Pressable>
              <Pressable onPress={onEdit} style={styles.txActionBtn} hitSlop={8}>
                <Icon name="create-outline" size={16} color={Colors.textMuted} />
              </Pressable>
              <Pressable onPress={onDelete} style={styles.txActionBtn} hitSlop={8}>
                <Icon name="trash-outline" size={16} color={Colors.negative} />
              </Pressable>
            </View>
          </View>
        </View>
      </NeoPopCard>
    </View>
  );
}

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { people, getPersonTransactions, getPersonBalance, removeTransaction, removePerson } = useData();

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);

  const person = people.find(p => p.id === id);
  const transactions = useMemo(() => person ? getPersonTransactions(person.id) : [], [person, getPersonTransactions]);
  const balance = person ? getPersonBalance(person.id) : 0;

  if (!person) {
    return (
      <View style={[styles.container, { paddingTop: topPad + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Person not found</Text>
        </View>
      </View>
    );
  }

  const status = balance > 0 ? 'YOU LENT' : balance < 0 ? 'YOU OWE' : 'SETTLED';
  const statusColor = balance > 0 ? Colors.positive : balance < 0 ? Colors.negative : Colors.settled;
  const avatarBg = balance > 0 ? Colors.cardGreen : balance < 0 ? Colors.cardRed : Colors.surfaceLight;

  const handleDeleteTx = (txId: string) => {
    if (Platform.OS === 'web') {
      if (confirm('Delete this transaction?')) removeTransaction(txId);
    } else {
      Alert.alert('Delete Transaction', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeTransaction(txId) },
      ]);
    }
  };

  const handleDeletePerson = () => {
    if (Platform.OS === 'web') {
      if (confirm(`Delete "${person.name}" and all transactions?`)) {
        removePerson(person.id);
        router.back();
      }
    } else {
      Alert.alert('Delete Person', `Delete "${person.name}" and all their transactions?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => { removePerson(person.id); router.back(); } },
      ]);
    }
  };

  const renderHeader = () => (
    <View>
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={Colors.white} />
        </Pressable>
        <View style={styles.topBarRight}>
          <Pressable onPress={() => router.push({ pathname: '/edit-person', params: { personId: person.id } })} style={styles.backBtn}>
            <Icon name="create-outline" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Pressable onPress={handleDeletePerson} style={styles.backBtn}>
            <Icon name="trash-outline" size={22} color={Colors.negative} />
          </Pressable>
        </View>
      </View>

      <View style={styles.profileSection}>
        <View style={[styles.largeAvatar, { backgroundColor: avatarBg, borderColor: statusColor }]}>
          <Text style={styles.largeAvatarText}>{person.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{person.name}</Text>
        {person.phone ? <Text style={styles.profilePhone}>{person.phone}</Text> : null}
        <Text style={[styles.profileStatus, { color: statusColor }]}>{status}</Text>
        <ShimmerText
          text={formatCurrency(Math.abs(balance))}
          style={[styles.profileBalance, { color: statusColor }]}
        />
      </View>

      <View style={styles.addTxSection}>
        <NeoPopTiltedButton
          onPress={() => router.push({ pathname: '/add-transaction', params: { personId: person.id, personName: person.name } })}
          showShimmer
        >
          <Text style={styles.ctaText}>NEW TRANSACTION</Text>
        </NeoPopTiltedButton>
      </View>

      {transactions.length > 0 && (
        <View style={styles.txSectionHeader}>
          <Text style={styles.txSectionTitle}>TRANSACTIONS</Text>
          <Text style={styles.txCount}>{transactions.length}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionItem
            tx={item}
            onEdit={() => router.push({ pathname: '/edit-transaction', params: { txId: item.id } })}
            onDelete={() => handleDeleteTx(item.id)}
            onHistory={() => router.push({ pathname: '/transaction-history', params: { txId: item.id } })}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="receipt-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : 40 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 16,
  },
  largeAvatarText: {
    fontSize: 32,
    fontFamily: Fonts.bold, fontWeight: "700" as const,
    color: Colors.white,
  },
  profileName: {
    fontSize: 24,
    fontFamily: Fonts.bold, fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  profileStatus: {
    fontSize: 11,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    letterSpacing: 2,
    marginBottom: 4,
  },
  profileBalance: {
    fontSize: 36,
    fontFamily: Fonts.bold, fontWeight: "700" as const,
  },
  addTxSection: {
    paddingHorizontal: 40,
    marginTop: 16,
    marginBottom: 28,
  },
  txSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  txSectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  txCount: {
    fontSize: 12,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    color: Colors.textMuted,
  },
  txContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  txContent: {
    flexDirection: 'row',
  },
  txIndicator: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
  },
  txMain: {
    flex: 1,
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  txLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold, fontWeight: "600" as const,
    letterSpacing: 1,
  },
  txAmount: {
    fontSize: 18,
    fontFamily: Fonts.bold, fontWeight: "700" as const,
  },
  txNote: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  txDate: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  txActions: {
    flexDirection: 'row',
    gap: 16,
  },
  txActionBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: Fonts.medium, fontWeight: "500" as const,
    color: Colors.textMuted,
    marginTop: 12,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: Fonts.bold, fontWeight: "700" as const,
    color: '#000',
    letterSpacing: 1,
  },
});
