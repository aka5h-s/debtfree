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

// Build a human-readable description of what changed between two states
function buildChangeTags(
  entry: TxHistory,
  afterAmount: number,
  afterDirection: string,
  afterNote: string,
  afterDate: number,
): string[] {
  const tags: string[] = [];

  if (entry.previousAmount !== afterAmount) {
    tags.push(`Amount: ${formatCurrency(entry.previousAmount)} → ${formatCurrency(afterAmount)}`);
  }
  if (entry.previousDirection !== afterDirection) {
    const prev = entry.previousDirection === 'YOU_LENT' ? 'Lent' : 'Borrowed';
    const next = afterDirection === 'YOU_LENT' ? 'Lent' : 'Borrowed';
    tags.push(`Type: ${prev} → ${next}`);
  }
  if ((entry.previousNote || '') !== (afterNote || '')) {
    if (!entry.previousNote) tags.push('Note added');
    else if (!afterNote) tags.push('Note removed');
    else tags.push('Note changed');
  }
  if (entry.previousDate !== afterDate) {
    tags.push(`Date: ${formatDate(entry.previousDate)} → ${formatDate(afterDate)}`);
  }

  return tags.length > 0 ? tags : ['No details recorded'];
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
      // Sort newest first
      const sorted = [...h].sort((a, b) => b.changedAt - a.changedAt);
      setHistory(sorted);
      setLoading(false);
    })();
  }, [txId]);

  const handleRestore = (entry: TxHistory) => {
    if (!currentTx) return;

    const confirmRestore = () => {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRestoring(entry.id);
      // Restore the transaction to the previous state captured in this history entry
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
      if (confirm(`Restore to: ${formatCurrency(entry.previousAmount)} on ${formatDate(entry.previousDate ?? currentTx.date)}?`)) {
        confirmRestore();
      }
    } else {
      Alert.alert(
        'Restore this version?',
        `This will set the transaction back to:\n\n${entry.previousDirection === 'YOU_LENT' ? 'You Lent' : 'You Borrowed'} ${formatCurrency(entry.previousAmount)}\non ${formatDate(entry.previousDate ?? currentTx.date)}${entry.previousNote ? `\n"${entry.previousNote}"` : ''}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restore', onPress: confirmRestore },
        ],
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Edit History</Text>
            {currentTx && (
              <Text style={styles.currentLabel}>
                Current: {currentTx.direction === 'YOU_LENT' ? 'You Lent' : 'You Borrowed'} {formatCurrency(currentTx.amount)}
              </Text>
            )}
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Icon name="close" size={24} color={Colors.white} />
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="document-text-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No edit history</Text>
            <Text style={styles.emptySubtext}>This transaction has not been modified</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {/* Current version at the top */}
            {currentTx && (
              <View style={styles.timelineItem}>
                <View style={styles.timelineLine}>
                  <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                  <View style={styles.connector} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.changeDate}>NOW (current version)</Text>
                  <View style={[styles.changeCard, styles.changeCardCurrent]}>
                    <Text style={[styles.changeDirection, { color: currentTx.direction === 'YOU_LENT' ? Colors.positive : Colors.negative }]}>
                      {currentTx.direction === 'YOU_LENT' ? 'YOU LENT' : 'YOU BORROWED'}
                    </Text>
                    <Text style={[styles.changeAmount, { color: currentTx.direction === 'YOU_LENT' ? Colors.positive : Colors.negative }]}>
                      {formatCurrency(currentTx.amount)}
                    </Text>
                    <Text style={styles.changeMeta}>{formatDate(currentTx.date)}</Text>
                    {currentTx.note ? <Text style={styles.changeNote}>"{currentTx.note}"</Text> : null}
                  </View>
                </View>
              </View>
            )}

            {history.map((entry, idx) => {
              const isLent = entry.previousDirection === 'YOU_LENT';
              const color = isLent ? Colors.positive : Colors.negative;
              const isLast = idx === history.length - 1;
              const isRestoring = restoring === entry.id;

              // "after" state = what came after this entry was recorded
              // For idx=0 (newest history): after = currentTx
              // For idx=1: after = history[0].previous values
              const afterAmount = idx === 0 ? (currentTx?.amount ?? entry.previousAmount) : history[idx - 1].previousAmount;
              const afterDirection = idx === 0 ? (currentTx?.direction ?? entry.previousDirection) : history[idx - 1].previousDirection;
              const afterNote = idx === 0 ? (currentTx?.note ?? entry.previousNote) : history[idx - 1].previousNote;
              const afterDate = idx === 0 ? (currentTx?.date ?? entry.previousDate ?? 0) : (history[idx - 1].previousDate ?? 0);

              const changeTags = buildChangeTags(entry, afterAmount, afterDirection, afterNote, afterDate);

              return (
                <View key={entry.id} style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    {!isLast && <View style={styles.connector} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.changeDate}>
                      Edited {formatDate(entry.changedAt)}
                    </Text>

                    {/* What changed */}
                    <View style={styles.changeTagsRow}>
                      {changeTags.map((tag, i) => (
                        <View key={i} style={styles.changeTag}>
                          <Text style={styles.changeTagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>

                    {/* Previous state card */}
                    <View style={[styles.changeCard, { borderColor: color + '40' }]}>
                      <Text style={styles.prevLabel}>WAS</Text>
                      <Text style={[styles.changeDirection, { color }]}>
                        {isLent ? 'YOU LENT' : 'YOU BORROWED'}
                      </Text>
                      <Text style={[styles.changeAmount, { color }]}>
                        {formatCurrency(entry.previousAmount)}
                      </Text>
                      <Text style={styles.changeMeta}>{formatDate(entry.previousDate ?? 0)}</Text>
                      {entry.previousNote ? (
                        <Text style={styles.changeNote}>"{entry.previousNote}"</Text>
                      ) : null}
                    </View>

                    {/* Restore button */}
                    <Pressable
                      style={[styles.restoreBtn, isRestoring && styles.restoreBtnLoading]}
                      onPress={() => handleRestore(entry)}
                      disabled={isRestoring}
                    >
                      <Icon name="arrow-back" size={13} color={Colors.primary} />
                      <Text style={styles.restoreBtnText}>
                        {isRestoring ? 'Restoring…' : 'Restore this version'}
                      </Text>
                    </Pressable>
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
    overflow: 'hidden' as const,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
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
    fontFamily: Fonts.bold, fontWeight: '700' as const,
    color: Colors.white,
    marginBottom: 4,
  },
  currentLabel: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.semibold, fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 4,
  },
  timeline: {
    paddingBottom: 40,
  },
  timelineItem: {
    flexDirection: 'row',
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
    marginBottom: 0,
    minHeight: 16,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  changeDate: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  changeTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  changeTag: {
    backgroundColor: 'rgba(229,254,64,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(229,254,64,0.2)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  changeTagText: {
    fontSize: 11,
    fontFamily: Fonts.medium, fontWeight: '500' as const,
    color: Colors.primary,
  },
  changeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  changeCardCurrent: {
    borderColor: Colors.primary + '40',
    backgroundColor: 'rgba(229,254,64,0.05)',
  },
  prevLabel: {
    fontSize: 9,
    fontFamily: Fonts.semibold, fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  changeDirection: {
    fontSize: 11,
    fontFamily: Fonts.semibold, fontWeight: '600' as const,
    letterSpacing: 1,
    marginBottom: 2,
  },
  changeAmount: {
    fontSize: 20,
    fontFamily: Fonts.bold, fontWeight: '700' as const,
  },
  changeMeta: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 4,
  },
  changeNote: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginTop: 6,
    fontStyle: 'italic' as const,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '50',
    backgroundColor: 'rgba(229,254,64,0.06)',
    alignSelf: 'flex-start' as const,
  },
  restoreBtnLoading: {
    opacity: 0.5,
  },
  restoreBtnText: {
    fontSize: 12,
    fontFamily: Fonts.semibold, fontWeight: '600' as const,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
});
