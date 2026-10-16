import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Platform,
  Dimensions,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Icon } from '@/components/Icon';
import Animated, { useAnimatedStyle, useSharedValue, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopCard } from '@/components/NeoPopCard';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { CreditCardVisual } from '@/components/CreditCardVisual';
import { formatCurrency, formatRelativeDate } from '@/lib/formatters';
import { Fonts } from '@/lib/fonts';
import type { Account, AccountType, CreditCard, Loan, LoanType } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

type ActiveSection = 'overview' | 'accounts' | 'cards' | 'loans';

function AnimatedCard({ card, index, scrollX, totalCards, onCopy, onEdit, onDelete }: {
  card: any;
  index: number;
  scrollX: SharedValue<number>;
  totalCards: number;
  onCopy: (label: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * CARD_WIDTH,
      index * CARD_WIDTH,
      (index + 1) * CARD_WIDTH,
    ];

    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[{ width: CARD_WIDTH }, animatedStyle]}>
      <CreditCardVisual card={card} onCopy={onCopy} onEdit={onEdit} onDelete={onDelete} />
    </Animated.View>
  );
}

export default function FinancesScreen() {
  const insets = useSafeAreaInsets();
  const {
    cards,
    removeCard,
    updateCard,
    accounts,
    addAccount,
    updateAccount,
    removeAccount,
    loans,
    addLoan,
    updateLoan,
    removeLoan,
    totalCashAndAccounts,
    totalCreditCardsDue,
    totalLoansRemaining,
  } = useData();

  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [showCvv, setShowCvv] = useState(false);
  const scrollX = useSharedValue(0);

  // Modals for Adding / Editing
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('BANK');
  const [accountBalance, setAccountBalance] = useState('');
  const [accountNotes, setAccountNotes] = useState('');

  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanName, setLoanName] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('PERSONAL');
  const [loanTotal, setLoanTotal] = useState('');
  const [loanRemaining, setLoanRemaining] = useState('');
  const [loanEmi, setLoanEmi] = useState('');
  const [loanDueDate, setLoanDueDate] = useState('');
  const [loanNotes, setLoanNotes] = useState('');

  const [showCardBillModal, setShowCardBillModal] = useState(false);
  const [editingCardBill, setEditingCardBill] = useState<CreditCard | null>(null);
  const [cardBillAmount, setCardBillAmount] = useState('');
  const [cardDueDate, setCardDueDate] = useState('');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);

  const filteredCards = cards.filter(c => {
    const q = search.toLowerCase();
    return c.cardName.toLowerCase().includes(q) ||
      c.cardNumber.includes(q) ||
      c.nameOnCard.toLowerCase().includes(q) ||
      c.cardType.toLowerCase().includes(q);
  });

  const activeCard = filteredCards[activeIndex] || filteredCards[0];

  const handleCopy = (label: string) => {
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2500);
  };

  const copyToClipboard = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    handleCopy(label);
  };

  const handleDeleteCard = (cardId: string, cardName: string) => {
    const doDelete = () => {
      removeCard(cardId);
      setActiveIndex(0);
    };
    if (Platform.OS === 'web') {
      if (confirm(`Remove "${cardName}"?`)) doDelete();
    } else {
      Alert.alert('Remove Card', `Remove "${cardName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.value = e.nativeEvent.contentOffset.x;
    const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    if (idx !== activeIndex && idx >= 0 && idx < filteredCards.length) {
      setActiveIndex(idx);
      setShowCvv(false);
    }
  }, [activeIndex, filteredCards.length]);

  const renderCard = useCallback(({ item, index }: { item: any; index: number }) => (
    <AnimatedCard
      card={item}
      index={index}
      scrollX={scrollX}
      totalCards={filteredCards.length}
      onCopy={handleCopy}
      onEdit={() => router.push({ pathname: '/edit-card', params: { cardId: item.id } })}
      onDelete={() => handleDeleteCard(item.id, item.cardName)}
    />
  ), [filteredCards.length]);

  // Account form actions
  const openAccountModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setAccountName(account.name);
      setAccountType(account.type);
      setAccountBalance(account.balance ? account.balance.toString() : '');
      setAccountNotes(account.notes || '');
    } else {
      setEditingAccount(null);
      setAccountName('');
      setAccountType('BANK');
      setAccountBalance('');
      setAccountNotes('');
    }
    setShowAddAccountModal(true);
  };

  const handleSaveAccount = async () => {
    if (!accountName.trim()) {
      Alert.alert('Required', 'Please enter an account or cash source name.');
      return;
    }
    const val = parseFloat(accountBalance) || 0;
    if (editingAccount) {
      await updateAccount({
        ...editingAccount,
        name: accountName.trim(),
        type: accountType,
        balance: val,
        notes: accountNotes.trim(),
      });
    } else {
      await addAccount({
        name: accountName.trim(),
        type: accountType,
        balance: val,
        notes: accountNotes.trim(),
      });
    }
    setShowAddAccountModal(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteAccount = (acc: Account) => {
    const doDelete = () => removeAccount(acc.id);
    if (Platform.OS === 'web') {
      if (confirm(`Remove account "${acc.name}"?`)) doDelete();
    } else {
      Alert.alert('Remove Account', `Remove "${acc.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // Loan form actions
  const openLoanModal = (loan?: Loan) => {
    if (loan) {
      setEditingLoan(loan);
      setLoanName(loan.name);
      setLoanType(loan.type);
      setLoanTotal(loan.totalAmount ? loan.totalAmount.toString() : '');
      setLoanRemaining(loan.remainingAmount ? loan.remainingAmount.toString() : '');
      setLoanEmi(loan.emiAmount ? loan.emiAmount.toString() : '');
      setLoanDueDate(loan.monthlyDueDate ? loan.monthlyDueDate.toString() : '');
      setLoanNotes(loan.notes || '');
    } else {
      setEditingLoan(null);
      setLoanName('');
      setLoanType('PERSONAL');
      setLoanTotal('');
      setLoanRemaining('');
      setLoanEmi('');
      setLoanDueDate('');
      setLoanNotes('');
    }
    setShowAddLoanModal(true);
  };

  const handleSaveLoan = async () => {
    if (!loanName.trim()) {
      Alert.alert('Required', 'Please enter a loan name / provider.');
      return;
    }
    const rem = parseFloat(loanRemaining) || 0;
    const tot = parseFloat(loanTotal) || rem;
    const emi = loanEmi ? parseFloat(loanEmi) : undefined;
    const dueDay = loanDueDate ? parseInt(loanDueDate, 10) : undefined;

    if (editingLoan) {
      await updateLoan({
        ...editingLoan,
        name: loanName.trim(),
        type: loanType,
        totalAmount: tot,
        remainingAmount: rem,
        emiAmount: emi,
        monthlyDueDate: dueDay,
        notes: loanNotes.trim(),
      });
    } else {
      await addLoan({
        name: loanName.trim(),
        type: loanType,
        totalAmount: tot,
        remainingAmount: rem,
        emiAmount: emi,
        monthlyDueDate: dueDay,
        notes: loanNotes.trim(),
      });
    }
    setShowAddLoanModal(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteLoan = (loan: Loan) => {
    const doDelete = () => removeLoan(loan.id);
    if (Platform.OS === 'web') {
      if (confirm(`Remove loan "${loan.name}"?`)) doDelete();
    } else {
      Alert.alert('Remove Loan', `Remove "${loan.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // Card Bill actions
  const openCardBillModal = (card: CreditCard) => {
    setEditingCardBill(card);
    setCardBillAmount(card.currentBill ? card.currentBill.toString() : '');
    setCardDueDate(card.billDueDate ? new Date(card.billDueDate).getDate().toString() : '');
    setShowCardBillModal(true);
  };

  const handleSaveCardBill = async () => {
    if (!editingCardBill) return;
    const bill = parseFloat(cardBillAmount) || 0;
    await updateCard({
      ...editingCardBill,
      currentBill: bill,
    });
    setShowCardBillModal(false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const totalDebtsAndDues = totalCreditCardsDue + totalLoansRemaining;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={styles.title}>Finances</Text>
          <Text style={styles.subtitle}>Accounts, Cards & Liabilities</Text>
        </View>

        {activeSection !== 'overview' && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveSection('overview');
            }}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={18} color={Colors.white} />
            <Text style={styles.backButtonText}>Overview</Text>
          </Pressable>
        )}
      </View>

      {copiedLabel && (
        <View style={styles.copiedToast}>
          <Icon name="checkmark-circle" size={16} color="#000" />
          <Text style={styles.copiedToastText}>{copiedLabel} copied</Text>
        </View>
      )}

      {/* OVERVIEW MODE */}
      {activeSection === 'overview' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          {/* Net Liquidity Hero Card */}
          <NeoPopCard color={Colors.surface} depth={3} style={{ marginBottom: 16 }}>
            <View style={styles.heroCard}>
              <Text style={styles.heroTitle}>NET LIQUIDITY</Text>
              <View style={styles.heroRow}>
                <View style={styles.heroCol}>
                  <Text style={styles.heroLabel}>AVAILABLE CASH</Text>
                  <Text style={[styles.heroAmount, { color: Colors.positive }]}>
                    {formatCurrency(totalCashAndAccounts)}
                  </Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroCol}>
                  <Text style={styles.heroLabel}>BILLS & DUES</Text>
                  <Text style={[styles.heroAmount, { color: totalDebtsAndDues > 0 ? Colors.negative : Colors.textMuted }]}>
                    {formatCurrency(totalDebtsAndDues)}
                  </Text>
                </View>
              </View>
            </View>
          </NeoPopCard>

          {/* 3 Dedicated Interactive Sections */}

          {/* 1. ACCOUNTS & CASH */}
          <Pressable
            style={styles.sectionCardPressable}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveSection('accounts');
            }}
          >
            <NeoPopCard color="#141414" depth={3} borderColor="#282828">
              <View style={styles.sectionInnerCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.iconCircle, { backgroundColor: '#13281C' }]}>
                      <Icon name="wallet" size={20} color={Colors.positive} />
                    </View>
                    <View>
                      <Text style={styles.sectionCardTitle}>ACCOUNTS & CASH</Text>
                      <Text style={styles.sectionCardSubtitle}>
                        {accounts.length === 0 ? 'No accounts added' : `${accounts.length} ${accounts.length === 1 ? 'source' : 'sources'}`}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={18} color={Colors.textMuted} />
                </View>

                <View style={styles.sectionAmountRow}>
                  <Text style={[styles.sectionAmountText, { color: Colors.positive }]}>
                    {formatCurrency(totalCashAndAccounts)}
                  </Text>
                  <Pressable
                    style={styles.quickAddBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      openAccountModal();
                    }}
                  >
                    <Icon name="add" size={14} color="#000" />
                    <Text style={styles.quickAddBtnText}>Add Account</Text>
                  </Pressable>
                </View>
              </View>
            </NeoPopCard>
          </Pressable>

          {/* 2. CREDIT CARDS */}
          <Pressable
            style={styles.sectionCardPressable}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveSection('cards');
            }}
          >
            <NeoPopCard color="#141414" depth={3} borderColor="#282828">
              <View style={styles.sectionInnerCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.iconCircle, { backgroundColor: '#2B1414' }]}>
                      <Icon name="card" size={20} color={Colors.negative} />
                    </View>
                    <View>
                      <Text style={styles.sectionCardTitle}>CREDIT CARDS</Text>
                      <Text style={styles.sectionCardSubtitle}>
                        {cards.length === 0 ? 'No cards added' : `${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={18} color={Colors.textMuted} />
                </View>

                <View style={styles.sectionAmountRow}>
                  <View>
                    <Text style={[styles.sectionAmountText, { color: totalCreditCardsDue > 0 ? Colors.negative : Colors.textSecondary }]}>
                      {formatCurrency(totalCreditCardsDue)}
                    </Text>
                    <Text style={styles.sectionAmountSubtext}>Total statement bills</Text>
                  </View>
                  <Pressable
                    style={styles.quickAddBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push('/add-card');
                    }}
                  >
                    <Icon name="add" size={14} color="#000" />
                    <Text style={styles.quickAddBtnText}>Add Card</Text>
                  </Pressable>
                </View>
              </View>
            </NeoPopCard>
          </Pressable>

          {/* 3. LOANS & EMI */}
          <Pressable
            style={styles.sectionCardPressable}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveSection('loans');
            }}
          >
            <NeoPopCard color="#141414" depth={3} borderColor="#282828">
              <View style={styles.sectionInnerCard}>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.iconCircle, { backgroundColor: '#282313' }]}>
                      <Icon name="business" size={20} color="#F59E0B" />
                    </View>
                    <View>
                      <Text style={styles.sectionCardTitle}>LOANS & EMI</Text>
                      <Text style={styles.sectionCardSubtitle}>
                        {loans.length === 0 ? 'No active loans' : `${loans.length} active`}
                      </Text>
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={18} color={Colors.textMuted} />
                </View>

                <View style={styles.sectionAmountRow}>
                  <View>
                    <Text style={[styles.sectionAmountText, { color: totalLoansRemaining > 0 ? '#F59E0B' : Colors.textSecondary }]}>
                      {formatCurrency(totalLoansRemaining)}
                    </Text>
                    <Text style={styles.sectionAmountSubtext}>Remaining principal</Text>
                  </View>
                  <Pressable
                    style={styles.quickAddBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      openLoanModal();
                    }}
                  >
                    <Icon name="add" size={14} color="#000" />
                    <Text style={styles.quickAddBtnText}>Add Loan</Text>
                  </Pressable>
                </View>
              </View>
            </NeoPopCard>
          </Pressable>
        </ScrollView>
      )}

      {/* ACCOUNTS DETAILED VIEW */}
      {activeSection === 'accounts' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={styles.subHeaderRow}>
            <View>
              <Text style={styles.subHeaderTitle}>Cash & Bank Accounts</Text>
              <Text style={styles.subHeaderSubtitle}>Manage liquid assets and in-hand cash</Text>
            </View>
            <Pressable style={styles.addPillBtn} onPress={() => openAccountModal()}>
              <Icon name="add" size={16} color="#000" />
              <Text style={styles.addPillText}>New Account</Text>
            </Pressable>
          </View>

          {accounts.length === 0 ? (
            <View style={styles.emptyDetailState}>
              <Icon name="wallet-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyDetailText}>No accounts added yet</Text>
              <Text style={styles.emptyDetailSubtext}>Add your bank accounts, cash in wallet, or UPI balances</Text>
              <Pressable style={styles.emptyCtaBtn} onPress={() => openAccountModal()}>
                <Text style={styles.emptyCtaText}>+ ADD CASH / BANK ACCOUNT</Text>
              </Pressable>
            </View>
          ) : (
            accounts.map((acc) => (
              <View key={acc.id} style={{ marginBottom: 12 }}>
                <NeoPopCard color="#161616" depth={2} borderColor="#282828">
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.itemName}>{acc.name}</Text>
                        <View style={styles.itemTypeBadge}>
                          <Text style={styles.itemTypeBadgeText}>{acc.type}</Text>
                        </View>
                      </View>
                      {acc.notes ? <Text style={styles.itemNotes}>{acc.notes}</Text> : null}
                    </View>

                    <View style={styles.itemRight}>
                      <Text style={[styles.itemAmount, { color: Colors.positive }]}>
                        {formatCurrency(acc.balance)}
                      </Text>
                      <View style={styles.itemActions}>
                        <Pressable onPress={() => openAccountModal(acc)} style={styles.actionIconBtn}>
                          <Icon name="create-outline" size={16} color={Colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteAccount(acc)} style={styles.actionIconBtn}>
                          <Icon name="trash-outline" size={16} color={Colors.negative} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </NeoPopCard>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* CARDS DETAILED VIEW */}
      {activeSection === 'cards' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={styles.subHeaderRow}>
            <View>
              <Text style={styles.subHeaderTitle}>Credit Cards & Dues</Text>
              <Text style={styles.subHeaderSubtitle}>Cards, monthly bills and due dates</Text>
            </View>
            <Pressable style={styles.addPillBtn} onPress={() => router.push('/add-card')}>
              <Icon name="add" size={16} color="#000" />
              <Text style={styles.addPillText}>New Card</Text>
            </Pressable>
          </View>

          {filteredCards.length === 0 ? (
            <View style={styles.emptyDetailState}>
              <Icon name="card-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyDetailText}>No credit cards added</Text>
              <Text style={styles.emptyDetailSubtext}>Add your credit cards to track bills and securely save card details</Text>
              <Pressable style={styles.emptyCtaBtn} onPress={() => router.push('/add-card')}>
                <Text style={styles.emptyCtaText}>+ ADD CREDIT CARD</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Carousel */}
              <FlatList
                data={filteredCards}
                keyExtractor={(item) => item.id}
                renderItem={renderCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: SIDE_PADDING, marginVertical: 10 }}
                onScroll={onScroll}
                scrollEventThrottle={16}
                getItemLayout={(_, index) => ({
                  length: CARD_WIDTH,
                  offset: CARD_WIDTH * index,
                  index,
                })}
              />

              {/* Dots */}
              <View style={styles.dots}>
                {filteredCards.map((_, i) => (
                  <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
                ))}
              </View>

              {/* Active Card Bills & Quick Actions */}
              {activeCard && (
                <View style={styles.hubContainer}>
                  {/* Bill Card */}
                  <NeoPopCard color="#1E1414" depth={2} borderColor="#381D1D" style={{ marginBottom: 16 }}>
                    <View style={styles.billCardRow}>
                      <View>
                        <Text style={styles.billLabel}>CURRENT STATEMENT BILL</Text>
                        <Text style={[styles.billAmount, { color: Colors.negative }]}>
                          {activeCard.currentBill ? formatCurrency(activeCard.currentBill) : '₹0.00'}
                        </Text>
                      </View>
                      <Pressable style={styles.editBillBtn} onPress={() => openCardBillModal(activeCard)}>
                        <Icon name="create-outline" size={14} color="#000" />
                        <Text style={styles.editBillBtnText}>Set Bill</Text>
                      </Pressable>
                    </View>
                  </NeoPopCard>

                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionHeading}>CARD DETAILS (TAP TO COPY)</Text>
                  </View>

                  <View style={styles.quickTilesRow}>
                    <Pressable
                      style={styles.quickTile}
                      onPress={() => copyToClipboard(activeCard.cardNumber, 'Card number')}
                    >
                      <View style={styles.tileTop}>
                        <Icon name="card-outline" size={16} color={Colors.primary} />
                        <Icon name="copy-outline" size={13} color={Colors.textMuted} />
                      </View>
                      <Text style={styles.tileValue} numberOfLines={1}>
                        •••• {activeCard.cardNumber.replace(/\s/g, '').slice(-4)}
                      </Text>
                      <Text style={styles.tileLabel}>CARD NUMBER</Text>
                    </Pressable>

                    <Pressable
                      style={styles.quickTile}
                      onPress={() => {
                        setShowCvv(true);
                        copyToClipboard(activeCard.cvv, 'CVV');
                        setTimeout(() => setShowCvv(false), 4000);
                      }}
                    >
                      <View style={styles.tileTop}>
                        <Icon name={showCvv ? "eye-outline" : "eye-off-outline"} size={16} color={Colors.primary} />
                        <Icon name="copy-outline" size={13} color={Colors.textMuted} />
                      </View>
                      <Text style={styles.tileValue}>{showCvv ? activeCard.cvv : '•••'}</Text>
                      <Text style={styles.tileLabel}>CVV</Text>
                    </Pressable>

                    <Pressable
                      style={styles.quickTile}
                      onPress={() => copyToClipboard(activeCard.expiry, 'Expiry')}
                    >
                      <View style={styles.tileTop}>
                        <Icon name="calendar-outline" size={16} color={Colors.primary} />
                        <Icon name="copy-outline" size={13} color={Colors.textMuted} />
                      </View>
                      <Text style={styles.tileValue}>{activeCard.expiry}</Text>
                      <Text style={styles.tileLabel}>EXPIRY</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* LOANS DETAILED VIEW */}
      {activeSection === 'loans' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={styles.subHeaderRow}>
            <View>
              <Text style={styles.subHeaderTitle}>Loans & EMIs</Text>
              <Text style={styles.subHeaderSubtitle}>Track borrowings, gadget EMIs and repayments</Text>
            </View>
            <Pressable style={styles.addPillBtn} onPress={() => openLoanModal()}>
              <Icon name="add" size={16} color="#000" />
              <Text style={styles.addPillText}>New Loan</Text>
            </Pressable>
          </View>

          {loans.length === 0 ? (
            <View style={styles.emptyDetailState}>
              <Icon name="business-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyDetailText}>No active loans</Text>
              <Text style={styles.emptyDetailSubtext}>Track personal loans, gadget EMIs, education, or vehicle loans</Text>
              <Pressable style={styles.emptyCtaBtn} onPress={() => openLoanModal()}>
                <Text style={styles.emptyCtaText}>+ ADD LOAN OR EMI</Text>
              </Pressable>
            </View>
          ) : (
            loans.map((loan) => (
              <View key={loan.id} style={{ marginBottom: 12 }}>
                <NeoPopCard color="#161616" depth={2} borderColor="#282828">
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.itemName}>{loan.name}</Text>
                        <View style={[styles.itemTypeBadge, { borderColor: '#F59E0B' }]}>
                          <Text style={[styles.itemTypeBadgeText, { color: '#F59E0B' }]}>{loan.type}</Text>
                        </View>
                      </View>
                      {loan.emiAmount ? (
                        <Text style={styles.itemNotes}>
                          EMI: {formatCurrency(loan.emiAmount)}
                          {loan.monthlyDueDate ? ` (Due on ${loan.monthlyDueDate}th)` : ''}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.itemRight}>
                      <Text style={[styles.itemAmount, { color: '#F59E0B' }]}>
                        {formatCurrency(loan.remainingAmount)}
                      </Text>
                      <View style={styles.itemActions}>
                        <Pressable onPress={() => openLoanModal(loan)} style={styles.actionIconBtn}>
                          <Icon name="create-outline" size={16} color={Colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteLoan(loan)} style={styles.actionIconBtn}>
                          <Icon name="trash-outline" size={16} color={Colors.negative} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </NeoPopCard>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ACCOUNT MODAL */}
      <Modal
        visible={showAddAccountModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddAccountModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingAccount ? 'Edit Account' : 'Add Cash / Bank Account'}</Text>
              <Pressable onPress={() => setShowAddAccountModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14, paddingVertical: 12 }}>
              <View>
                <Text style={styles.inputLabel}>ACCOUNT / CASH SOURCE NAME *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. HDFC Salary, Cash in Hand, SBI"
                  placeholderTextColor={Colors.textMuted}
                  value={accountName}
                  onChangeText={setAccountName}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>TYPE</Text>
                <View style={styles.typeSelectorRow}>
                  {(['BANK', 'CASH', 'WALLET', 'OTHER'] as AccountType[]).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setAccountType(t)}
                      style={[styles.typePill, accountType === t && styles.typePillActive]}
                    >
                      <Text style={[styles.typePillText, accountType === t && styles.typePillTextActive]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>CURRENT BALANCE (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={accountBalance}
                  onChangeText={setAccountBalance}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>NOTES (OPTIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Additional remarks..."
                  placeholderTextColor={Colors.textMuted}
                  value={accountNotes}
                  onChangeText={setAccountNotes}
                />
              </View>

              <Pressable style={styles.saveSubmitBtn} onPress={handleSaveAccount}>
                <Text style={styles.saveSubmitBtnText}>{editingAccount ? 'SAVE CHANGES' : 'CREATE ACCOUNT'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* LOAN MODAL */}
      <Modal
        visible={showAddLoanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddLoanModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingLoan ? 'Edit Loan / EMI' : 'Add Loan / EMI'}</Text>
              <Pressable onPress={() => setShowAddLoanModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 14, paddingVertical: 12 }}>
              <View>
                <Text style={styles.inputLabel}>LOAN / EMI NAME *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. iPhone EMI, HDFC Personal Loan"
                  placeholderTextColor={Colors.textMuted}
                  value={loanName}
                  onChangeText={setLoanName}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>LOAN TYPE</Text>
                <View style={styles.typeSelectorRow}>
                  {(['PERSONAL', 'EMI', 'HOME', 'VEHICLE', 'OTHER'] as LoanType[]).map((t) => (
                    <Pressable
                      key={t}
                      onPress={() => setLoanType(t)}
                      style={[styles.typePill, loanType === t && styles.typePillActive]}
                    >
                      <Text style={[styles.typePillText, loanType === t && styles.typePillTextActive]}>{t}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>REMAINING BALANCE TO PAY (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={loanRemaining}
                  onChangeText={setLoanRemaining}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>MONTHLY EMI (₹)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 5000"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={loanEmi}
                    onChangeText={setLoanEmi}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>DUE DAY OF MONTH</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 5 (5th)"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={loanDueDate}
                    onChangeText={setLoanDueDate}
                  />
                </View>
              </View>

              <Pressable style={styles.saveSubmitBtn} onPress={handleSaveLoan}>
                <Text style={styles.saveSubmitBtnText}>{editingLoan ? 'SAVE CHANGES' : 'CREATE LOAN'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CARD BILL MODAL */}
      <Modal
        visible={showCardBillModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCardBillModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Card Statement Bill</Text>
              <Pressable onPress={() => setShowCardBillModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            <View style={{ gap: 14, paddingVertical: 12 }}>
              <Text style={styles.sectionSub}>Update the current statement due for {editingCardBill?.cardName}:</Text>
              <View>
                <Text style={styles.inputLabel}>BILL AMOUNT (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 3600"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  value={cardBillAmount}
                  onChangeText={setCardBillAmount}
                  autoFocus
                />
              </View>

              <Pressable style={styles.saveSubmitBtn} onPress={handleSaveCardBill}>
                <Text style={styles.saveSubmitBtnText}>UPDATE BILL</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#333333',
  },
  backButtonText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.white,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'web' ? 84 + 34 : 100,
  },
  heroCard: {
    padding: 18,
  },
  heroTitle: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroCol: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  heroDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 16,
  },
  sectionCardPressable: {
    marginBottom: 14,
  },
  sectionInnerCard: {
    padding: 16,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircle: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionCardTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 1,
  },
  sectionCardSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  sectionAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  sectionAmountText: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  sectionAmountSubtext: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  quickAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    boxShadow: '2px 2px 0px #FFFFFF',
  },
  quickAddBtnText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 0.5,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subHeaderTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  subHeaderSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addPillText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#000000',
  },
  emptyDetailState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#222222',
  },
  emptyDetailText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginTop: 12,
  },
  emptyDetailSubtext: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyCtaBtn: {
    marginTop: 18,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyCtaText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 0.8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  itemTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.positive,
  },
  itemTypeBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.positive,
  },
  itemNotes: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemAmount: {
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIconBtn: {
    padding: 4,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    width: 6,
    height: 6,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 18,
  },
  hubContainer: {
    marginTop: 8,
  },
  billCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  billLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  billAmount: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    marginTop: 4,
  },
  editBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBillBtnText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#000',
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  quickTilesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickTile: {
    flex: 1,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    padding: 10,
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tileValue: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 2,
  },
  tileLabel: {
    fontSize: 8,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  copiedToast: {
    position: 'absolute',
    top: 54,
    alignSelf: 'center',
    zIndex: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 8,
  },
  copiedToastText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 0.5,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161616',
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#303030',
    color: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.regular,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#333333',
    backgroundColor: '#121212',
  },
  typePillActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(229, 254, 64, 0.1)',
  },
  typePillText: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
  },
  typePillTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.bold,
  },
  saveSubmitBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    boxShadow: '3px 3px 0px #FFFFFF',
  },
  saveSubmitBtnText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
});
