import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RotateCcw } from 'lucide-react-native';
import { useData } from '@/contexts/DataContext';
import { C, FONT } from '@/theme/neo';
import {
  BackButton,
  NeoCard,
  NeoButton,
  Eyebrow,
  Amount,
  Rise,
  Skeleton,
} from '@/components/neo';
import { useToast } from '@/components/neo/Toast';
import type { TransactionHistory as TxHistory } from '@/lib/types';
import { formatIndianCurrency } from '@/components/neo/Amount';

export default function TransactionHistoryScreen() {
  const { txId } = useLocalSearchParams<{ txId: string }>();
  const insets = useSafeAreaInsets();
  const { getTransactionHistory, transactions, updateTransaction } = useData();
  const { showToast } = useToast();

  const [history, setHistory] = useState<TxHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const currentTx = transactions.find((t) => t.id === txId);

  useEffect(() => {
    (async () => {
      try {
        const h = await getTransactionHistory(txId);
        setHistory([...h].sort((a, b) => b.changedAt - a.changedAt));
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [txId]);

  const handleRestore = async (entry: TxHistory) => {
    if (!currentTx) return;
    setRestoringId(entry.id);
    try {
      await updateTransaction(
        currentTx,
        entry.previousAmount,
        entry.previousDirection,
        entry.previousNote,
        entry.previousDate,
        entry.previousReturnDate
      );
      showToast('Restored to this version');
      router.back();
    } catch (e: any) {
      showToast(e.message || 'Failed to restore');
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, 24) + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <BackButton />
        </View>

        <Text style={styles.title}>Edit History</Text>
        <Text style={styles.subtitle}>Audit trail of changes for this transaction</Text>

        {/* Current State */}
        {currentTx && (
          <NeoCard depth={3} face="dark" innerPadding={16} style={styles.currentCard}>
            <Eyebrow color={C.poli} style={{ marginBottom: 6 }}>CURRENT STATE</Eyebrow>
            <View style={styles.txRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.noteText}>{currentTx.note || 'No note'}</Text>
                <Text style={styles.directionText}>
                  {currentTx.direction === 'YOU_LENT' ? 'I Gave' : 'I Got'}
                </Text>
              </View>
              <Amount
                value={currentTx.amount}
                tone={currentTx.direction === 'YOU_LENT' ? 'pos' : 'neg'}
                showSign
                size="card"
              />
            </View>
          </NeoCard>
        )}

        {/* History List */}
        <View style={styles.historySection}>
          <Eyebrow style={{ marginBottom: 12 }}>PREVIOUS VERSIONS</Eyebrow>

          {loading ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={70} />
              <Skeleton height={70} />
            </View>
          ) : history.length === 0 ? (
            <NeoCard depth={3} face="dark" innerPadding={16}>
              <Text style={styles.emptyText}>No edits recorded for this transaction</Text>
            </NeoCard>
          ) : (
            <View style={{ gap: 12 }}>
              {history.map((entry, idx) => {
                const changedDate = new Date(entry.changedAt).toLocaleString('en-GB');
                const isLent = entry.previousDirection === 'YOU_LENT';

                return (
                  <Rise key={entry.id} index={idx}>
                    <NeoCard depth={3} face="dark" innerPadding={14}>
                      <View style={styles.historyCardRow}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                          <Text style={styles.historyDate}>{changedDate}</Text>
                          <Text style={styles.historyNote}>
                            {entry.previousNote || 'No note'}
                          </Text>
                          <Text style={styles.historyDir}>
                            {isLent ? 'Gave' : 'Got'} {formatIndianCurrency(entry.previousAmount)}
                          </Text>
                        </View>

                        <NeoButton
                          variant="white"
                          size="sm"
                          icon={RotateCcw}
                          disabled={restoringId === entry.id}
                          onPress={() => handleRestore(entry)}
                        >
                          RESTORE
                        </NeoButton>
                      </View>
                    </NeoCard>
                  </Rise>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
    marginBottom: 20,
  },
  currentCard: {
    marginBottom: 24,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteText: {
    fontFamily: FONT.sansBold,
    fontSize: 15,
    color: C.text,
  },
  directionText: {
    fontFamily: FONT.sans,
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },
  historySection: {
    marginBottom: 20,
  },
  emptyText: {
    fontFamily: FONT.sans,
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
  },
  historyCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: C.muted,
    marginBottom: 2,
  },
  historyNote: {
    fontFamily: FONT.sansBold,
    fontSize: 14,
    color: C.text,
  },
  historyDir: {
    fontFamily: FONT.sans,
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
});
