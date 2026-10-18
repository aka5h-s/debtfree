import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  Platform,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/Icon';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { formatCurrency, getProminentCardColor, getProminentCardGradient } from '@/lib/formatters';
import { Fonts } from '@/lib/fonts';
import type { AccountType, LoanType, Account, Loan, CreditCard } from '@/lib/types';
import { AccountDetailView } from '@/components/AccountDetailView';
import { CardNetworkSymbol } from '@/components/CardNetworkSymbol';
import { AccountLogoBadge } from '@/components/AccountLogoBadge';

// ==========================================
// 1. CASH & ACCOUNTS MODAL
// ==========================================
interface AccountsModalProps {
  visible: boolean;
  onClose: () => void;
}

const ACCOUNT_TYPES: { type: AccountType; label: string; shortLabel: string; subLabel: string; icon: string }[] = [
  { type: 'BANK', label: 'Bank Account', shortLabel: 'Bank', subLabel: 'Savings / Salary', icon: 'bank' },
  { type: 'CASH', label: 'Cash in Hand', shortLabel: 'Cash', subLabel: 'Physical currency', icon: 'cash' },
  { type: 'WALLET', label: 'Digital Wallet', shortLabel: 'Wallet', subLabel: 'UPI / Prepaid app', icon: 'wallet' },
  { type: 'OTHER', label: 'Other Funds', shortLabel: 'Other', subLabel: 'Liquid reserve', icon: 'menu' },
];

