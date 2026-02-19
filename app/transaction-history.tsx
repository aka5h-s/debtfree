import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { TransactionHistory as TxHistory } from '@/lib/types';

export default function TransactionHistoryScreen() {
  const { txId } = useLocalSearchParams<{ txId: string }>();
  const { getTransactionHistory } = useData();
  const [history, setHistory] = useState<TxHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const h = await getTransactionHistory(txId);
      setHistory(h);
      setLoading(false);
    })();
  }, [txId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit History</Text>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : history.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No edit history</Text>
          <Text style={styles.emptySubtext}>This transaction has not been modified</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.timeline} showsVerticalScrollIndicator={false}>
          {history.map((entry, idx) => {
            const isLent = entry.previousDirection === 'YOU_LENT';
            const color = isLent ? Colors.positive : Colors.negative;
            const isLast = idx === history.length - 1;

            return (
              <View key={entry.id} style={styles.timelineItem}>
                <View style={styles.timelineLine}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  {!isLast && <View style={styles.connector} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.changeDate}>{formatDate(entry.changedAt)}</Text>
                  <View style={styles.changeCard}>
                    <Text style={[styles.changeDirection, { color }]}>
                      {isLent ? 'YOU LENT' : 'YOU BORROWED'}
                    </Text>
                    <Text style={[styles.changeAmount, { color }]}>
                      {formatCurrency(entry.previousAmount)}
                    </Text>
                    {entry.previousNote ? (
                      <Text style={styles.changeNote}>{entry.previousNote}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginTop: 4,
  },
  timeline: {
    paddingBottom: 40,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineLine: {
    alignItems: 'center',
    width: 20,
    marginRight: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  connector: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  changeDate: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  changeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  changeDirection: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  changeAmount: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  changeNote: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 6,
  },
});
