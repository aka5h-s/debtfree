import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SlidersHorizontal,
  Plus,
  ChevronRight,
  Eye,
  Check,
  Landmark,
  Banknote,
  Wallet,
  CircleDot,
  Clock,
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  C,
  T,
  NeoCard,
  NeoButton,
  TiltButton,
  Eyebrow,
  Amount,
  TextShimmer,
  DotGrid,
  Sheet,
  Field,
  Card3DModal,
  NeoToggle,
  haptic,
  formatRupees,
} from '@/src/design';
import { useToast } from '@/components/neo/Toast';
import { formatRelativeDate, getReturnDateStatus } from '@/lib/formatters';
import { CreditCard, Account, AccountType } from '@/lib/types';

type ChipFilter = 'ALL' | 'LENT' | 'OWE' | 'SETTLED';
type SortOption =
  | 'HIGHEST_BALANCE'
  | 'LOWEST_BALANCE'
  | 'NAME_AZ'
  | 'NAME_ZA'
  | 'NEWEST_FIRST'
  | 'SETTLED_LAST';

function parseUserFirstName(user: any): string {
  let raw = '';
  if (user?.displayName?.trim()) {
    raw = user.displayName.trim();
  } else if (user?.email) {
    raw = user.email.split('@')[0];
  }
  if (!raw) return 'Akash.';
  // Split at . _ - or digits
  const parts = raw.split(/[._\-\d\s]+/);
  let first = parts[0] || raw;
  first = first.charAt(0).toUpperCase() + first.slice(1);
  if (first.length > 14) first = first.slice(0, 13);
  return `${first}.`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const {
    people,
    transactions,
    cards,
    accounts,
    loans,
    enableLoans,
    isLoading,
    isSyncing,
    isOnline,
    reload,
    getPersonBalance,
    addPerson,
    updateCard,
    addAccount,
    totalLent,
    totalBorrowed,
  } = useData();

  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [chipFilter, setChipFilter] = useState<ChipFilter>('ALL');

  // Filter & Sort Settings
  const [showFilterSortSheet, setShowFilterSortSheet] = useState(false);
  const [appliedHideSettled, setAppliedHideSettled] = useState(false);
  const [appliedSort, setAppliedSort] = useState<SortOption>('HIGHEST_BALANCE');
  const [tempHideSettled, setTempHideSettled] = useState(false);
  const [tempSort, setTempSort] = useState<SortOption>('HIGHEST_BALANCE');

  // Sheets
  const [showCashSheet, setShowCashSheet] = useState(false);
  const [showCardsSheet, setShowCardsSheet] = useState(false);
  const [cardSearch, setCardSearch] = useState('');
  const [selected3DCard, setSelected3DCard] = useState<CreditCard | null>(null);

  // Bill Sheet
  const [billTargetCard, setBillTargetCard] = useState<CreditCard | null>(null);
  const [billAmountInput, setBillAmountInput] = useState('');

  // Add Person Sheet
  const [showAddPersonSheet, setShowAddPersonSheet] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addNotes, setAddNotes] = useState('');

  // Add Account Sheet
  const [showAddAccountSheet, setShowAddAccountSheet] = useState(false);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('BANK');
  const [accBalance, setAccBalance] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const firstName = useMemo(() => parseUserFirstName(user), [user]);
  const avatarLetter = (user?.displayName || user?.email || 'A')
    .trim()
    .charAt(0)
    .toUpperCase();

  // Status text for eyebrow
  const statusEyebrow = !isOnline
    ? 'offline · showing saved data'
    : isSyncing || isLoading
    ? 'syncing…'
    : 'good to see you';

  // Net position: to receive - to pay
  const netPosition = totalLent - totalBorrowed;
  const netCaption =
    netPosition > 0
      ? 'People owe you more than you owe.'
      : netPosition < 0
      ? "You owe more than you're owed."
      : 'All square. Debt free.';

  // Summary row totals
  const totalCash = useMemo(
    () => accounts.reduce((acc, a) => acc + (a.balance || 0), 0),
    [accounts]
  );
  const totalCardBills = useMemo(
    () => cards.reduce((acc, c) => acc + (c.currentBill || 0), 0),
    [cards]
  );
  const totalLoans = useMemo(
    () => loans.reduce((acc, l) => acc + (l.remainingAmount || 0), 0),
    [loans]
  );

  // Due back soon: next 3 entries with return date
  const dueBackSoon = useMemo(() => {
    return transactions
      .filter((t) => t.returnDate)
      .map((t) => {
        const p = people.find((item) => item.id === t.personId);
        const st = getReturnDateStatus(t.returnDate!);
        return {
          id: t.id,
          personId: t.personId,
          personName: p?.name || 'Unknown',
          amount: t.amount,
          direction: t.direction,
          returnDate: t.returnDate!,
          isOverdue: !!st?.isOverdue,
          relativeDate: formatRelativeDate(t.returnDate!),
        };
      })
      .sort((a, b) => a.returnDate - b.returnDate)
      .slice(0, 3);
  }, [transactions, people]);

  // People map for balances
  const personBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of people) {
      map.set(p.id, getPersonBalance(p.id));
    }
    return map;
  }, [people, getPersonBalance, transactions]);

  // Filtered & Sorted People
  const filteredPeople = useMemo(() => {
    let list = people.filter((p) => {
      // 1. Search text
      if (
        search.trim() &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.phone?.includes(search)
      ) {
        return false;
      }
      const bal = personBalanceMap.get(p.id) || 0;

      // 2. Chip filter
      if (chipFilter === 'LENT' && bal <= 0) return false;
      if (chipFilter === 'OWE' && bal >= 0) return false;
      if (chipFilter === 'SETTLED' && bal !== 0) return false;

      // 3. Hide settled
      if (appliedHideSettled && bal === 0) return false;

      return true;
    });

    // 4. Sort
    list.sort((a, b) => {
      const balA = personBalanceMap.get(a.id) || 0;
      const balB = personBalanceMap.get(b.id) || 0;
      switch (appliedSort) {
        case 'HIGHEST_BALANCE':
          return Math.abs(balB) - Math.abs(balA);
        case 'LOWEST_BALANCE':
          return Math.abs(balA) - Math.abs(balB);
        case 'NAME_AZ':
          return a.name.localeCompare(b.name);
        case 'NAME_ZA':
          return b.name.localeCompare(a.name);
        case 'NEWEST_FIRST':
          return (b.createdAt || 0) - (a.createdAt || 0);
        case 'SETTLED_LAST':
          if (balA === 0 && balB !== 0) return 1;
          if (balA !== 0 && balB === 0) return -1;
          return Math.abs(balB) - Math.abs(balA);
        default:
          return 0;
      }
    });

    return list;
  }, [people, personBalanceMap, search, chipFilter, appliedHideSettled, appliedSort]);

  // Filter cards in cards sheet
  const filteredCards = useMemo(() => {
    if (!cardSearch.trim()) return cards;
    const q = cardSearch.toLowerCase().trim();
    return cards.filter(
      (c) =>
        c.cardName.toLowerCase().includes(q) ||
        (c.cardNumber && c.cardNumber.slice(-4).includes(q))
    );
  }, [cards, cardSearch]);

  const isFilterActive = appliedHideSettled || appliedSort !== 'HIGHEST_BALANCE';

  // Handlers
  const handleOpenFilterSort = () => {
    haptic('light');
    setTempHideSettled(appliedHideSettled);
    setTempSort(appliedSort);
    setShowFilterSortSheet(true);
  };

  const handleApplyFilterSort = () => {
    haptic('medium');
    setAppliedHideSettled(tempHideSettled);
    setAppliedSort(tempSort);
    setShowFilterSortSheet(false);
  };

  const handleAddPerson = async () => {
    if (!addName.trim()) {
      showToast("Name can't be empty");
      return;
    }
    try {
      await addPerson(addName.trim(), addPhone.trim(), addNotes.trim());
      showToast('Person added');
      setAddName('');
      setAddPhone('');
      setAddNotes('');
      setShowAddPersonSheet(false);
    } catch (e: any) {
      showToast(e.message || 'Failed to add person');
    }
  };

  const handleAddAccount = async () => {
    if (!accName.trim()) {
      showToast("Name can't be empty");
      return;
    }
    const bal = parseFloat(accBalance) || 0;
    try {
      await addAccount({
        name: accName.trim(),
        type: accType,
        balance: bal,
        history: [
          {
            id: String(Date.now()),
            accountId: '',
            amount: bal,
            type: 'SET_BALANCE',
            previousBalance: 0,
            newBalance: bal,
            note: 'Initial balance',
            date: Date.now(),
            createdAt: Date.now(),
          },
        ],
      });
      showToast('Account added');
      setAccName('');
      setAccBalance('');
      setShowAddAccountSheet(false);
    } catch (e: any) {
      showToast(e.message || 'Failed to add account');
    }
  };

  const handleSaveBill = async () => {
    if (!billTargetCard) return;
    const val = parseFloat(billAmountInput);
    if (isNaN(val) || val < 0) {
      showToast('Enter a valid bill amount');
      return;
    }
    try {
      await updateCard({
        ...billTargetCard,
        currentBill: val,
      });
      showToast('Bill saved');
      setBillTargetCard(null);
    } catch (e: any) {
      showToast(e.message || 'Failed to save bill');
    }
  };

  const handleMarkBillPaid = async () => {
    if (!billTargetCard) return;
    try {
      await updateCard({
        ...billTargetCard,
        currentBill: 0,
      });
      showToast('Marked as paid');
      setBillTargetCard(null);
    } catch (e: any) {
      showToast(e.message || 'Failed to mark as paid');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContainer,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            paddingBottom: Math.max(insets.bottom, 24) + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
      >
        {/* 1.1 Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Eyebrow style={styles.statusEyebrow}>{statusEyebrow}</Eyebrow>
            <Text numberOfLines={1} style={styles.nameHeader}>
              {firstName}
            </Text>
          </View>

          <Pressable
            onPress={() => {
              haptic('light');
              router.push('/(tabs)/cloud');
            }}
          >
            <NeoCard face="poli" depth={3} style={styles.avatarTile}>
              <Text style={styles.avatarLetter}>{avatarLetter}</Text>
            </NeoCard>
          </Pressable>
        </View>

        {/* 1.2 Net Position Card */}
        <NeoCard face="dark" depth={4} style={styles.netCard}>
          <DotGrid opacity={0.09} />

          <View style={{ gap: 4 }}>
            <Eyebrow>NET POSITION</Eyebrow>
            <TextShimmer amount={netPosition} fontSize={46} />
            <Text style={styles.netCaption}>{netCaption}</Text>
          </View>

          <View style={styles.netDivider} />

          <View style={styles.netSplitRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Eyebrow style={{ color: C.positive }}>↗ TO RECEIVE</Eyebrow>
              <Amount value={totalLent} tone="pos" size={20} />
            </View>

            <View style={styles.verticalSplit} />

            <View style={{ flex: 1, paddingLeft: 16, gap: 2 }}>
              <Eyebrow style={{ color: C.negative }}>↙ TO PAY</Eyebrow>
              <Amount value={totalBorrowed} tone="neg" size={20} />
            </View>
          </View>
        </NeoCard>

        {/* 1.3 Summary Row (Cash / Card bills / Loans) — Slim & Pretty */}
        <View style={styles.summaryRow}>
          {/* Cash Tile */}
          <View style={{ flex: 1 }}>
            <NeoCard
              face="dark"
              depth={3}
              press
              onPress={() => {
                haptic('light');
                setShowCashSheet(true);
              }}
              style={styles.summaryTile}
            >
              <View
                style={[styles.tileStripe, { backgroundColor: C.positive }]}
              />
              <View style={styles.tileTop}>
                <Text style={styles.tileLabel}>CASH</Text>
                <ChevronRight size={12} color={C.mutedFg} />
              </View>
              <Amount value={totalCash} size={17} style={{ marginTop: 4 }} />
            </NeoCard>
          </View>

          {/* Card Bills Tile */}
          <View style={{ flex: 1 }}>
            <NeoCard
              face="dark"
              depth={3}
              press
              onPress={() => {
                haptic('light');
                setShowCardsSheet(true);
              }}
              style={styles.summaryTile}
            >
              <View
                style={[styles.tileStripe, { backgroundColor: C.primary }]}
              />
              <View style={styles.tileTop}>
                <Text style={styles.tileLabel}>CARD BILLS</Text>
                <ChevronRight size={12} color={C.mutedFg} />
              </View>
              <Amount
                value={totalCardBills}
                tone={totalCardBills > 0 ? 'neg' : undefined}
                size={17}
                style={{ marginTop: 4 }}
              />
            </NeoCard>
          </View>

          {/* Loans Tile (only when enabled) */}
          {enableLoans && (
            <View style={{ flex: 1 }}>
              <NeoCard
                face="dark"
                depth={3}
                press
                onPress={() => {
                  haptic('light');
                  router.push({
                    pathname: '/(tabs)/cards',
                    params: { tab: 'loans' },
                  });
                }}
                style={styles.summaryTile}
              >
                <View
                  style={[styles.tileStripe, { backgroundColor: C.negative }]}
                />
                <View style={styles.tileTop}>
                  <Text style={styles.tileLabel}>LOANS</Text>
                  <ChevronRight size={12} color={C.mutedFg} />
                </View>
                <Amount
                  value={totalLoans}
                  tone="neg"
                  size={17}
                  style={{ marginTop: 4 }}
                />
              </NeoCard>
            </View>
          )}
        </View>

        {/* 1.6 Due Back Soon (if any entries exist) */}
        {dueBackSoon.length > 0 && (
          <View style={{ gap: 10 }}>
            <Eyebrow>DUE BACK SOON</Eyebrow>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {dueBackSoon.map((item) => (
                <NeoCard
                  key={item.id}
                  face={item.isOverdue ? 'red' : 'dark'}
                  depth={3}
                  press
                  onPress={() => {
                    haptic('light');
                    router.push({
                      pathname: '/person/[id]',
                      params: { id: item.personId },
                    });
                  }}
                  style={styles.dueCard}
                >
                  <View style={styles.dueTopRow}>
                    <Text
                      style={[
                        styles.dueTag,
                        { color: item.isOverdue ? C.negative : C.primary },
                      ]}
                    >
                      {item.isOverdue ? 'OVERDUE' : item.relativeDate}
                    </Text>
                  </View>
                  <Text numberOfLines={1} style={styles.dueName}>
                    {item.personName}
                  </Text>
                  <Amount
                    value={item.amount}
                    tone={item.direction === 'YOU_LENT' ? 'pos' : 'neg'}
                    size={18}
                  />
                </NeoCard>
              ))}
            </ScrollView>
          </View>
        )}

        {/* 1.7 People Section */}
        <View style={{ gap: 14 }}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.sectionTitle}>People</Text>
              <View style={styles.totalPill}>
                <Text style={styles.totalPillText}>{people.length} total</Text>
              </View>
            </View>

            <NeoButton
              label="+ PERSON"
              variant="poli"
              size="sm"
              onPress={() => {
                haptic('light');
                setShowAddPersonSheet(true);
              }}
            />
          </View>

          {/* Search Row + Square Filter Button */}
          <View style={styles.searchRow}>
            <View style={{ flex: 1 }}>
              <Field
                placeholder="Search people"
                isSearch
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <Pressable onPress={handleOpenFilterSort}>
              <NeoCard
                face={isFilterActive ? 'poli' : 'dark'}
                depth={3}
                style={[
                  styles.filterSquareBtn,
                  isFilterActive && { backgroundColor: C.primary },
                ]}
              >
                <SlidersHorizontal
                  size={18}
                  color={isFilterActive ? C.background : C.foreground}
                />
              </NeoCard>
            </Pressable>
          </View>

          {/* Filter Chips: ALL / LENT / OWE / SETTLED */}
          <View style={styles.chipRow}>
            {(['ALL', 'LENT', 'OWE', 'SETTLED'] as ChipFilter[]).map((c) => (
              <View key={c} style={{ flex: 1 }}>
                <NeoButton
                  label={c}
                  variant={chipFilter === c ? 'white' : 'dark'}
                  size="chip"
                  fullWidth
                  onPress={() => {
                    haptic('light');
                    setChipFilter(c);
                  }}
                />
              </View>
            ))}
          </View>

          {/* People List */}
          {filteredPeople.length === 0 ? (
            <View style={styles.emptyPeopleBox}>
              <Text style={styles.emptyText}>
                {search.trim() ? 'No person matches that.' : 'No people yet.'}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {filteredPeople.map((p) => {
                const bal = personBalanceMap.get(p.id) || 0;
                const isLent = bal > 0;
                const isOwe = bal < 0;
                const isSettled = bal === 0;

                const avatarBg = isLent
                  ? C.positiveDeep
                  : isOwe
                  ? C.negativeDeep
                  : C.surface2;

                const avatarTextColor = isLent
                  ? C.positive
                  : isOwe
                  ? C.negative
                  : C.mutedFg;

                const statusLabel = isLent
                  ? 'OWES YOU'
                  : isOwe
                  ? 'YOU OWE'
                  : 'SETTLED';

                const statusColor = isLent
                  ? C.positive
                  : isOwe
                  ? C.negative
                  : C.mutedFg;

                return (
                  <NeoCard
                    key={p.id}
                    face="dark"
                    depth={3}
                    press
                    onPress={() => {
                      haptic('light');
                      router.push({
                        pathname: '/person/[id]',
                        params: { id: p.id },
                      });
                    }}
                    style={styles.personCard}
                  >
                    <View style={styles.personRow}>
                      {/* Avatar Square */}
                      <View
                        style={[
                          styles.personAvatarSquare,
                          { backgroundColor: avatarBg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.personAvatarLetter,
                            { color: avatarTextColor },
                          ]}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      {/* Name & Status */}
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text numberOfLines={1} style={styles.personName}>
                          {p.name}
                        </Text>
                        <Text
                          style={[styles.personStatus, { color: statusColor }]}
                        >
                          {statusLabel}
                        </Text>
                      </View>

                      {/* Balance Amount */}
                      <Amount
                        value={Math.abs(bal)}
                        tone={isLent ? 'pos' : isOwe ? 'neg' : 'mute'}
                        size={18}
                      />
                    </View>
                  </NeoCard>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 1.4 Cash & Accounts Sheet */}
      <Sheet
        visible={showCashSheet}
        onClose={() => setShowCashSheet(false)}
        title="Cash & accounts"
        maxHeightRatio={0.88}
      >
        {/* Centered Green-faced Card */}
        <NeoCard face="green" depth={4} style={styles.sheetTotalCard}>
          <Eyebrow style={{ color: C.positive }}>
            TOTAL CASH & ACCOUNTS
          </Eyebrow>
          <Amount value={totalCash} size={36} />
          <Text style={styles.sheetSubtitle}>
            {accounts.length} accounts / wallets
          </Text>
        </NeoCard>

        {/* Row: SAVED ACCOUNTS + Add new */}
        <View style={styles.sheetSectionRow}>
          <Eyebrow>SAVED ACCOUNTS</Eyebrow>
          <NeoButton
            label="+ ADD NEW"
            variant="dark"
            size="sm"
            onPress={() => setShowAddAccountSheet(true)}
          />
        </View>

        {accounts.length === 0 ? (
          <View style={styles.emptyDashedBox}>
            <Text style={styles.emptyText}>No accounts yet.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {accounts.map((acc) => (
              <NeoCard
                key={acc.id}
                face="dark"
                depth={3}
                press
                onPress={() => {
                  haptic('light');
                  setShowCashSheet(false);
                  router.push({
                    pathname: '/account/[id]' as any,
                    params: { id: acc.id },
                  });
                }}
                style={styles.accountRowCard}
              >
                <View style={styles.accountIconBox}>
                  {acc.type === 'BANK' ? (
                    <Landmark size={18} color={C.primary} />
                  ) : acc.type === 'CASH' ? (
                    <Banknote size={18} color={C.primary} />
                  ) : acc.type === 'WALLET' ? (
                    <Wallet size={18} color={C.primary} />
                  ) : (
                    <CircleDot size={18} color={C.primary} />
                  )}
                </View>

                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={styles.accountName}>
                    {acc.name}
                  </Text>
                  <Text style={styles.accountSubtype}>
                    {acc.type === 'BANK'
                      ? 'Bank account'
                      : acc.type === 'CASH'
                      ? 'cash'
                      : acc.type === 'WALLET'
                      ? 'wallet'
                      : 'other'}
                  </Text>
                </View>

                <Amount
                  value={acc.balance}
                  tone={acc.balance >= 0 ? 'pos' : 'neg'}
                  size={18}
                />
                <ChevronRight size={16} color={C.mutedFg} />
              </NeoCard>
            ))}
          </View>
        )}
      </Sheet>

      {/* 1.5 Credit Cards Sheet */}
      <Sheet
        visible={showCardsSheet}
        onClose={() => setShowCardsSheet(false)}
        title="Credit cards"
        subtitle="Your outstanding on each card"
        maxHeightRatio={0.88}
      >
        {/* Summary Card Split */}
        <NeoCard face="dark" depth={4} style={styles.cardDebtSummary}>
          <View style={{ flex: 1, gap: 4 }}>
            <Eyebrow>TOTAL CARD DEBT</Eyebrow>
            <Amount
              value={totalCardBills}
              tone={totalCardBills > 0 ? 'neg' : undefined}
              size={28}
            />
          </View>

          <View style={styles.verticalSplit} />

          <View style={{ flex: 1, paddingLeft: 16, gap: 4 }}>
            <Eyebrow>TOTAL CARDS</Eyebrow>
            <Text style={[T.display, { fontSize: 28, color: C.foreground }]}>
              {cards.length}
            </Text>
          </View>
        </NeoCard>

        {/* Search Box */}
        <Field
          placeholder="Search cards"
          isSearch
          value={cardSearch}
          onChangeText={setCardSearch}
        />

        {/* List of Cards */}
        <View style={{ gap: 10 }}>
          <Eyebrow>MY CARDS</Eyebrow>
          {filteredCards.length === 0 ? (
            <View style={styles.emptyDashedBox}>
              <Text style={styles.emptyText}>
                {cards.length === 0 ? 'No cards yet.' : 'No card matches that.'}
              </Text>
            </View>
          ) : (
            filteredCards.map((c) => (
              <NeoCard
                key={c.id}
                face="dark"
                depth={3}
                press
                onPress={() => {
                  haptic('light');
                  setSelected3DCard(c);
                }}
                style={styles.cardListRow}
              >
                {/* 4px vertical color bar */}
                <View
                  style={[
                    styles.cardBar,
                    { backgroundColor: c.color || '#0D0D0D' },
                  ]}
                />

                <View style={{ flex: 1, paddingLeft: 14, gap: 2 }}>
                  <Text numberOfLines={1} style={styles.cardRowTitle}>
                    {c.cardName}
                  </Text>
                  <Text style={styles.cardRowMono}>
                    •••• {c.cardNumber ? c.cardNumber.slice(-4) : '0000'}
                  </Text>
                </View>

                {/* Current Bill */}
                <Text style={styles.cardRowBill}>
                  {formatRupees(c.currentBill || 0)}
                </Text>

                {/* Round + Button to open Bill Sheet */}
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    haptic('light');
                    setShowCardsSheet(false);
                    setTimeout(() => {
                      setBillTargetCard(c);
                      setBillAmountInput(
                        c.currentBill ? String(c.currentBill) : ''
                      );
                    }, 250);
                  }}
                  style={styles.roundPlusBtn}
                >
                  <Plus size={16} color={C.primary} />
                </Pressable>

                <ChevronRight size={16} color={C.mutedFg} />
              </NeoCard>
            ))
          )}
        </View>
      </Sheet>

      {/* Filter & Sort Sheet (1.7) */}
      <Sheet
        visible={showFilterSortSheet}
        onClose={() => setShowFilterSortSheet(false)}
        title="Filter & sort"
        footer={
          <TiltButton onPress={handleApplyFilterSort}>APPLY</TiltButton>
        }
      >
        {/* VISIBILITY */}
        <View style={{ gap: 8 }}>
          <Eyebrow>VISIBILITY</Eyebrow>
          <NeoCard face="dark" depth={2} style={styles.filterOptionCard}>
            <View style={styles.iconBox}>
              <Eye size={18} color={C.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.filterOptionTitle}>Hide settled</Text>
              <Text style={styles.filterOptionSub}>
                Only show people with a balance
              </Text>
            </View>
            <NeoToggle
              checked={tempHideSettled}
              onChange={(val) => setTempHideSettled(val)}
            />
          </NeoCard>
        </View>

        {/* SORT BY */}
        <View style={{ gap: 8 }}>
          <Eyebrow>SORT BY</Eyebrow>
          <NeoCard face="dark" depth={2} style={{ padding: 0 }}>
            {[
              { id: 'HIGHEST_BALANCE', label: 'Highest balance' },
              { id: 'LOWEST_BALANCE', label: 'Lowest balance' },
              { id: 'NAME_AZ', label: 'Name A → Z' },
              { id: 'NAME_ZA', label: 'Name Z → A' },
              { id: 'NEWEST_FIRST', label: 'Newest first' },
              { id: 'SETTLED_LAST', label: 'Settled last' },
            ].map((opt, idx, arr) => {
              const isSelected = tempSort === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    haptic('light');
                    setTempSort(opt.id as SortOption);
                  }}
                  style={[
                    styles.sortRow,
                    { minHeight: 56 },
                    idx < arr.length - 1 && styles.sortDivider,
                  ]}
                >
                  <Text
                    style={[
                      styles.sortLabel,
                      isSelected && {
                        color: C.primary,
                        fontFamily: 'Manrope_700Bold',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && <Check size={18} color={C.primary} />}
                </Pressable>
              );
            })}
          </NeoCard>
        </View>
      </Sheet>

      {/* Bill Sheet (Section 6) */}
      <Sheet
        visible={!!billTargetCard}
        onClose={() => setBillTargetCard(null)}
        title={`Bill · ${billTargetCard?.cardName || 'Card'}`}
        footer={
          <View style={{ gap: 10 }}>
            <TiltButton onPress={handleSaveBill}>SAVE BILL</TiltButton>
            {billTargetCard && (billTargetCard.currentBill || 0) > 0 && (
              <NeoButton
                label="MARK AS PAID"
                variant="dark"
                size="md"
                fullWidth
                onPress={handleMarkBillPaid}
              />
            )}
          </View>
        }
      >
        <Field
          label="BILL AMOUNT ₹"
          keyboardType="decimal-pad"
          placeholder="0"
          value={billAmountInput}
          onChangeText={setBillAmountInput}
        />
      </Sheet>

      {/* Add Person Sheet */}
      <Sheet
        visible={showAddPersonSheet}
        onClose={() => setShowAddPersonSheet(false)}
        title="Add person"
        footer={<TiltButton onPress={handleAddPerson}>ADD PERSON</TiltButton>}
      >
        <Field
          label="NAME"
          placeholder="Full name"
          value={addName}
          onChangeText={setAddName}
        />
        <Field
          label="PHONE (OPTIONAL)"
          keyboardType="phone-pad"
          placeholder="Phone number"
          value={addPhone}
          onChangeText={setAddPhone}
        />
        <Field
          label="NOTES (OPTIONAL)"
          placeholder="e.g. Colleague, Flatmate"
          value={addNotes}
          onChangeText={setAddNotes}
        />
      </Sheet>

      {/* Add Account Sheet */}
      <Sheet
        visible={showAddAccountSheet}
        onClose={() => setShowAddAccountSheet(false)}
        title="Add account"
        footer={<TiltButton onPress={handleAddAccount}>SAVE ACCOUNT</TiltButton>}
      >
        <Field
          label="ACCOUNT NAME"
          placeholder="e.g. HDFC Salary, Cash"
          value={accName}
          onChangeText={setAccName}
        />
        <View style={{ gap: 8 }}>
          <Eyebrow>ACCOUNT TYPE</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {(['BANK', 'CASH', 'WALLET', 'OTHER'] as AccountType[]).map((t) => (
              <View key={t} style={{ width: '48%' }}>
                <NeoButton
                  label={t}
                  variant={accType === t ? 'poli' : 'dark'}
                  size="sm"
                  fullWidth
                  depth={2}
                  onPress={() => setAccType(t)}
                />
              </View>
            ))}
          </View>
        </View>
        <Field
          label="INITIAL BALANCE ₹"
          keyboardType="decimal-pad"
          placeholder="0"
          value={accBalance}
          onChangeText={setAccBalance}
        />
      </Sheet>

      {/* Full-screen 3D Card Viewer (Section 3) */}
      {selected3DCard && (
        <Card3DModal
          visible={true}
          card={selected3DCard}
          onClose={() => setSelected3DCard(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusEyebrow: {
    fontSize: 10,
    letterSpacing: 2,
  },
  nameHeader: {
    ...T.display,
    fontSize: 32,
    lineHeight: 36,
    color: C.foreground,
  },
  avatarTile: {
    width: 44,
    height: 44,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 18,
    color: C.background,
  },
  netCard: {
    padding: 16,
    backgroundColor: C.surface,
    gap: 16,
    overflow: 'hidden',
  },
  netCaption: {
    ...T.body,
    fontSize: 12,
    color: C.mutedFg,
    marginTop: 2,
  },
  netDivider: {
    height: 1,
    backgroundColor: C.border,
  },
  netSplitRow: {
    flexDirection: 'row',
  },
  verticalSplit: {
    width: 1,
    backgroundColor: C.border,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryTile: {
    padding: 12,
    backgroundColor: C.surface,
    position: 'relative',
    overflow: 'hidden',
  },
  tileStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  tileLabel: {
    ...T.caps,
    fontSize: 8,
    color: C.mutedFg,
    letterSpacing: 1.5,
  },
  dueCard: {
    width: 160,
    padding: 12,
    backgroundColor: C.surface,
    gap: 4,
  },
  dueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueTag: {
    ...T.caps,
    fontSize: 8,
    letterSpacing: 1.5,
  },
  dueName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: C.foreground,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...T.display,
    fontSize: 24,
    color: C.foreground,
  },
  totalPill: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  totalPillText: {
    ...T.caps,
    fontSize: 9,
    color: C.mutedFg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterSquareBtn: {
    width: 48,
    height: 48,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyPeopleBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.border,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...T.body,
    fontSize: 13,
    color: C.mutedFg,
  },
  personCard: {
    backgroundColor: C.surface,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  personAvatarSquare: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarLetter: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 16,
  },
  personName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.foreground,
  },
  personStatus: {
    ...T.caps,
    fontSize: 9,
    letterSpacing: 1.5,
  },
  sheetTotalCard: {
    padding: 18,
    backgroundColor: C.positiveDeep,
    alignItems: 'center',
    gap: 6,
  },
  sheetSubtitle: {
    ...T.body,
    fontSize: 12,
    color: C.mutedFg,
  },
  sheetSectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  emptyDashedBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.border,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    backgroundColor: C.surface,
  },
  accountIconBox: {
    width: 38,
    height: 38,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountName: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.foreground,
  },
  accountSubtype: {
    ...T.caps,
    fontSize: 9,
    color: C.mutedFg,
  },
  cardDebtSummary: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: C.surface,
  },
  cardListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingRight: 10,
    backgroundColor: C.surface,
    position: 'relative',
    overflow: 'hidden',
  },
  cardBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardRowTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.foreground,
  },
  cardRowMono: {
    ...T.mono,
    fontSize: 11,
    color: C.mutedFg,
  },
  cardRowBill: {
    ...T.mono,
    fontSize: 14,
    color: C.foreground,
    marginRight: 8,
  },
  roundPlusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  filterOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    backgroundColor: C.surface,
  },
  iconBox: {
    width: 36,
    height: 36,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    color: C.foreground,
  },
  filterOptionSub: {
    ...T.body,
    fontSize: 11,
    color: C.mutedFg,
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  togglePillText: {
    ...T.caps,
    fontSize: 9,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  sortDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sortLabel: {
    ...T.body,
    fontSize: 13,
    color: C.foreground,
  },
});
