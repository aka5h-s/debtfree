import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, ActivityIndicator, Platform, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopCard } from '@/components/NeoPopCard';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { ShimmerText } from '@/components/ShimmerText';
import { formatCurrency, getReturnDateStatus, formatRelativeDate } from '@/lib/formatters';
import { Fonts } from '@/lib/fonts';
import { BuriBuriSyncAvatar } from '@/components/BuriBuriSyncAvatar';

function PersonItem({ person, balance }: { person: any; balance: number }) {
  const status = balance > 0 ? 'YOU LENT' : balance < 0 ? 'YOU OWE' : 'SETTLED';
  const statusColor = balance > 0 ? Colors.positive : balance < 0 ? Colors.negative : Colors.settled;
  const avatarColor = balance > 0 ? Colors.cardGreen : balance < 0 ? Colors.cardRed : Colors.surfaceLight;

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/person/[id]', params: { id: person.id } });
      }}
      style={styles.personPressable}
    >
      <NeoPopCard color={Colors.surface} depth={2}>
        <View style={styles.personRow}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{person.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{person.name}</Text>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{status}</Text>
          </View>
          <View style={styles.personBalanceArea}>
            <Text style={[styles.personBalance, { color: statusColor }]}>
              {balance === 0 ? formatCurrency(0) : formatCurrency(Math.abs(balance))}
            </Text>
            <Icon name="chevron-forward" size={16} color={Colors.textMuted} />
          </View>
        </View>
      </NeoPopCard>
    </Pressable>
  );
}

type SortType = 'balance_high' | 'balance_low' | 'name_az' | 'name_za' | 'newest' | 'settled_last';

