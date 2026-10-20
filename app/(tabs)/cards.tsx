import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  ScrollView,
  RefreshControl,
  Dimensions,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  Eye,
  EyeOff,
  Copy,
  Pencil,
  ChevronRight,
  Landmark,
  Banknote,
  Wallet,
  CircleDot,
  Check,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
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
  CreditCardVisual,
  NeoToggle,
  Segmented,
  Sheet,
  Field,
  Card3DModal,
  haptic,
  formatRupees,
} from '@/src/design';
import { useToast } from '@/components/neo/Toast';
import {
  CreditCard,
  Account,
  Loan,
  CardType,
  AccountType,
  LoanType,
} from '@/lib/types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CAROUSEL_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.86);

type TabType = 'cards' | 'accounts' | 'loans';

export default function FinancesScreen() {
  const insets = useSafeAreaInsets();
  const { width: SCREEN } = useWindowDimensions();
  const SIDE = 20;
  const GAP = 16;
  const CARD_W = Math.round((SCREEN - SIDE * 2) * 0.86);
  const params = useLocalSearchParams<{ tab?: string }>();
  const { showToast } = useToast();

  const {
    cards,
    accounts,
    loans,
    enableLoans,
    setEnableLoans,
    includeLoansInTotal,
    setIncludeLoansInTotal,
    addCard,
    updateCard,
    removeCard,
    addAccount,
    updateAccount,
    removeAccount,
    addLoan,
    updateLoan,
    removeLoan,
    reload,
  } = useData();

  const [activeTab, setActiveTab] = useState<TabType>('cards');
  const [refreshing, setRefreshing] = useState(false);

  // Read tab from query params if passed (e.g. from Home Loans tile)
  useEffect(() => {
    if (params.tab === 'loans') {
      setActiveTab('loans');
    } else if (params.tab === 'accounts') {
      setActiveTab('accounts');
    } else if (params.tab === 'cards') {
      setActiveTab('cards');
    }
  }, [params.tab]);

  // Card Tab State
  const [cardSearch, setCardSearch] = useState('');
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [revealedCardIds, setRevealedCardIds] = useState<{ [id: string]: boolean }>({});
  const [selected3DCard, setSelected3DCard] = useState<CreditCard | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // Bill Sheet
  const [billTargetCard, setBillTargetCard] = useState<CreditCard | null>(null);
  const [billAmountInput, setBillAmountInput] = useState('');

  // Add / Edit Card Sheet (No due date, no reminders)
  const [showCardSheet, setShowCardSheet] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [formCardName, setFormCardName] = useState('');
  const [formCardNumber, setFormCardNumber] = useState('');
  const [formCardType, setFormCardType] = useState<CardType>('VISA');
  const [formHolder, setFormHolder] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formCvv, setFormCvv] = useState('');
  const [formColor, setFormColor] = useState('#0D0D0D');

  // Add / Edit Account Sheet
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formAccName, setFormAccName] = useState('');
  const [formAccType, setFormAccType] = useState<AccountType>('BANK');
  const [formAccBalance, setFormAccBalance] = useState('');
  const [formAccNotes, setFormAccNotes] = useState('');

  // Add / Edit Loan Sheet
  const [showLoanSheet, setShowLoanSheet] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [formLoanName, setFormLoanName] = useState('');
  const [formLoanType, setFormLoanType] = useState<LoanType>('PERSONAL');
  const [formTotalAmt, setFormTotalAmt] = useState('');
  const [formRemainAmt, setFormRemainAmt] = useState('');
  const [formEmiAmt, setFormEmiAmt] = useState('');
  const [formDueDay, setFormDueDay] = useState('');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  // Totals calculations
  const totalCash = useMemo(
    () => accounts.reduce((sum, a) => sum + (a.balance || 0), 0),
    [accounts]
  );
  const totalCardDues = useMemo(
    () => cards.reduce((sum, c) => sum + (c.currentBill || 0), 0),
    [cards]
  );
  const totalLoansRemaining = useMemo(
    () => loans.reduce((sum, l) => sum + (l.remainingAmount || 0), 0),
    [loans]
  );
  const totalMonthlyEmi = useMemo(
    () => loans.reduce((sum, l) => sum + (l.emiAmount || 0), 0),
    [loans]
  );

  // Net Worth calculation
  // Net worth = cash − card dues − (loans remaining, only if loan tracking AND "include in net worth" are on)
  const netWorth = useMemo(() => {
    let val = totalCash - totalCardDues;
    if (enableLoans && includeLoansInTotal) {
      val -= totalLoansRemaining;
    }
    return val;
  }, [totalCash, totalCardDues, totalLoansRemaining, enableLoans, includeLoansInTotal]);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    if (!cardSearch.trim()) return cards;
    const q = cardSearch.toLowerCase().trim();
    return cards.filter(
      (c) =>
        c.cardName.toLowerCase().includes(q) ||
        (c.cardType && c.cardType.toLowerCase().includes(q)) ||
        (q.length >= 2 && c.cardNumber && c.cardNumber.slice(-4).includes(q))
    );
  }, [cards, cardSearch]);

  // Reset carousel when searching
  const handleCardSearchChange = (text: string) => {
    setCardSearch(text);
    setSelectedCardIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

  const currentCard = filteredCards[selectedCardIndex] || filteredCards[0] || null;
  const isCurrentRevealed = currentCard ? !!revealedCardIds[currentCard.id] : false;

  // Toggle reveal
  const toggleCardReveal = (cardId: string) => {
    haptic('light');
    setRevealedCardIds((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // Copy card number
  const handleCopyCardNumber = async (num: string) => {
    haptic('light');
    await Clipboard.setStringAsync(num.replace(/\s+/g, ''));
    showToast('Card number copied');
  };

  // Open Edit Card form
  const handleOpenEditCard = (c: CreditCard) => {
    setEditingCard(c);
    setFormCardName(c.cardName);
    setFormCardNumber(c.cardNumber);
    setFormCardType(c.cardType || 'VISA');
    setFormHolder(c.nameOnCard || '');
    setFormExpiry(c.expiry || '');
    setFormCvv(c.cvv || '');
    setFormColor(c.color || '#0D0D0D');
    setShowCardSheet(true);
  };

  // Open Add Card form
  const handleOpenAddCard = () => {
    setEditingCard(null);
    setFormCardName('');
    setFormCardNumber('');
    setFormCardType('VISA');
    setFormHolder('');
    setFormExpiry('');
    setFormCvv('');
    setFormColor('#0D0D0D');
    setShowCardSheet(true);
  };

  const handleSaveCard = async () => {
    if (!formCardName.trim()) {
      showToast('Card name is required');
      return;
    }
    const cleanNum = formCardNumber.replace(/\s+/g, '');
    if (!cleanNum) {
      showToast('Card number is required');
      return;
    }

    try {
      if (editingCard) {
        await updateCard({
          ...editingCard,
          cardName: formCardName.trim(),
          cardNumber: cleanNum,
          cardType: formCardType,
          nameOnCard: formHolder.trim(),
          expiry: formExpiry.trim(),
          cvv: formCvv.trim(),
          color: formColor,
        });
        showToast('Card updated');
      } else {
        await addCard({
          cardName: formCardName.trim(),
          cardNumber: cleanNum,
          cardType: formCardType,
          nameOnCard: formHolder.trim(),
          expiry: formExpiry.trim(),
          cvv: formCvv.trim(),
          color: formColor,
          currentBill: 0,
        });
        showToast('Card added');
      }
      setShowCardSheet(false);
    } catch (e: any) {
      showToast(e.message || 'Failed to save card');
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

  // Account Handlers
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setFormAccName('');
    setFormAccType('BANK');
    setFormAccBalance('');
    setFormAccNotes('');
    setShowAccountSheet(true);
  };

  const handleOpenEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setFormAccName(acc.name);
    setFormAccType(acc.type);
    setFormAccBalance(String(acc.balance || 0));
    setFormAccNotes(acc.notes || '');
    setShowAccountSheet(true);
  };

  const handleSaveAccount = async () => {
    if (!formAccName.trim()) {
      showToast('Account name is required');
      return;
    }
    const bal = parseFloat(formAccBalance) || 0;
    try {
      if (editingAccount) {
        await updateAccount({
          ...editingAccount,
          name: formAccName.trim(),
          type: formAccType,
          notes: formAccNotes.trim(),
          updatedAt: Date.now(),
        });
        showToast('Account updated');
      } else {
        await addAccount({
          name: formAccName.trim(),
          type: formAccType,
          balance: bal,
          notes: formAccNotes.trim(),
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
      }
      setShowAccountSheet(false);
    } catch (e: any) {
      showToast(e.message || 'Failed to save account');
    }
  };

  // Loan Handlers
  const handleOpenAddLoan = () => {
    setEditingLoan(null);
    setFormLoanName('');
    setFormLoanType('PERSONAL');
    setFormTotalAmt('');
    setFormRemainAmt('');
    setFormEmiAmt('');
    setFormDueDay('');
    setShowLoanSheet(true);
  };

  const handleOpenEditLoan = (loan: Loan) => {
    setEditingLoan(loan);
    setFormLoanName(loan.name);
    setFormLoanType(loan.type);
    setFormTotalAmt(String(loan.totalAmount || 0));
    setFormRemainAmt(String(loan.remainingAmount || 0));
    setFormEmiAmt(loan.emiAmount ? String(loan.emiAmount) : '');
    setFormDueDay(loan.monthlyDueDate ? String(loan.monthlyDueDate) : '');
    setShowLoanSheet(true);
  };

  const handleSaveLoan = async () => {
    if (!formLoanName.trim()) {
      showToast('Loan name is required');
      return;
    }
    const total = parseFloat(formTotalAmt) || 0;
    const remain = parseFloat(formRemainAmt) || total;
    const emi = parseFloat(formEmiAmt) || undefined;
    const dueDay = parseInt(formDueDay, 10) || undefined;

    try {
      if (editingLoan) {
        await updateLoan({
          ...editingLoan,
          name: formLoanName.trim(),
          type: formLoanType,
          totalAmount: total,
          remainingAmount: remain,
          emiAmount: emi,
          monthlyDueDate: dueDay,
          updatedAt: Date.now(),
        });
        showToast('Loan updated');
      } else {
        await addLoan({
          name: formLoanName.trim(),
          type: formLoanType,
          totalAmount: total,
          remainingAmount: remain,
          emiAmount: emi,
          monthlyDueDate: dueDay,
        });
        showToast('Loan added');
      }
      setShowLoanSheet(false);
    } catch (e: any) {
      showToast(e.message || 'Failed to save loan');
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
        {/* 1a. Net worth header — plain header on the page background, 20px side padding, 24px from top */}
        <View style={styles.netWorthHeader}>
          <Eyebrow>NET WORTH</Eyebrow>
          <View style={{ marginTop: 6, marginBottom: 20 }}>
            {netWorth >= 0 ? (
              <TextShimmer
                amount={netWorth}
                fontSize={56}
                style={{
                  fontFamily: 'Fraunces_900Black',
                  letterSpacing: -1.5,
                  fontVariant: ['tabular-nums'],
                }}
              />
            ) : (
              <Text
                style={{
                  fontFamily: 'Fraunces_900Black',
                  fontSize: 56,
                  letterSpacing: -1.5,
                  color: C.negative,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatRupees(netWorth)}
              </Text>
            )}
          </View>

          {/* Flat strip with 1px border, split into equal columns by 1px vertical lines */}
          <View style={styles.stripContainer}>
            <View style={styles.stripCell}>
              <Text style={styles.stripLabel}>CASH</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[styles.stripValue, { color: C.positive }]}
              >
                {formatRupees(totalCash)}
              </Text>
            </View>

            <View style={styles.stripDivider} />

            <View style={styles.stripCell}>
              <Text style={styles.stripLabel}>CARD DUES</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[styles.stripValue, { color: C.negative }]}
              >
                {formatRupees(totalCardDues)}
              </Text>
            </View>

            {enableLoans && (
              <>
                <View style={styles.stripDivider} />
                <View style={styles.stripCell}>
                  <Text style={styles.stripLabel}>LOANS</Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    style={[styles.stripValue, { color: C.negative }]}
                  >
                    {formatRupees(totalLoansRemaining)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 1b. Tabs — three separate raised buttons, not a sunken tab bar */}
        <View style={styles.tabButtonsRow}>
          {(['cards', 'accounts', 'loans'] as TabType[]).map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <View key={tab} style={{ flex: 1 }}>
                <NeoButton
                  label={tab === 'cards' ? 'Cards' : tab === 'accounts' ? 'Accounts' : 'Loans'}
                  variant={isSelected ? 'white' : 'dark'}
                  size="sm"
                  fullWidth
                  onPress={() => {
                    haptic('light');
                    setActiveTab(tab);
                  }}
                  style={{ paddingHorizontal: 4 }}
                  labelStyle={{
                    fontFamily: 'Manrope_700Bold',
                    fontSize: 12,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                  }}
                />
              </View>
            );
          })}
        </View>

        {/* TAB 1: CARDS */}
        {activeTab === 'cards' && (
          <View style={{ gap: 16 }}>
            {/* 2.2 Search */}
            <Field
              placeholder="Search cards"
              isSearch
              value={cardSearch}
              onChangeText={handleCardSearchChange}
            />

            {/* 2.3 Horizontal Card Carousel */}
            {filteredCards.length === 0 ? (
              <View style={styles.emptyDashedBox}>
                <Text style={styles.emptyText}>
                  {cards.length === 0 ? 'No cards yet.' : 'No card matches that.'}
                </Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={{ marginHorizontal: -SIDE, width: SCREEN }}>
                  <FlatList
                    ref={flatListRef}
                    data={filteredCards}
                    keyExtractor={(c) => c.id}
                    horizontal
                    pagingEnabled={false}
                    snapToInterval={CARD_W + GAP}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      paddingHorizontal: SIDE,
                    }}
                    ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
                    onScroll={(e) => {
                      const x = e.nativeEvent.contentOffset.x;
                      const idx = Math.round(x / (CARD_W + GAP));
                      if (idx >= 0 && idx < filteredCards.length && idx !== selectedCardIndex) {
                        setSelectedCardIndex(idx);
                      }
                    }}
                    scrollEventThrottle={16}
                    onMomentumScrollEnd={(e) => {
                      const offset = e.nativeEvent.contentOffset.x;
                      const idx = Math.round(offset / (CARD_W + GAP));
                      setSelectedCardIndex(Math.max(0, Math.min(filteredCards.length - 1, idx)));
                    }}
                    renderItem={({ item }) => (
                      <CreditCardVisual
                        card={item}
                        width={CARD_W}
                        isRevealed={!!revealedCardIds[item.id]}
                        onPress={() => {
                          haptic('light');
                          setSelected3DCard(item);
                        }}
                      />
                    )}
                  />
                </View>

                {/* Page Dots (2+ cards) */}
                {filteredCards.length > 1 && (
                  <View style={styles.dotsRow}>
                    {filteredCards.map((c, i) => {
                      const isActive = i === selectedCardIndex;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => {
                            haptic('light');
                            setSelectedCardIndex(i);
                            flatListRef.current?.scrollToOffset({
                              offset: i * (CARD_W + GAP),
                              animated: true,
                            });
                          }}
                          style={[
                            styles.dot,
                            isActive ? styles.dotActive : styles.dotInactive,
                          ]}
                        />
                      );
                    })}
                  </View>
                )}

                {/* 2.4 Selected-card panel */}
                {currentCard && (
                  <NeoCard face="dark" depth={3} style={styles.selectedPanel}>
                    <View style={styles.selectedPanelRow}>
                      {/* Left: Outstanding Bill */}
                      <View style={{ flex: 1, gap: 4 }}>
                        <Eyebrow style={{ fontSize: 9 }}>OUTSTANDING BILL</Eyebrow>
                        {(currentCard.currentBill || 0) === 0 ? (
                          <View style={{ gap: 2 }}>
                            <Text
                              style={{
                                fontFamily: 'Fraunces_900Black',
                                fontSize: 24,
                                color: C.positive,
                              }}
                            >
                              ₹0
                            </Text>
                            <Text
                              style={{
                                ...T.caps,
                                fontSize: 10,
                                color: C.primary,
                                letterSpacing: 1.5,
                              }}
                            >
                              ✓ ALL BILLS PAID
                            </Text>
                          </View>
                        ) : (
                          <Amount
                            value={currentCard.currentBill || 0}
                            size={24}
                          />
                        )}

                        <Pressable
                          onPress={() => {
                            haptic('light');
                            setBillTargetCard(currentCard);
                            setBillAmountInput(
                              currentCard.currentBill
                                ? String(currentCard.currentBill)
                                : ''
                            );
                          }}
                          style={{ marginTop: 4 }}
                        >
                          <Text
                            style={{
                              ...T.caps,
                              fontSize: 10,
                              color: C.primary,
                              letterSpacing: 1.5,
                              textDecorationLine: 'underline',
                            }}
                          >
                            {(currentCard.currentBill || 0) > 0
                              ? 'UPDATE BILL'
                              : '+ ADD BILL'}
                          </Text>
                        </Pressable>
                      </View>

                      {/* Right: small dark raised NeoButtons (36px, not flat outlined squares) */}
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        {isCurrentRevealed && (
                          <NeoButton
                            variant="dark"
                            size="sm"
                            icon={<Copy size={16} color={C.foreground} />}
                            onPress={() =>
                              handleCopyCardNumber(currentCard.cardNumber)
                            }
                            style={{ width: 36, height: 36, paddingHorizontal: 0 }}
                          />
                        )}

                        <NeoButton
                          variant="dark"
                          size="sm"
                          icon={
                            isCurrentRevealed ? (
                              <EyeOff size={16} color={C.primary} />
                            ) : (
                              <Eye size={16} color={C.foreground} />
                            )
                          }
                          onPress={() => toggleCardReveal(currentCard.id)}
                          style={{ width: 36, height: 36, paddingHorizontal: 0 }}
                        />

                        <NeoButton
                          variant="dark"
                          size="sm"
                          icon={<Pencil size={16} color={C.foreground} />}
                          onPress={() => handleOpenEditCard(currentCard)}
                          style={{ width: 36, height: 36, paddingHorizontal: 0 }}
                        />
                      </View>
                    </View>
                  </NeoCard>
                )}
              </View>
            )}

            {/* Bottom Add Card Button */}
            <NeoButton
              label="+ ADD CARD"
              variant="white"
              size="md"
              fullWidth
              onPress={handleOpenAddCard}
            />
          </View>
        )}

        {/* TAB 2: ACCOUNTS (2.5) */}
        {activeTab === 'accounts' && (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 10 }}>
              {accounts.length === 0 ? (
                <View style={styles.emptyDashedBox}>
                  <Text style={styles.emptyText}>No accounts yet.</Text>
                </View>
              ) : (
                accounts.map((acc) => (
                  <NeoCard
                    key={acc.id}
                    face="dark"
                    depth={3}
                    press
                    onPress={() => {
                      haptic('light');
                      router.push({
                        pathname: '/account/[id]' as any,
                        params: { id: acc.id },
                      });
                    }}
                    containerStyle={{ width: '100%' }}
                    style={styles.accountItemCard}
                  >
                    <View style={styles.accountIconSquare}>
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

                    <View style={{ flex: 1, gap: 2, marginRight: 8, justifyContent: 'center' }}>
                      <Text
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={styles.accountItemTitle}
                      >
                        {acc.name}
                      </Text>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                        style={styles.accountItemSub}
                      >
                        {acc.type === 'BANK'
                          ? 'Bank account'
                          : acc.type === 'CASH'
                          ? 'Cash'
                          : acc.type === 'WALLET'
                          ? 'Wallet'
                          : 'Other'}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                      <Amount
                        value={acc.balance}
                        tone={acc.balance >= 0 ? 'pos' : 'neg'}
                        size={18}
                      />
                    </View>

                    {/* Small Pencil button to edit */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        haptic('light');
                        handleOpenEditAccount(acc);
                      }}
                      style={styles.rowEditBtn}
                    >
                      <Pencil size={15} color={C.mutedFg} />
                    </Pressable>

                    <ChevronRight size={16} color={C.mutedFg} />
                  </NeoCard>
                ))
              )}
            </View>

            <NeoButton
              label="+ ADD ACCOUNT"
              variant="white"
              size="md"
              fullWidth
              onPress={handleOpenAddAccount}
            />
          </View>
        )}

        {/* TAB 3: LOANS (Section 1e) */}
        {activeTab === 'loans' && (
          <View style={{ gap: 16 }}>
            {/* 1e. Settings box: one flat box (1px border, surface background, line between rows) */}
            <View style={styles.settingsFlatBox}>
              {/* Row 1: Track active loans */}
              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingTitle}>Track active loans</Text>
                  <Text style={styles.settingDesc}>
                    Turn on if you have any loans or EMIs.
                  </Text>
                </View>
                <NeoToggle
                  checked={enableLoans}
                  onChange={(val) => setEnableLoans(val)}
                />
              </View>

              {/* Row 2: Include in net worth (only when tracking is on) */}
              {enableLoans && (
                <>
                  <View style={styles.settingsDivider} />
                  <View style={styles.settingRow}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={styles.settingTitle}>
                        Include in net worth
                      </Text>
                      <Text style={styles.settingDesc}>
                        Subtract what's left on loans from your totals.
                      </Text>
                    </View>
                    <NeoToggle
                      checked={includeLoansInTotal}
                      onChange={(val) => setIncludeLoansInTotal(val)}
                    />
                  </View>
                </>
              )}
            </View>

            {/* When tracking is on: 2 Cards + Loans List. When OFF, nothing else is shown */}
            {enableLoans && (
              <View style={{ gap: 16 }}>
                {/* 2 cards: OUTSTANDING & MONTHLY EMI - both with dark faces, muted grey 9px eyebrows */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <NeoCard face="dark" depth={3} style={styles.loanMetricCard}>
                      <Eyebrow>OUTSTANDING</Eyebrow>
                      {totalLoansRemaining === 0 ? (
                        <Text
                          style={{
                            fontFamily: 'Fraunces_900Black',
                            fontSize: 24,
                            color: C.mutedFg,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          ₹0
                        </Text>
                      ) : (
                        <Amount value={totalLoansRemaining} tone="neg" size={24} />
                      )}
                      <Text style={styles.loanMetricCaption}>
                        {includeLoansInTotal
                          ? 'In net worth'
                          : 'Not in net worth'}
                      </Text>
                    </NeoCard>
                  </View>

                  <View style={{ flex: 1 }}>
                    <NeoCard face="dark" depth={3} style={styles.loanMetricCard}>
                      <Eyebrow>MONTHLY EMI</Eyebrow>
                      <Amount value={totalMonthlyEmi} size={24} />
                      <Text style={styles.loanMetricCaption}>
                        Across {loans.length} loans
                      </Text>
                    </NeoCard>
                  </View>
                </View>

                {/* ACTIVE LOANS & EMIS List */}
                <View style={{ gap: 10 }}>
                  <Eyebrow>ACTIVE LOANS & EMIS</Eyebrow>
                  {loans.length === 0 ? (
                    <View style={styles.emptyDashedBox}>
                      <Text style={styles.emptyText}>No loans added yet.</Text>
                    </View>
                  ) : (
                    loans.map((loan) => {
                      const paidPct =
                        loan.totalAmount > 0
                          ? Math.max(
                              0,
                              Math.min(
                                100,
                                Math.round(
                                  ((loan.totalAmount - loan.remainingAmount) /
                                    loan.totalAmount) *
                                    100
                                )
                              )
                            )
                          : 0;

                      return (
                        <NeoCard
                          key={loan.id}
                          face="dark"
                          depth={3}
                          press
                          onPress={() => {
                            haptic('light');
                            handleOpenEditLoan(loan);
                          }}
                          style={styles.loanCardItem}
                        >
                          <View style={styles.loanItemTop}>
                            <View style={{ flex: 1 }}>
                              <Text
                                numberOfLines={1}
                                style={styles.loanItemTitle}
                              >
                                {loan.name}
                              </Text>
                              <Text style={styles.loanItemSub}>
                                {loan.type}
                                {loan.emiAmount
                                  ? ` · ₹${loan.emiAmount}/mo`
                                  : ''}
                                {loan.monthlyDueDate
                                  ? ` · due day ${loan.monthlyDueDate}`
                                  : ''}
                              </Text>
                            </View>

                            <Amount
                              value={loan.remainingAmount}
                              tone="neg"
                              size={18}
                            />
                          </View>

                          {/* Bordered Progress Bar */}
                          <View style={styles.progressBarWrapper}>
                            <View
                              style={[
                                styles.progressFill,
                                { width: `${paidPct}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.progressText}>
                            {paidPct}% paid · {formatRupees(loan.remainingAmount)} left of {formatRupees(loan.totalAmount)}
                          </Text>
                        </NeoCard>
                      );
                    })
                  )}
                </View>

                <NeoButton
                  label="+ ADD LOAN"
                  variant="white"
                  size="md"
                  fullWidth
                  onPress={handleOpenAddLoan}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>

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

      {/* Add / Edit Card Sheet (No due date, no reminders) */}
      <Sheet
        visible={showCardSheet}
        onClose={() => setShowCardSheet(false)}
        title={editingCard ? 'Edit credit card' : 'Add credit card'}
        footer={
          <TiltButton onPress={handleSaveCard}>
            {editingCard ? 'SAVE CARD' : 'ADD CARD'}
          </TiltButton>
        }
      >
        <Field
          label="CARD NAME"
          placeholder="e.g. HDFC Millennia, ICICI Sapphiro"
          value={formCardName}
          onChangeText={setFormCardName}
        />
        <Field
          label="CARD NUMBER"
          keyboardType="number-pad"
          placeholder="16 digits"
          value={formCardNumber}
          onChangeText={setFormCardNumber}
        />

        <View style={{ gap: 8 }}>
          <Eyebrow>CARD NETWORK</Eyebrow>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['VISA', 'MASTERCARD', 'RUPAY', 'AMEX'] as CardType[]).map((net) => (
              <View key={net} style={{ flex: 1 }}>
                <NeoButton
                  label={net}
                  variant={formCardType === net ? 'poli' : 'dark'}
                  size="sm"
                  fullWidth
                  depth={2}
                  onPress={() => setFormCardType(net)}
                />
              </View>
            ))}
          </View>
        </View>

        <Field
          label="NAME ON CARD"
          placeholder="CARDHOLDER NAME"
          value={formHolder}
          onChangeText={setFormHolder}
        />

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="EXPIRES"
              placeholder="MM/YY"
              value={formExpiry}
              onChangeText={setFormExpiry}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="CVV"
              keyboardType="number-pad"
              placeholder="3 digits"
              secureTextEntry
              maxLength={4}
              value={formCvv}
              onChangeText={setFormCvv}
            />
          </View>
        </View>

        {/* Color Palette */}
        <View style={{ gap: 8 }}>
          <Eyebrow>CARD THEME</Eyebrow>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {['#0D0D0D', '#1A237E', '#4A148C', '#1B5E20', '#E65100', '#B71C1C'].map(
              (c) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    haptic('light');
                    setFormColor(c);
                  }}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    formColor === c && styles.colorCircleActive,
                  ]}
                />
              )
            )}
          </View>
        </View>
      </Sheet>

      {/* Add / Edit Account Sheet */}
      <Sheet
        visible={showAccountSheet}
        onClose={() => setShowAccountSheet(false)}
        title={editingAccount ? 'Edit account' : 'Add account'}
        footer={
          <TiltButton onPress={handleSaveAccount}>
            {editingAccount ? 'SAVE CHANGES' : 'ADD ACCOUNT'}
          </TiltButton>
        }
      >
        <Field
          label="ACCOUNT NAME"
          placeholder="e.g. HDFC Salary, Cash"
          value={formAccName}
          onChangeText={setFormAccName}
        />
        <View style={{ gap: 8 }}>
          <Eyebrow>ACCOUNT TYPE</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {(['BANK', 'CASH', 'WALLET', 'OTHER'] as AccountType[]).map((t) => (
              <View key={t} style={{ width: '48%' }}>
                <NeoButton
                  label={t}
                  variant={formAccType === t ? 'poli' : 'dark'}
                  size="sm"
                  fullWidth
                  depth={2}
                  onPress={() => setFormAccType(t)}
                />
              </View>
            ))}
          </View>
        </View>
        {!editingAccount && (
          <Field
            label="INITIAL BALANCE ₹"
            keyboardType="decimal-pad"
            placeholder="0"
            value={formAccBalance}
            onChangeText={setFormAccBalance}
          />
        )}
        <Field
          label="NOTES (OPTIONAL)"
          placeholder="Notes or branch"
          value={formAccNotes}
          onChangeText={setFormAccNotes}
        />
      </Sheet>

      {/* Add / Edit Loan Sheet */}
      <Sheet
        visible={showLoanSheet}
        onClose={() => setShowLoanSheet(false)}
        title={editingLoan ? 'Edit loan' : 'Add loan'}
        footer={
          <TiltButton onPress={handleSaveLoan}>
            {editingLoan ? 'SAVE LOAN' : 'ADD LOAN'}
          </TiltButton>
        }
      >
        <Field
          label="LENDER / LOAN NAME"
          placeholder="e.g. HDFC Home Loan, Bike EMI"
          value={formLoanName}
          onChangeText={setFormLoanName}
        />
        <View style={{ gap: 8 }}>
          <Eyebrow>LOAN TYPE</Eyebrow>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['PERSONAL', 'EMI', 'HOME', 'VEHICLE', 'EDUCATION', 'OTHER'] as LoanType[]).map(
              (t) => (
                <View key={t} style={{ width: '31%' }}>
                  <NeoButton
                    label={t}
                    variant={formLoanType === t ? 'poli' : 'dark'}
                    size="chip"
                    fullWidth
                    depth={2}
                    onPress={() => setFormLoanType(t)}
                  />
                </View>
              )
            )}
          </View>
        </View>
        <Field
          label="TOTAL AMOUNT ₹"
          keyboardType="decimal-pad"
          placeholder="0"
          value={formTotalAmt}
          onChangeText={setFormTotalAmt}
        />
        <Field
          label="REMAINING AMOUNT ₹"
          keyboardType="decimal-pad"
          placeholder="0"
          value={formRemainAmt}
          onChangeText={setFormRemainAmt}
        />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="MONTHLY EMI ₹"
              keyboardType="decimal-pad"
              placeholder="0"
              value={formEmiAmt}
              onChangeText={setFormEmiAmt}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="DUE DAY (1-31)"
              keyboardType="number-pad"
              placeholder="5"
              value={formDueDay}
              onChangeText={setFormDueDay}
            />
          </View>
        </View>
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
  netWorthHeader: {
    paddingTop: 8,
    gap: 2,
  },
  tabButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 4,
  },
  settingsFlatBox: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  netWorthCard: {
    padding: 16,
    backgroundColor: C.surface,
    gap: 16,
    overflow: 'hidden',
  },
  stripContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  stripCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 3,
  },
  stripLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: C.mutedFg,
  },
  stripValue: {
    fontFamily: 'Fraunces_900Black',
    fontSize: 20,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  stripDivider: {
    width: 1,
    backgroundColor: C.border,
  },
  emptyDashedBox: {
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
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  dot: {
    height: 6,
    borderRadius: 0,
  },
  dotActive: {
    width: 24,
    backgroundColor: C.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: C.muted,
  },
  selectedPanel: {
    padding: 16,
    backgroundColor: C.surface,
  },
  selectedPanelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billsPaidText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 15,
    color: C.primary,
    letterSpacing: 1,
  },
  billLinkText: {
    ...T.caps,
    fontSize: 11,
    color: C.primary,
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  panelActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  panelActionBtn: {
    width: 38,
    height: 38,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    backgroundColor: C.surface,
  },
  accountIconSquare: {
    width: 38,
    height: 38,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountItemTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.foreground,
  },
  accountItemSub: {
    ...T.caps,
    fontSize: 9,
    color: C.mutedFg,
  },
  rowEditBtn: {
    padding: 6,
  },
  settingsCard: {
    backgroundColor: C.surface,
    padding: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: C.foreground,
  },
  settingDesc: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: '#A3A3A3',
    marginTop: 2,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: C.border,
  },
  loanMetricCard: {
    padding: 14,
    gap: 4,
  },
  loanMetricCaption: {
    ...T.body,
    fontSize: 11,
    color: C.mutedFg,
  },
  loanCardItem: {
    padding: 14,
    backgroundColor: C.surface,
    gap: 10,
  },
  loanItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  loanItemTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.foreground,
  },
  loanItemSub: {
    ...T.caps,
    fontSize: 9,
    color: C.mutedFg,
    marginTop: 2,
  },
  progressBarWrapper: {
    height: 6,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.primary,
  },
  progressText: {
    ...T.caps,
    fontSize: 9,
    color: C.mutedFg,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: C.border,
  },
  colorCircleActive: {
    borderWidth: 2,
    borderColor: C.primary,
  },
});
