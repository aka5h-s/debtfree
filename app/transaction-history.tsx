import React, { useEffect, useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView, ActivityIndicator,
  Platform, Pressable, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { TransactionHistory as TxHistory } from '@/lib/types';
import { Fonts } from '@/lib/fonts';
import * as Haptics from 'expo-haptics';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Build a plain-english one-liner for what changed
function buildChangeSummary(
  entry: TxHistory,
  afterAmount: number,
  afterDirection: string,
  afterNote: string,
  afterDate: number,
): string {
  const parts: string[] = [];
  if (entry.previousAmount !== afterAmount) parts.push('amount');
  if (entry.previousDirection !== afterDirection) parts.push('type');
  if ((entry.previousNote || '') !== (afterNote || '')) parts.push('note');
  if (entry.previousDate !== afterDate) parts.push('date');
  if (parts.length === 0) return 'minor edit';
  if (parts.length === 1) return `${parts[0]} changed`;
  if (parts.length === 2) return `${parts[0]} & ${parts[1]} changed`;
  return parts.slice(0, -1).join(', ') + ' & ' + parts[parts.length - 1] + ' changed';
}

export default function TransactionHistoryScreen() {
  const { txId } = useLocalSearchParams<{ txId: string }>();
  const { getTransactionHistory, transactions, updateTransaction } = useData();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);
  const [history, setHistory] = useState<TxHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<string | null>(null);

  const currentTx = transactions.find(t => t.id === txId);

  useEffect(() => {
    (async () => {
      const h = await getTransactionHistory(txId);
      setHistory([...h].sort((a, b) => b.changedAt - a.changedAt));
      setLoading(false);
    })();
  }, [txId]);

  const handleRestore = (entry: TxHistory) => {
    if (!currentTx) return;

    const doRestore = () => {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRestoring(entry.id);
      updateTransaction(
        currentTx,
        entry.previousAmount,
        entry.previousDirection,
        entry.previousNote,
        entry.previousDate ?? currentTx.date,
      ).then(() => {
        setRestoring(null);
        router.back();
      }).catch(() => setRestoring(null));
    };

    if (Platform.OS === 'web') {
      if (confirm('Restore this version?')) doRestore();
    } else {
      Alert.alert(
        'Restore this version?',
        `The transaction will be set back to:\n\n${entry.previousDirection === 'YOU_LENT' ? 'You Lent' : 'You Borrowed'} ${formatCurrency(entry.previousAmount)}\n${formatDate(entry.previousDate ?? currentTx.date)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restore', onPress: doRestore },
        ],
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.titleArea}>
            <Text style={styles.screenLabel}>HISTORY</Text>
            {currentTx && (
              <Text style={styles.currentAmount}>
                {formatCurrency(currentTx.amount)}
              </Text>
            )}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.textMuted} style={{ marginTop: 60 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>◎</Text>
            <Text style={styles.emptyText}>No edits made</Text>
            <Text style={styles.emptySubtext}>This transaction hasn't been modified</Text>
          </View>
        ) : (
          <View style={styles.feed}>
            {/* Current version pill */}
            {currentTx && (
              <View style={styles.currentCard}>
                <View style={styles.currentCardTop}>
                  <Text style={styles.currentPill}>CURRENT</Text>
                  <Text style={styles.entryTime}>{formatDate(currentTx.date)}</Text>
                </View>
                <View style={styles.currentCardBody}>
                  <View>
                    <Text style={styles.entryDirection}>
                      {currentTx.direction === 'YOU_LENT' ? 'YOU LENT' : 'YOU BORROWED'}
                    </Text>
                    <Text style={[
                      styles.entryAmountLarge,
                      { color: currentTx.direction === 'YOU_LENT' ? Colors.positive : Colors.negative }
                    ]}>
                      {formatCurrency(currentTx.amount)}
                    </Text>
                  </View>
                </View>
                {currentTx.note ? (
                  <Text style={styles.entryNote}>"{currentTx.note}"</Text>
                ) : null}
              </View>
            )}

            {/* Divider with label */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>{history.length} edit{history.length !== 1 ? 's' : ''}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* History entries */}
            {history.map((entry, idx) => {
              const isLent = entry.previousDirection === 'YOU_LENT';
              const amountColor = isLent ? Colors.positive : Colors.negative;
              const isRestoring = restoring === entry.id;

              const afterAmount = idx === 0 ? (currentTx?.amount ?? entry.previousAmount) : history[idx - 1].previousAmount;
              const afterDirection = idx === 0 ? (currentTx?.direction ?? entry.previousDirection) : history[idx - 1].previousDirection;
              const afterNote = idx === 0 ? (currentTx?.note ?? entry.previousNote) : history[idx - 1].previousNote;
              const afterDate = idx === 0 ? (currentTx?.date ?? entry.previousDate ?? 0) : (history[idx - 1].previousDate ?? 0);

              const summary = buildChangeSummary(entry, afterAmount, afterDirection, afterNote, afterDate);

              return (
                <View key={entry.id} style={styles.historyEntry}>
                  {/* Meta row */}
                  <View style={styles.entryMetaRow}>
                    <Text style={styles.entryChangeLabel}>{summary}</Text>
                    <Text style={styles.entryTime}>
                      {formatDate(entry.changedAt)}  {formatTime(entry.changedAt)}
                    </Text>
                  </View>

                  {/* Snapshot card */}
                  <View style={styles.snapshotCard}>
                    {/* Left accent stripe */}
                    <View style={[styles.accentStripe, { backgroundColor: amountColor }]} />

                    <View style={styles.snapshotBody}>
                      <View style={styles.snapshotTopRow}>
                        <View>
                          <Text style={styles.entryDirection}>
                            {isLent ? 'YOU LENT' : 'YOU BORROWED'}
                          </Text>
                          <Text style={[styles.entryAmountMed, { color: amountColor }]}>
                            {formatCurrency(entry.previousAmount)}
                          </Text>
                        </View>
                        <Text style={styles.snapshotDate}>
                          {formatDate(entry.previousDate ?? 0)}
                        </Text>
                      </View>

                      {entry.previousNote ? (
                        <Text style={styles.entryNote} numberOfLines={2}>
                          "{entry.previousNote}"
                        </Text>
                      ) : null}

                      {/* Restore action */}
                      <Pressable
                        style={styles.restoreRow}
                        onPress={() => handleRestore(entry)}
                        disabled={isRestoring}
                      >
                        <Text style={[styles.restoreText, isRestoring && { opacity: 0.4 }]}>
                          {isRestoring ? 'Restoring…' : 'Restore'}
                        </Text>
                        {!isRestoring && (
                          <Icon name="chevron-forward" size={14} color={Colors.textMuted} />
                        )}
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },

  // Header
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  titleArea: {
    flex: 1,
  },
  screenLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 2.5,
    marginBottom: 6,
  },
  currentAmount: {
    fontSize: 34,
    fontFamily: Fonts.serif,
    color: Colors.white,
    letterSpacing: -0.5,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 36,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },

  // Feed
  feed: {
    gap: 0,
  },

  // Current version card
  currentCard: {
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: '#2A2A2A',
    marginBottom: 24,
  },
  currentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  currentPill: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 2,
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  currentCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },

  // History entries
  historyEntry: {
    marginBottom: 20,
  },
  entryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  entryChangeLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textTransform: 'capitalize' as const,
  },
  entryTime: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },

  // Snapshot card
  snapshotCard: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: '#1E1E1E',
  },
  accentStripe: {
    width: 3,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  snapshotBody: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  snapshotTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  snapshotDate: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
  },

  // Shared entry text
  entryDirection: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  entryAmountLarge: {
    fontSize: 32,
    fontFamily: Fonts.serif,
    letterSpacing: -0.5,
  },
  entryAmountMed: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  entryNote: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: '#555',
    fontStyle: 'italic' as const,
    lineHeight: 18,
  },

  // Restore
  restoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: '#1E1E1E',
    marginTop: 4,
  },
  restoreText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    fontWeight: '500' as const,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: '#1E1E1E',
  },
  dividerLabel: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