export function AccountsModal({ visible, onClose }: AccountsModalProps) {
  const { accounts, totalCashAndAccounts, addAccount, removeAccount } = useData();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [balance, setBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  const handleClose = () => {
    setSelectedAccountId(null);
    setShowAddForm(false);
    onClose();
  };

  const handleSaveAccount = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter account or wallet name');
      return;
    }
    const numBalance = parseFloat(balance.replace(/,/g, '')) || 0;
    try {
      setIsSubmitting(true);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const created = await addAccount({
        name: name.trim(),
        type,
        balance: numBalance,
        notes: notes.trim() || undefined,
      });
      setName('');
      setBalance('');
      setNotes('');
      setShowAddForm(false);
      setSelectedAccountId(null);
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Failed to save account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, accName: string) => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to remove "${accName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await removeAccount(id);
            if (selectedAccountId === id) {
              setSelectedAccountId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          {selectedAccount ? (
            <View style={{ flex: 1 }}>
              <AccountDetailView
                account={selectedAccount}
                onBack={() => setSelectedAccountId(null)}
                onDeleteAccount={(id, accName) => {
                  handleDelete(id, accName);
                }}
              />
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={styles.headerTitleRow}>
                  <View style={[styles.iconCircle, { backgroundColor: '#18181D' }]}>
                    <Icon name="wallet" size={15} color="#FFFFFF" />
                  </View>
                  <Text style={styles.sheetTitle}>CASH & ACCOUNTS</Text>
                </View>
                <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={10}>
                  <Icon name="close" size={20} color="#8E8E93" />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.sheetScroll, showAddForm && { paddingBottom: 320 }]}
                automaticallyAdjustKeyboardInsets={true}
                keyboardShouldPersistTaps="handled"
              >
              {/* Total Cash Summary Banner */}
              <LinearGradient
                colors={['#0E442B', '#082D1D', '#03170F']}
                start={{ x: 0.1, y: 0.1 }}
                end={{ x: 0.9, y: 0.9 }}
                style={styles.summaryBanner}
              >
                <Text style={styles.summaryBannerLabel}>TOTAL LIQUID CASH & ACCOUNTS</Text>
                <Text style={styles.summaryBannerAmount}>
                  ₹{totalCashAndAccounts.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={styles.summaryBannerSubtext}>
                  {accounts.length} active account{accounts.length === 1 ? '' : 's'} / wallet{accounts.length === 1 ? '' : 's'}
                </Text>
              </LinearGradient>

              {/* Accounts List */}
              <View style={styles.listSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>SAVED ACCOUNTS</Text>
                  {!showAddForm && (
                    <Pressable
                      style={styles.addSmallBtn}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowAddForm(true);
                      }}
                    >
                      <Icon name="add" size={14} color="#FFFFFF" />
                      <Text style={styles.addSmallBtnText}>ADD NEW</Text>
                    </Pressable>
                  )}
                </View>

                {accounts.length === 0 && !showAddForm ? (
                  <View style={styles.emptyBox}>
                    <Icon name="wallet-outline" size={32} color="#888888" />
                    <Text style={styles.emptyBoxText}>No cash or accounts added yet</Text>
                    <Text style={styles.emptyBoxSubtext}>Track bank balances or cash in hand</Text>
                  </View>
                ) : (
                  accounts.map((acc) => {
                    const isPositive = acc.balance > 0;
                    const subLabel =
                      acc.type === 'BANK'
                        ? 'Bank account'
                        : acc.type === 'CASH'
                        ? 'Cash in hand'
                        : acc.type === 'WALLET'
                        ? 'Digital wallet'
                        : 'Other funds';

                    return (
                      <Pressable
                        key={acc.id}
                        style={styles.bankAccountRowCard}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedAccountId(acc.id);
                        }}
                      >
                        {/* Left: 48x48 Squircle Logo */}
                        <AccountLogoBadge name={acc.name} type={acc.type} size={48} />

                        {/* Middle: Name + Subtitle (clean, no green badge!) */}
                        <View style={styles.bankAccountInfo}>
                          <Text style={styles.bankAccountName} numberOfLines={1}>
                            {acc.name}
                          </Text>
                          <Text style={styles.bankAccountSub}>
                            {subLabel}
                          </Text>
                        </View>

                        {/* Right: Amount + Chevron */}
                        <View style={styles.bankAccountRight}>
                          <Text
                            style={[
                              styles.bankAccountAmount,
                              isPositive ? styles.bankAccountAmountPositive : styles.bankAccountAmountZero,
                            ]}
                          >
                            ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </Text>
                          <Icon name="chevron-forward" size={15} color="#555558" style={{ marginLeft: 8 }} />
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>

              {/* Add Account Inline Form */}
              {showAddForm && (
                <View style={styles.formCard}>
                  <View style={styles.formHeaderRow}>
                    <Text style={styles.formTitle}>ADD CASH / ACCOUNT</Text>
                    <Pressable onPress={() => setShowAddForm(false)} hitSlop={10}>
                      <Icon name="close" size={18} color="#8E8E93" />
                    </Pressable>
                  </View>

                  <Text style={styles.inputLabel}>ACCOUNT NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. HDFC Salary, Wallet Cash, GPay"
                    placeholderTextColor="#555558"
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={styles.inputLabel}>ACCOUNT TYPE</Text>
                  <View style={styles.accountTypeTilesRow}>
                    {ACCOUNT_TYPES.map((t) => {
                      const isSelected = type === t.type;
                      return (
                        <Pressable
                          key={t.type}
                          style={[
                            styles.accountTypeTile,
                            isSelected && styles.accountTypeTileActive,
                          ]}
                          onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setType(t.type);
                          }}
                        >
                          <Icon
                            name={t.icon as any}
                            size={20}
                            color={isSelected ? '#D4FF00' : '#555558'}
                          />
                          <Text
                            style={[
                              styles.accountTypeTileLabel,
                              isSelected && styles.accountTypeTileLabelActive,
                            ]}
                          >
                            {t.shortLabel}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>CURRENT BALANCE (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor="#555558"
                    keyboardType="numeric"
                    value={balance}
                    onChangeText={setBalance}
                  />

                  <Text style={styles.inputLabel}>NOTES (OPTIONAL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Optional notes or bank details"
                    placeholderTextColor="#555558"
                    value={notes}
                    onChangeText={setNotes}
                  />

                  <View style={{ marginTop: 14 }}>
                    <NeoPopTiltedButton onPress={handleSaveAccount} disabled={isSubmitting} color="#00FE9D" plunkColor="#006E46">
                      <Text style={styles.btnText}>{isSubmitting ? 'SAVING...' : 'SAVE ACCOUNT'}</Text>
                    </NeoPopTiltedButton>
                  </View>
                </View>
              )}

              {!showAddForm && accounts.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <NeoPopTiltedButton
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowAddForm(true);
                    }}
                  >
                    <Text style={styles.btnText}>+ ADD ANOTHER ACCOUNT</Text>
                  </NeoPopTiltedButton>
                </View>
              )}
            </ScrollView>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  </Modal>
);
}

// ==========================================
// 2. CREDIT CARDS & BILLS MODAL
// ==========================================
interface CreditCardsModalProps {
  visible: boolean;
  onClose: () => void;
}

function getCardTabColor(cardName: string, cardType?: string): string {
  const name = (cardName || '').toLowerCase().trim();
  if (name.includes('kiwi') || name.includes('slice')) return '#D4FF00'; // Neon lime
  if (name.includes('subhashree') || name.includes('hdfc')) return '#FB7185'; // Coral pink
  if (name.includes('axis') || name.includes('myzone')) return '#E2E8F0'; // Off-white / Silver
  if (name.includes('icici')) return '#F87171'; // Red
  if (name.includes('sbi') || name.includes('state bank')) return '#60A5FA'; // Sapphire Blue
  if (name.includes('kotak')) return '#F43F5E'; // Rose
  if (name.includes('amex') || name.includes('american')) return '#2DD4BF'; // Teal
  if (name.includes('tata') || name.includes('neu')) return '#C084FC'; // Purple
  if (name.includes('swiggy') || name.includes('baroda')) return '#FB923C'; // Orange
  return '#E2E8F0';
}

export function CreditCardsModal({ visible, onClose }: CreditCardsModalProps) {
  const { cards, totalCreditCardsDue, updateCard } = useData();
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [billAmount, setBillAmount] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCards = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.cardName.toLowerCase().includes(q) ||
        c.cardNumber.replace(/\s/g, '').includes(q) ||
        (c.nameOnCard && c.nameOnCard.toLowerCase().includes(q))
    );
  }, [cards, search]);

  const startEditBill = (card: CreditCard) => {
    setEditingCardId(card.id);
    setBillAmount(card.currentBill ? String(card.currentBill) : '');
  };

  const handleSaveBill = async (card: CreditCard) => {
    const numBill = parseFloat(billAmount.replace(/,/g, '')) || 0;
    try {
      setIsUpdating(true);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateCard({
        ...card,
        currentBill: numBill,
        billDueDate: null,
      });
      setEditingCardId(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to update card bill');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkPaid = async (card: CreditCard) => {
    try {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updateCard({
        ...card,
        currentBill: 0,
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to mark card as paid');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          {/* Header - Classic Serif Title & Subtitle */}
          <View style={styles.modernCardsHeader}>
            <View>
              <Text style={styles.modernCardsTitle}>Credit Cards</Text>
              <Text style={styles.modernCardsSub}>Your outstanding on each card</Text>
            </View>
            <Pressable onPress={onClose} style={styles.modernCloseBtn} hitSlop={12}>
              <Icon name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.cardsModalScroll, editingCardId ? { paddingBottom: 320 } : null]}
            automaticallyAdjustKeyboardInsets={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* Glowing Neon Top Summary Card */}
            <View style={styles.summaryCardWrapper}>
              <LinearGradient
                colors={['#D4FF00', '#A3E635', 'transparent']}
                start={{ x: 1, y: 0 }}
                end={{ x: 0.15, y: 0.85 }}
                style={styles.summaryOrb}
              />

              <View style={styles.summaryCardContent}>
                <View style={styles.summaryLeftCol}>
                  <Text style={styles.summaryColLabel}>TOTAL CREDIT CARD DEBT</Text>
                  <Text style={styles.summaryColAmount}>
                    ₹{Math.round(totalCreditCardsDue).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.summaryColDivider} />

                <View style={styles.summaryRightCol}>
                  <Text style={styles.summaryColLabel}>TOTAL CARDS</Text>
                  <Text style={styles.summaryColCount}>{cards.length}</Text>
                </View>
              </View>
            </View>

            {/* Search Box */}
            <View style={styles.searchBarBox}>
              <Icon name="search" size={16} color="#777777" />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search cards..."
                placeholderTextColor="#666666"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <Icon name="close-circle" size={16} color="#777777" />
                </Pressable>
              )}
            </View>

            {/* Section Heading */}
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleText}>MY CARDS</Text>
            </View>

            {/* Cards List */}
            {filteredCards.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="search-outline" size={32} color="#888888" />
                <Text style={styles.emptyBoxText}>No matching cards</Text>
                <Text style={styles.emptyBoxSubtext}>Try a different search term or digits</Text>
              </View>
            ) : (
              filteredCards.map((card) => {
                const isEditing = editingCardId === card.id;
                const hasBill = (card.currentBill || 0) > 0;
                const tabColor = getCardTabColor(card.cardName, card.cardType);

                return (
                  <View key={card.id} style={styles.cardRowContainer}>
                    <Pressable
                      style={styles.cardItemRow}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onClose();
                        router.push('/cards');
                      }}
                    >
                      {/* Left Colored Capsule Pill Tab */}
                      <View style={[styles.cardItemTab, { backgroundColor: tabColor }]} />

                      {/* Card Name */}
                      <Text style={styles.cardItemName} numberOfLines={1}>
                        {card.cardName}
                      </Text>

                      {/* Outstanding Bill Amount */}
                      <Text style={styles.cardItemAmount}>
                        ₹{Math.round(card.currentBill || 0).toLocaleString('en-IN')}
                      </Text>

                      {/* Action Button: + to Add Bill, ✓ to Mark as Paid */}
                      {hasBill ? (
                        <Pressable
                          style={styles.actionCirclePaid}
                          hitSlop={10}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleMarkPaid(card);
                          }}
                        >
                          <Icon name="checkmark" size={13} color="#D4FF00" />
                        </Pressable>
                      ) : (
                        <Pressable
                          style={styles.actionCircleAdd}
                          hitSlop={10}
                          onPress={(e) => {
                            e.stopPropagation();
                            startEditBill(card);
                          }}
                        >
                          <Icon name="add" size={14} color="#E0E0E0" />
                        </Pressable>
                      )}

                      {/* Subtle Forward Chevron */}
                      <Icon name="chevron-forward" size={14} color="#555555" style={{ marginLeft: 10 }} />
                    </Pressable>

                    {/* Inline Set Bill Box (Opens smoothly when + is pressed) */}
                    {isEditing && (
                      <View style={styles.inlineEditCardBox}>
                        <Text style={styles.inlineEditLabel}>
                          ADD BILL FOR {card.cardName.toUpperCase()}
                        </Text>
                        <View style={styles.inlineEditRow}>
                          <Text style={styles.inlineEditCurrency}>₹</Text>
                          <TextInput
                            style={styles.inlineEditInput}
                            placeholder="0"
                            placeholderTextColor="#666666"
                            keyboardType="numeric"
                            value={billAmount}
                            onChangeText={setBillAmount}
                            autoFocus
                          />
                          <Pressable
                            style={styles.inlineEditCancelBtn}
                            onPress={() => setEditingCardId(null)}
                            hitSlop={8}
                          >
                            <Text style={styles.inlineEditCancelText}>CANCEL</Text>
                          </Pressable>
                          <Pressable
                            style={styles.inlineEditSaveBtn}
                            onPress={() => handleSaveBill(card)}
                            disabled={isUpdating}
                          >
                            <Text style={styles.inlineEditSaveText}>
                              {isUpdating ? '...' : 'SAVE'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Optional Vault CTA at bottom */}
            {cards.length > 0 && (
              <View style={{ marginHorizontal: 20, marginTop: 14, marginBottom: 20 }}>
                <NeoPopTiltedButton
                  onPress={() => {
                    onClose();
                    router.push('/cards');
                  }}
                >
                  <Text style={styles.btnText}>OPEN 3D CARDS VAULT</Text>
                </NeoPopTiltedButton>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ==========================================
// 3. LOANS & EMI MODAL (WITH 2 TOGGLES)
// ==========================================
interface LoansModalProps {
  visible: boolean;
  onClose: () => void;
}

const LOAN_TYPES: { type: LoanType; label: string; icon: string }[] = [
  { type: 'PERSONAL', label: 'Personal', icon: 'person-outline' },
  { type: 'EMI', label: 'Gadget / EMI', icon: 'phone-portrait-outline' },
  { type: 'HOME', label: 'Home Loan', icon: 'home-outline' },
  { type: 'VEHICLE', label: 'Vehicle', icon: 'car-outline' },
  { type: 'EDUCATION', label: 'Education', icon: 'school-outline' },
  { type: 'OTHER', label: 'Other', icon: 'alert-circle-outline' },
];

export function LoansModal({ visible, onClose }: LoansModalProps) {
  const {
    loans,
    totalLoansRemaining,
    enableLoans,
    setEnableLoans,
    includeLoansInTotal,
    setIncludeLoansInTotal,
    addLoan,
    removeLoan,
  } = useData();

  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<LoanType>('PERSONAL');
  const [remainingAmount, setRemainingAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [monthlyDueDate, setMonthlyDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalMonthlyEmi = loans.reduce((acc, l) => acc + (Number(l.emiAmount) || 0), 0);

  const handleSaveLoan = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter loan name (e.g. Car EMI, Personal loan)');
      return;
    }
    const numRemaining = parseFloat(remainingAmount.replace(/,/g, '')) || 0;
    const numTotal = parseFloat(totalAmount.replace(/,/g, '')) || numRemaining;
    const numEmi = parseFloat(emiAmount.replace(/,/g, '')) || undefined;
    const numDue = parseInt(monthlyDueDate, 10) || undefined;

    try {
      setIsSubmitting(true);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await addLoan({
        name: name.trim(),
        type,
        remainingAmount: numRemaining,
        totalAmount: numTotal,
        emiAmount: numEmi,
        monthlyDueDate: numDue,
        notes: notes.trim() || undefined,
      });
      setName('');
      setRemainingAmount('');
      setTotalAmount('');
      setEmiAmount('');
      setMonthlyDueDate('');
      setNotes('');
      setShowAddForm(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to save loan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string, loanName: string) => {
    Alert.alert(
      'Delete Loan',
      `Are you sure you want to delete "${loanName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await removeLoan(id);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#451A03' }]}>
                <Icon name="business" size={16} color="#F59E0B" />
              </View>
              <Text style={styles.sheetTitle}>LOANS & EMI MANAGEMENT</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.sheetScroll, showAddForm && { paddingBottom: 320 }]}
            automaticallyAdjustKeyboardInsets={true}
            keyboardShouldPersistTaps="handled"
          >
          {/* THE 2 TOGGLES REQUESTED BY USER */}
          <View style={styles.togglesCard}>
            {/* Toggle 1: Track Active Loans */}
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>Track Active Loans</Text>
                <Text style={styles.toggleSubtitle}>Turn on if you have any active loans or EMIs</Text>
              </View>
              <Switch
                value={enableLoans}
                onValueChange={(val) => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEnableLoans(val);
                }}
                trackColor={{ false: '#262626', true: '#F59E0B' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.toggleDivider} />

            {/* Toggle 2: Show in total expense / net calculation */}
            <View style={[styles.toggleRow, !enableLoans && { opacity: 0.4 }]}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>Include in Total Expense Calculation</Text>
                <Text style={styles.toggleSubtitle}>
                  Turn on to factor loan dues into your net financial calculations
                </Text>
              </View>
              <Switch
                disabled={!enableLoans}
                value={includeLoansInTotal}
                onValueChange={(val) => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIncludeLoansInTotal(val);
                }}
                trackColor={{ false: '#262626', true: Colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* If disabled, show helper banner */}
          {!enableLoans ? (
            <View style={styles.disabledBanner}>
              <Icon name="information-circle-outline" size={20} color={Colors.textMuted} />
              <Text style={styles.disabledBannerText}>
                Loan tracking is currently turned off. Switch on &quot;Track Active Loans&quot; above to view or manage your loans.
              </Text>
            </View>
          ) : (
            <>
              {/* Summary Stats */}
              <View style={styles.loansSummaryRow}>
                <View style={styles.loanSummaryBox}>
                  <Text style={styles.loanSummaryLabel}>OUTSTANDING DEBT</Text>
                  <Text style={[styles.loanSummaryAmount, { color: '#F59E0B' }]}>
                    {formatCurrency(totalLoansRemaining)}
                  </Text>
                  <Text style={styles.loanSummarySub}>
                    {includeLoansInTotal ? 'Included in Net Balance' : 'Excluded from Net Balance'}
                  </Text>
                </View>
                <View style={{ width: 10 }} />
                <View style={styles.loanSummaryBox}>
                  <Text style={styles.loanSummaryLabel}>MONTHLY EMI</Text>
                  <Text style={[styles.loanSummaryAmount, { color: Colors.white }]}>
                    {formatCurrency(totalMonthlyEmi)}
                  </Text>
                  <Text style={styles.loanSummarySub}>
                    Across {loans.length} active loan{loans.length === 1 ? '' : 's'}
                  </Text>
                </View>
              </View>

              {/* Loans List */}
              <View style={styles.listSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeading}>ACTIVE LOANS & EMIS</Text>
                  {!showAddForm && (
                    <Pressable
                      style={styles.addSmallBtn}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowAddForm(true);
                      }}
                    >
                      <Icon name="add" size={14} color={Colors.primary} />
                      <Text style={styles.addSmallBtnText}>ADD LOAN</Text>
                    </Pressable>
                  )}
                </View>

                {loans.length === 0 && !showAddForm ? (
                  <View style={styles.emptyBox}>
                    <Icon name="business-outline" size={32} color={Colors.textMuted} />
                    <Text style={styles.emptyBoxText}>No loans tracked yet</Text>
                    <Text style={styles.emptyBoxSubtext}>Add home loans, vehicle EMIs, or personal debts</Text>
                  </View>
                ) : (
                  loans.map((loan) => (
                    <View key={loan.id} style={styles.itemCard}>
                      <View style={styles.itemLeft}>
                        <View style={[styles.itemIconBox, { backgroundColor: '#2E1A08' }]}>
                          <Icon name="document-text-outline" size={18} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemName}>{loan.name}</Text>
                          <View style={styles.badgeRow}>
                            <Text style={styles.loanTypeBadge}>{loan.type}</Text>
                            {Boolean(loan.monthlyDueDate) && (
                              <Text style={styles.dueDateBadge}>
                                Due: {loan.monthlyDueDate}th of month
                              </Text>
                            )}
                          </View>
                          {Boolean(loan.emiAmount) && (
                            <Text style={styles.emiText}>
                              EMI: <Text style={{ color: Colors.white }}>{formatCurrency(loan.emiAmount!)}/mo</Text>
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.itemRight}>
                        <Text style={[styles.itemAmount, { color: '#F59E0B' }]}>
                          {formatCurrency(loan.remainingAmount)}
                        </Text>
                        <Text style={styles.totalLoanSub}>
                          of {formatCurrency(loan.totalAmount)}
                        </Text>
                        <Pressable
                          onPress={() => handleDelete(loan.id, loan.name)}
                          style={styles.deleteIconButton}
                        >
                          <Icon name="trash-outline" size={16} color={Colors.negative} />
                        </Pressable>
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Add Loan Inline Form */}
              {showAddForm && (
                <View style={styles.formCard}>
                  <View style={styles.formHeaderRow}>
                    <Text style={styles.formTitle}>ADD NEW LOAN / EMI</Text>
                    <Pressable onPress={() => setShowAddForm(false)}>
                      <Icon name="close" size={18} color={Colors.textMuted} />
                    </Pressable>
                  </View>

                  <Text style={styles.inputLabel}>LOAN NAME</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Car Loan, iPhone EMI, Education"
                    placeholderTextColor={Colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />

                  <Text style={styles.inputLabel}>LOAN TYPE</Text>
                  <View style={styles.loanTypeGrid}>
                    {LOAN_TYPES.map((t) => {
                      const isSelected = type === t.type;
                      return (
                        <Pressable
                          key={t.type}
                          style={[styles.neoLoanTile, isSelected && styles.neoLoanTileSelected]}
                          onPress={() => {
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setType(t.type);
                          }}
                        >
                          <Icon
                            name={t.icon as any}
                            size={14}
                            color={isSelected ? '#F59E0B' : '#888894'}
                          />
                          <Text
                            style={[styles.neoLoanLabel, isSelected && styles.neoLoanLabelSelected]}
                            numberOfLines={1}
                          >
                            {t.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>REMAINING OUTSTANDING AMOUNT (₹)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={remainingAmount}
                    onChangeText={setRemainingAmount}
                  />

                  <Text style={styles.inputLabel}>TOTAL SANCTIONED AMOUNT (₹, OPTIONAL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Leave empty if same as remaining"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={totalAmount}
                    onChangeText={setTotalAmount}
                  />

                  <Text style={styles.inputLabel}>MONTHLY EMI AMOUNT (₹, OPTIONAL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 15000"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={emiAmount}
                    onChangeText={setEmiAmount}
                  />

                  <Text style={styles.inputLabel}>MONTHLY DUE DAY (1-31, OPTIONAL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 5"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    value={monthlyDueDate}
                    onChangeText={setMonthlyDueDate}
                  />

                  <Text style={styles.inputLabel}>NOTES (OPTIONAL)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Interest rate, tenure, lender..."
                    placeholderTextColor={Colors.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                  />

                  <View style={{ marginTop: 12 }}>
                    <NeoPopTiltedButton onPress={handleSaveLoan} disabled={isSubmitting}>
                      <Text style={styles.btnText}>{isSubmitting ? 'SAVING...' : 'SAVE LOAN'}</Text>
                    </NeoPopTiltedButton>
                  </View>
                </View>
              )}

              {!showAddForm && loans.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <NeoPopTiltedButton
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowAddForm(true);
                    }}
                  >
                    <Text style={styles.btnText}>+ ADD ANOTHER LOAN</Text>
                  </NeoPopTiltedButton>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);
}

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheetContainer: {
    marginTop: 'auto',
    backgroundColor: '#141414',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '88%',
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderWidth: 1,
    borderColor: '#262626',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 1.2,
  },
  closeBtn: {
    padding: 6,
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  summaryBanner: {
    borderWidth: 1.5,
    borderColor: '#0E5C3B',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryBannerLabel: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    color: '#7BE5B0',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  summaryBannerAmount: {
    fontSize: 28,
    fontFamily: Fonts.serif,
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  summaryBannerSubtext: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#A1A1AA',
  },
  listSection: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 10.5,
    fontFamily: Fonts.bold,
    color: '#71717A',
    letterSpacing: 1.5,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#2E2E38',
  },
  addSmallBtnText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#111114',
    borderWidth: 1,
    borderColor: '#222226',
    borderRadius: 14,
  },
  emptyBoxText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    marginTop: 8,
  },
  emptyBoxSubtext: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#71717A',
    marginTop: 2,
  },
  bankAccountRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111114',
    borderWidth: 1,
    borderColor: '#1E1E22',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
  },
  bankAccountInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  bankAccountName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  bankAccountSub: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#8E8E93',
    marginTop: 3,
  },
  bankAccountRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankAccountAmount: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    letterSpacing: -0.2,
  },
  bankAccountAmountPositive: {
    color: '#00FE9D', // mint green from screenshot
  },
  bankAccountAmountZero: {
    color: '#FFFFFF', // clean white when 0 from screenshot
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111114',
    borderWidth: 1,
    borderColor: '#1E1E22',
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1C1C22',
    borderWidth: 1,
    borderColor: '#2A2A34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  itemTypeBadge: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#8E8E93',
  },
  itemNotes: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#71717A',
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemAmount: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: '#FFFFFF',
  },
  deleteIconButton: {
    padding: 6,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#0F0F12',
    borderWidth: 1,
    borderColor: '#1E1E22',
    padding: 18,
    borderRadius: 14,
    marginTop: 10,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  formTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 1.4,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: '#71717A',
    letterSpacing: 1.4,
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#242428',
    borderRadius: 10,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.medium,
  },
  accountTypeTilesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  accountTypeTile: {
    flex: 1,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#242428',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  accountTypeTileActive: {
    borderWidth: 1.5,
    borderColor: '#D4FF00',
  },
  accountTypeTileLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#666668',
    marginTop: 6,
  },
  accountTypeTileLabelActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.semibold,
  },
  loanTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  neoLoanTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#141418',
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: '#282832',
    borderBottomWidth: 3,
    borderRightWidth: 1.5,
    borderBottomColor: '#000000',
    borderRightColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: '30%',
    flex: 1,
  },
  neoLoanTileSelected: {
    backgroundColor: '#261C08',
    borderColor: '#F59E0B',
  },
  neoLoanLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#8E8E98',
  },
  neoLoanLabelSelected: {
    color: '#FFFFFF',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333333',
  },
  typePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typePillText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
  },
  typePillTextActive: {
    color: '#000000',
    fontFamily: Fonts.bold,
  },
  btnText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  cardHeaderIconBox: {
    width: 28,
    height: 28,
    borderRadius: 2,
    backgroundColor: '#0D1E38',
    borderWidth: 1,
    borderColor: '#1D3B66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBillboardContainer: {
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: '#2F2F34',
    borderBottomWidth: 5,
    borderRightWidth: 2.5,
    borderBottomColor: '#000000',
    borderRightColor: '#000000',
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroBillboardGrad: {
    padding: 16,
  },
  heroBillboard: {
    backgroundColor: '#131315',
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: '#2F2F34',
    borderBottomWidth: 5,
    borderRightWidth: 2.5,
    borderBottomColor: '#000000',
    borderRightColor: '#000000',
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBillboardDue: {
    backgroundColor: '#161215',
    borderColor: '#422428',
  },
  heroBillboardSettled: {
    backgroundColor: '#101713',
    borderColor: '#193C2D',
  },
  cardsModalScroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
  },
  modernCardsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  modernCardsTitle: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  modernCardsSub: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#8E8E93',
    marginTop: 3,
  },
  modernCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  summaryCardWrapper: {
    backgroundColor: '#111214',
    borderRadius: 16,
    marginHorizontal: 0,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222328',
    position: 'relative',
  },
  summaryOrb: {
    position: 'absolute',
    top: -45,
    right: -45,
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.9,
  },
  summaryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  summaryLeftCol: {
    flex: 1.6,
  },
  summaryColLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.bold,
    color: '#8E8E93',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  summaryColAmount: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: '#D4FF00',
    letterSpacing: -0.5,
  },
  summaryColDivider: {
    width: 1,
    height: 38,
    backgroundColor: '#26272D',
    marginHorizontal: 14,
  },
  summaryRightCol: {
    flex: 1,
    paddingLeft: 4,
  },
  summaryColCount: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121215',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242428',
    height: 42,
    paddingHorizontal: 14,
    marginHorizontal: 0,
    marginBottom: 14,
    gap: 10,
  },
  searchBarInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: Fonts.medium,
    fontSize: 13.5,
  },
  sectionTitleRow: {
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  sectionTitleText: {
    fontSize: 10.5,
    fontFamily: Fonts.bold,
    color: '#71717A',
    letterSpacing: 1.5,
  },
  cardRowContainer: {
    marginHorizontal: 0,
    marginBottom: 6,
  },
  cardItemRow: {
    height: 56,
    backgroundColor: '#121215',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E1E22',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 12,
  },
  cardItemTab: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  cardItemName: {
    fontSize: 14.5,
    fontFamily: Fonts.semibold,
    color: '#FFFFFF',
    flex: 1,
    letterSpacing: -0.2,
  },
  cardItemAmount: {
    fontSize: 14.5,
    fontFamily: Fonts.semibold,
    color: '#FFFFFF',
    marginRight: 10,
    letterSpacing: -0.2,
  },
  actionCirclePaid: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D4FF00',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 255, 0, 0.08)',
  },
  actionCircleAdd: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#4A4A52',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  inlineEditCardBox: {
    backgroundColor: '#16161B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A32',
    padding: 12,
    marginTop: 6,
  },
  inlineEditLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.extraBold,
    color: '#8E8E93',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inlineEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineEditCurrency: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#D4FF00',
  },
  inlineEditInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#0D0D10',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#303038',
    color: '#FFFFFF',
    paddingHorizontal: 10,
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  inlineEditCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  inlineEditCancelText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#888888',
  },
  inlineEditSaveBtn: {
    backgroundColor: '#D4FF00',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  inlineEditSaveText: {
    fontSize: 11,
    fontFamily: Fonts.extraBold,
    color: '#000000',
    letterSpacing: 0.5,
  },
  togglesCard: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
    padding: 16,
    borderRadius: 6,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextCol: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.white,
  },
  toggleSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  toggleDivider: {
    height: 1,
    backgroundColor: '#2D2D2D',
    marginVertical: 14,
  },
  disabledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    padding: 14,
    borderRadius: 6,
  },
  disabledBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  loansSummaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  loanSummaryBox: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    borderRadius: 4,
  },
  loanSummaryLabel: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  loanSummaryAmount: {
    fontSize: 18,
    fontFamily: Fonts.serif,
    marginBottom: 2,
  },
  loanSummarySub: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  tapToViewText: {
    fontSize: 9.5,
    fontFamily: Fonts.medium,
    color: '#00E599',
  },
  loanTypeBadge: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    color: '#F59E0B',
    backgroundColor: '#2D1B06',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  dueDateBadge: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  emiText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 4,
  },
  totalLoanSub: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