const SORT_OPTIONS: { key: SortType; label: string; icon: string }[] = [
  { key: 'balance_high', label: 'Highest Balance', icon: 'trending-up' },
  { key: 'balance_low', label: 'Lowest Balance', icon: 'trending-down' },
  { key: 'name_az', label: 'Name A → Z', icon: 'text' },
  { key: 'name_za', label: 'Name Z → A', icon: 'text' },
  { key: 'newest', label: 'Newest First', icon: 'time-outline' },
  { key: 'settled_last', label: 'Settled Last', icon: 'checkmark-circle-outline' },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const {
    people,
    transactions,
    isLoading,
    getPersonBalance,
    globalBalance,
    totalLent,
    totalBorrowed,
    deletedItems,
    restoreDeletedItem,
    permanentlyDeleteTrashItem,
    emptyTrash,
  } = useData();
  const [search, setSearch] = useState('');
  const [sortType, setSortType] = useState<SortType>('balance_high');
  const [showSort, setShowSort] = useState(false);
  const [hideSettled, setHideSettled] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [undoToast, setUndoToast] = useState<{ id: string; title: string } | null>(null);

  const prevDeletedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (deletedItems.length > 0) {
      const newest = deletedItems[0];
      if (prevDeletedIdRef.current !== newest.id && Date.now() - newest.deletedAt < 10000) {
        setUndoToast({ id: newest.id, title: newest.title });
        const timer = setTimeout(() => {
          setUndoToast(curr => (curr?.id === newest.id ? null : curr));
        }, 5000);
        prevDeletedIdRef.current = newest.id;
        return () => clearTimeout(timer);
      }
    }
  }, [deletedItems]);

  const settledCount = useMemo(() => people.filter(p => getPersonBalance(p.id) === 0).length, [people, getPersonBalance]);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);

  const sortedPeople = useMemo(() => {
    const filtered = [...people].filter(p => {
      if (hideSettled && getPersonBalance(p.id) === 0) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.phone && p.phone.includes(q));
    });

    switch (sortType) {
      case 'balance_high':
        return filtered.sort((a, b) => Math.abs(getPersonBalance(b.id)) - Math.abs(getPersonBalance(a.id)));
      case 'balance_low':
        return filtered.sort((a, b) => Math.abs(getPersonBalance(a.id)) - Math.abs(getPersonBalance(b.id)));
      case 'name_az':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_za':
        return filtered.sort((a, b) => b.name.localeCompare(a.name));
      case 'newest':
        return filtered.sort((a, b) => b.createdAt - a.createdAt);
      case 'settled_last':
        return filtered.sort((a, b) => {
          const aSettled = getPersonBalance(a.id) === 0 ? 1 : 0;
          const bSettled = getPersonBalance(b.id) === 0 ? 1 : 0;
          if (aSettled !== bSettled) return aSettled - bSettled;
          return Math.abs(getPersonBalance(b.id)) - Math.abs(getPersonBalance(a.id));
        });
      default:
        return filtered;
    }
  }, [people, search, sortType, hideSettled, getPersonBalance]);

  const balanceColor = globalBalance > 0 ? Colors.positive : globalBalance < 0 ? Colors.negative : Colors.settled;
  const contextMessage = globalBalance > 0
    ? `You will receive ${formatCurrency(globalBalance)}`
    : globalBalance < 0
    ? `You are in debt. Pay ${formatCurrency(Math.abs(globalBalance))} to be debt-free`
    : 'You are free of debt!';

  const upcomingAndOverdue = useMemo(() => {
    return transactions
      .filter(t => t.returnDate)
      .map(t => {
        const p = people.find(person => person.id === t.personId);
        const status = getReturnDateStatus(t.returnDate);
        return { tx: t, person: p, status };
      })
      .filter(item => item.status && (item.status.isOverdue || item.status.isDueSoon))
      .sort((a, b) => (a.tx.returnDate || 0) - (b.tx.returnDate || 0));
  }, [transactions, people]);

  const renderHeader = useMemo(() => (
    <View>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={styles.appTitle}>DebtFree</Text>
        <BuriBuriSyncAvatar />
      </View>

      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>NET BALANCE</Text>
        <Text style={[styles.balanceAmount, { color: balanceColor }]}>
          {formatCurrency(Math.abs(globalBalance))}
        </Text>
        {globalBalance !== 0 ? (
          <Text style={[styles.contextMessage, { color: balanceColor }]}>
            {globalBalance > 0 ? 'You will receive ' : 'You are in debt. Pay '}
            <Text style={styles.contextAmount}>{formatCurrency(Math.abs(globalBalance))}</Text>
            {globalBalance < 0 ? ' to be debt-free' : ''}
          </Text>
        ) : (
          <Text style={[styles.contextMessage, { color: balanceColor }]}>All debts settled!</Text>
        )}
      </View>

      <View style={styles.summaryRow}>
        <View style={{ flex: 1 }}>
          <NeoPopCard color={Colors.cardGreen} depth={2}>
            <Text style={styles.summaryLabel}>YOU LENT</Text>
            <Text style={[styles.summaryAmount, { color: Colors.positive }]}>{formatCurrency(totalLent)}</Text>
          </NeoPopCard>
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <NeoPopCard color={Colors.cardRed} depth={2}>
            <Text style={styles.summaryLabel}>YOU BORROWED</Text>
            <Text style={[styles.summaryAmount, { color: Colors.negative }]}>{formatCurrency(totalBorrowed)}</Text>
          </NeoPopCard>
        </View>
      </View>

      {upcomingAndOverdue.length > 0 && (
        <View style={styles.alertsContainer}>
          <View style={styles.alertsHeader}>
            <View style={styles.alertsHeaderLeft}>
              <Text style={styles.alertsTitle}>DUE & OVERDUE</Text>
            </View>
            <Text style={styles.alertsCount}>{upcomingAndOverdue.length}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.alertsScroll}>
            {upcomingAndOverdue.map(({ tx, person, status }) => {
              if (!person || !status) return null;
              const isLent = tx.direction === 'YOU_LENT';
              const directionColor = isLent ? Colors.positive : Colors.negative;
              return (
                <Pressable
                  key={tx.id}
                  style={[
                    styles.alertCard,
                    isLent ? styles.alertCardLent : styles.alertCardBorrowed,
                    status.isOverdue && styles.alertCardOverdue,
                  ]}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: '/person/[id]', params: { id: person.id } });
                  }}
                >
                  <View style={styles.alertHeaderRow}>
                    <View style={[styles.directionPill, isLent ? styles.directionPillLent : styles.directionPillBorrowed]}>
                      <Text style={[styles.directionPillText, { color: directionColor }]}>
                        {isLent ? 'RECEIVE' : 'PAY'}
                      </Text>
                    </View>
                    <Text style={[styles.alertAmount, { color: directionColor }]}>
                      {formatCurrency(tx.amount)}
                    </Text>
                  </View>

                  <Text style={styles.alertPersonName} numberOfLines={1}>{person.name}</Text>

                  <View style={styles.alertStatusRow}>
                    <Icon
                      name={status.isOverdue ? 'alert-circle-outline' : 'time-outline'}
                      size={12}
                      color={status.isOverdue ? Colors.negative : Colors.textMuted}
                    />
                    <Text style={[
                      styles.alertBadgeText,
                      status.isOverdue ? styles.alertTextOverdue : styles.alertTextDueSoon,
                    ]} numberOfLines={1}>
                      {status.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>YOUR CIRCLE</Text>
        <View style={styles.sectionHeaderRight}>
          {settledCount > 0 && (
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setHideSettled(prev => !prev);
              }}
              style={[styles.settledFilterPill, hideSettled && styles.settledFilterPillActive]}
            >
              <Icon
                name={hideSettled ? 'eye-off' : 'eye'}
                size={12}
                color={hideSettled ? '#000000' : Colors.textMuted}
              />
              <Text style={[styles.settledFilterText, hideSettled && styles.settledFilterTextActive]}>
                {hideSettled ? 'SETTLED HIDDEN' : 'HIDE SETTLED'}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowTrash(true);
            }}
            style={[styles.trashHeaderBtn, deletedItems.length > 0 && styles.trashHeaderBtnActive]}
          >
            <Icon
              name="trash-outline"
              size={15}
              color={deletedItems.length > 0 ? Colors.negative : Colors.textMuted}
            />
            {deletedItems.length > 0 && (
              <View style={styles.trashBadge}>
                <Text style={styles.trashBadgeText}>{deletedItems.length}</Text>
              </View>
            )}
          </Pressable>

          <Text style={styles.sectionCount}>
            {sortedPeople.length}
            {hideSettled && settledCount > 0 ? ` (${settledCount} hidden)` : ''}
          </Text>
          {people.length > 0 && (
            <Pressable onPress={() => setShowSort(true)} style={styles.sortBtn}>
              <Icon name="funnel-outline" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  ), [topPad, globalBalance, balanceColor, contextMessage, totalLent, totalBorrowed, upcomingAndOverdue, people.length, sortedPeople.length, settledCount, hideSettled, deletedItems.length, setShowSort, setShowTrash]);

  const renderEmpty = useCallback(() => (
    <View style={styles.emptyState}>
      <Icon name="people-outline" size={48} color={Colors.textMuted} />
      <Text style={styles.emptyText}>Your circle is empty</Text>
      <Text style={styles.emptySubtext}>Add someone to start tracking</Text>
      <View style={{ marginTop: 20, width: '70%' }}>
        <NeoPopTiltedButton onPress={() => router.push('/add-person')} showShimmer>
          <Text style={styles.ctaText}>ADD SOMEONE</Text>
        </NeoPopTiltedButton>
      </View>
    </View>
  ), []);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <PersonItem person={item} balance={getPersonBalance(item.id)} />
  ), [getPersonBalance]);

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedPeople}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            {renderHeader}
            {people.length > 0 && (
              <View style={styles.searchContainer}>
                <Icon name="search" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name or phone..."
                  placeholderTextColor={Colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')}>
                    <Icon name="close-circle" size={18} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>
            )}
          </>
        }
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'web' ? 84 + 34 : 100 }]}
        showsVerticalScrollIndicator={false}
      />

      {people.length > 0 && (
        <View style={[styles.fab, { bottom: Platform.OS === 'web' ? 84 + 34 + 16 : 100 }]}>
          <NeoPopTiltedButton onPress={() => router.push('/add-person')} showShimmer>
            <Icon name="add" size={24} color="#000" />
          </NeoPopTiltedButton>
        </View>
      )}

      {/* Sort Sheet */}
      <Modal visible={showSort} transparent animationType="slide" onRequestClose={() => setShowSort(false)}>
        <Pressable style={styles.sortBackdrop} onPress={() => setShowSort(false)} />
        <View style={styles.sortSheet}>
          <View style={styles.sortHandle} />
          <Text style={styles.sortSheetTitle}>SORT BY</Text>
          {SORT_OPTIONS.map((opt) => {
            const isActive = sortType === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[styles.sortOption, isActive && styles.sortOptionActive]}
                onPress={() => {
                  setSortType(opt.key);
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowSort(false);
                }}
              >
                <Icon name={opt.icon as any} size={18} color={isActive ? Colors.primary : Colors.textMuted} />
                <Text style={[styles.sortOptionText, isActive && styles.sortOptionTextActive]}>
                  {opt.label}
                </Text>
                {isActive && <Icon name="checkmark" size={18} color={Colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </Modal>

      {/* Quick Undo Toast */}
      {undoToast && (
        <View style={[styles.undoToastContainer, { bottom: Platform.OS === 'web' ? 84 + 34 + 16 : 100 + 16 }]}>
          <View style={styles.undoToast}>
            <View style={styles.undoToastLeft}>
              <Icon name="trash-outline" size={16} color={Colors.negative} />
              <Text style={styles.undoToastText} numberOfLines={1}>
                Deleted <Text style={styles.undoToastBold}>"{undoToast.title}"</Text>
              </Text>
            </View>
            <View style={styles.undoToastActions}>
              <Pressable
                style={styles.undoBtn}
                onPress={async () => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  const targetId = undoToast.id;
                  setUndoToast(null);
                  await restoreDeletedItem(targetId);
                }}
              >
                <Icon name="restore" size={13} color="#000" />
                <Text style={styles.undoBtnText}>UNDO</Text>
              </Pressable>
              <Pressable onPress={() => setUndoToast(null)} style={styles.undoCloseBtn}>
                <Icon name="close" size={14} color={Colors.textMuted} />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Recently Deleted Trash Bin Modal */}
      <Modal visible={showTrash} transparent animationType="slide" onRequestClose={() => setShowTrash(false)}>
        <Pressable style={styles.sortBackdrop} onPress={() => setShowTrash(false)} />
        <View style={styles.trashSheet}>
          <View style={styles.sortHandle} />
          
          <View style={styles.trashHeaderRow}>
            <View>
              <Text style={styles.trashModalTitle}>RECENTLY DELETED</Text>
              <Text style={styles.trashModalSubtitle}>
                {deletedItems.length} {deletedItems.length === 1 ? 'item' : 'items'} in trash
              </Text>
            </View>

            <View style={styles.trashHeaderActions}>
              {deletedItems.length > 0 && (
                <Pressable
                  onPress={() => {
                    const doEmpty = () => {
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      emptyTrash();
                    };
                    if (Platform.OS === 'web') {
                      if (confirm('Permanently delete all items from trash? This cannot be undone.')) doEmpty();
                    } else {
                      Alert.alert(
                        'Empty Trash',
                        'Permanently delete all items from trash? This action cannot be undone.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Empty All', style: 'destructive', onPress: doEmpty },
                        ]
                      );
                    }
                  }}
                  style={styles.emptyAllBtn}
                >
                  <Text style={styles.emptyAllBtnText}>EMPTY ALL</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowTrash(false);
                }}
                style={styles.trashModalCloseBtn}
              >
                <Icon name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {deletedItems.length === 0 ? (
            <View style={styles.trashEmptyState}>
              <Icon name="trash-outline" size={44} color={Colors.textMuted} />
              <Text style={styles.trashEmptyTitle}>Trash is Empty</Text>
              <Text style={styles.trashEmptySubtitle}>
                Deleted contacts, transactions, and cards can be restored from here anytime.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.trashScrollView} contentContainerStyle={styles.trashScrollContent} showsVerticalScrollIndicator={false}>
              {deletedItems.map((item) => {
                const isPerson = item.type === 'PERSON';
                const isTx = item.type === 'TRANSACTION';
                const badgeBg = isPerson ? 'rgba(229, 254, 64, 0.15)' : isTx ? 'rgba(6, 194, 112, 0.15)' : 'rgba(74, 144, 226, 0.15)';
                const badgeColor = isPerson ? Colors.primary : isTx ? Colors.positive : '#4A90E2';
                return (
                  <View key={item.id} style={styles.trashItemRow}>
                    <View style={styles.trashItemInfo}>
                      <View style={styles.trashItemTopLine}>
                        <View style={[styles.trashItemBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.trashItemBadgeText, { color: badgeColor }]}>{item.type}</Text>
                        </View>
                        <Text style={styles.trashItemTime}>{formatRelativeDate(item.deletedAt)}</Text>
                      </View>
                      <Text style={styles.trashItemTitle} numberOfLines={1}>{item.title}</Text>
                      {item.subtitle ? (
                        <Text style={styles.trashItemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                      ) : null}
                    </View>

                    <View style={styles.trashItemActions}>
                      <Pressable
                        style={styles.restoreBtn}
                        onPress={async () => {
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          await restoreDeletedItem(item.id);
                        }}
                      >
                        <Icon name="restore" size={13} color="#000" />
                        <Text style={styles.restoreBtnText}>RESTORE</Text>
                      </Pressable>
                      <Pressable
                        style={styles.permDeleteBtn}
                        onPress={() => {
                          const doDelete = () => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            permanentlyDeleteTrashItem(item.id);
                          };
                          if (Platform.OS === 'web') {
                            if (confirm(`Permanently delete "${item.title}"?`)) doDelete();
                          } else {
                            Alert.alert('Delete Permanently', `Permanently delete "${item.title}"?`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: doDelete },
                            ]);
                          }
                        }}
                      >
                        <Icon name="close" size={16} color={Colors.textMuted} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  appTitle: {
    fontSize: 28,
    fontFamily: Fonts.serif,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  balanceLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontFamily: Fonts.serif,
    letterSpacing: -1,
  },
  contextMessage: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginTop: 8,
    opacity: 0.8,
  },
  contextAmount: {
    fontFamily: Fonts.serif,
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  summaryAmount: {
    fontSize: 20,
    fontFamily: Fonts.serif,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  alertsContainer: {
    marginTop: 20,
    marginBottom: 6,
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  alertsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertsTitle: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  alertsCount: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
  },
  alertsScroll: {
    paddingHorizontal: 24,
    gap: 10,
  },
  alertCard: {
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 195,
  },
  alertCardLent: {
    backgroundColor: '#0F1E17',
    borderWidth: 1,
    borderColor: '#194A34',
    borderLeftWidth: 3.5,
    borderLeftColor: Colors.positive,
  },
  alertCardBorrowed: {
    backgroundColor: '#1E1014',
    borderWidth: 1,
    borderColor: '#4D1D27',
    borderLeftWidth: 3.5,
    borderLeftColor: Colors.negative,
  },
  alertCardOverdue: {
    borderColor: Colors.negative,
    backgroundColor: '#261216',
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  directionPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 0,
  },
  directionPillLent: {
    backgroundColor: 'rgba(6, 194, 112, 0.15)',
  },
  directionPillBorrowed: {
    backgroundColor: 'rgba(238, 77, 55, 0.15)',
  },
  directionPillText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 0.8,
  },
  alertPersonName: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.white,
    marginBottom: 6,
  },
  alertAmount: {
    fontSize: 15,
    fontFamily: Fonts.serif,
  },
  alertStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  alertBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
  },
  alertTextOverdue: {
    color: '#EE4D37',
  },
  alertTextDueSoon: {
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  sectionCount: {
    fontSize: 13,
    fontFamily: Fonts.serif,
    color: Colors.textMuted,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sortBtn: {
    padding: 4,
  },
  sortBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sortSheet: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
  },
  sortHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sortSheetTitle: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 12,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  sortOptionActive: {
    // subtle highlight handled via text/icon color
  },
  sortOptionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
  },
  sortOptionTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.semibold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 100,
  },
  personPressable: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.white,
    marginBottom: 2,
  },
  statusLabel: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    letterSpacing: 1,
  },
  personBalanceArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  personBalance: {
    fontSize: 17,
    fontFamily: Fonts.serif,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 4,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
  },
  settledFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settledFilterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  settledFilterText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  settledFilterTextActive: {
    color: '#000000',
  },
  trashHeaderBtn: {
    position: 'relative',
    padding: 6,
    borderRadius: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trashHeaderBtnActive: {
    borderColor: '#3D1C24',
    backgroundColor: '#201014',
  },
  trashBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.negative,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  trashBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  undoToastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  undoToast: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  undoToastLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  undoToastText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.white,
    flexShrink: 1,
  },
  undoToastBold: {
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  undoToastActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  undoBtnText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 0.5,
  },
  undoCloseBtn: {
    padding: 4,
  },
  trashSheet: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  trashHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  trashModalTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 1.5,
  },
  trashModalSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  trashHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(238, 77, 55, 0.15)',
    borderWidth: 1,
    borderColor: Colors.negative,
  },
  emptyAllBtnText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.negative,
    letterSpacing: 0.8,
  },
  trashModalCloseBtn: {
    padding: 6,
  },
  trashEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  trashEmptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  trashEmptySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  trashScrollView: {
    maxHeight: 400,
  },
  trashScrollContent: {
    gap: 10,
    paddingBottom: 16,
  },
  trashItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trashItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  trashItemTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  trashItemBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  trashItemBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  trashItemTime: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
  },
  trashItemTitle: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.white,
  },
  trashItemSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  trashItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  restoreBtnText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 0.5,
  },
  permDeleteBtn: {
    padding: 6,
  },
});
