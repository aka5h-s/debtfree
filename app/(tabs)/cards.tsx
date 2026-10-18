import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  NativeSyntheticEvent,
  NativeScrollEvent,
  BackHandler,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/Icon';
import Animated, { useAnimatedStyle, useSharedValue, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { CreditCardVisual } from '@/components/CreditCardVisual';
import { Card3DModal } from '@/components/Card3DModal';
import { CardNetworkSymbol } from '@/components/CardNetworkSymbol';
import { Fonts } from '@/lib/fonts';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { AccountDetailView } from '@/components/AccountDetailView';
import { AccountsModal, LoansModal } from '@/components/FinancesModals';
import { AccountLogoBadge } from '@/components/AccountLogoBadge';
import type { AccountType, CreditCard } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.82;
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;

function AnimatedCard({
  card,
  index,
  scrollX,
  totalCards,
  onPress,
  onCopy,
  onEdit,
  onDelete,
}: {
  card: any;
  index: number;
  scrollX: SharedValue<number>;
  totalCards: number;
  onPress: () => void;
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
      <CreditCardVisual
        card={card}
        onPress={onPress}
        onCopy={onCopy}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </Animated.View>
  );
}

export default function CardsScreen() {
  const insets = useSafeAreaInsets();
  const {
    cards,
    removeCard,
    updateCard,
    accounts,
    removeAccount,
    loans,
    totalCashAndAccounts,
    totalLoansRemaining,
    totalCreditCardsDue,
  } = useData();

  const [activeSection, setActiveSection] = useState<'CARDS' | 'ACCOUNTS' | 'LOANS'>('CARDS');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showLoansModal, setShowLoansModal] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [showCvv, setShowCvv] = useState(false);
  const [card3DModalCard, setCard3DModalCard] = useState<CreditCard | null>(null);
  const [setBillModalCard, setSetBillModalCard] = useState<CreditCard | null>(null);
  const [billInputAmount, setBillInputAmount] = useState('');
  const scrollX = useSharedValue(0);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || null;
  }, [accounts, selectedAccountId]);

  // Hierarchical back navigation: Account Detail -> Accounts List -> Cards Vault -> Dashboard
  useEffect(() => {
    const onBackPress = () => {
      if (selectedAccountId) {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedAccountId(null);
        return true;
      }
      if (activeSection !== 'CARDS') {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveSection('CARDS');
        return true;
      }
      return false; // Let normal back to Dashboard occur
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [selectedAccountId, activeSection]);

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

  const handleDelete = (cardId: string, cardName: string) => {
    if (Platform.OS === 'web') {
      if (confirm(`Remove "${cardName}"?`)) {
        removeCard(cardId);
        setActiveIndex(0);
      }
    } else {
      Alert.alert('Remove Card', `Remove "${cardName}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => { removeCard(cardId); setActiveIndex(0); } },
      ]);
    }
  };

  const handleEdit = (cardId: string) => {
    router.push({ pathname: '/edit-card', params: { cardId } });
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
      onPress={() => setCard3DModalCard(item)}
      onCopy={handleCopy}
      onEdit={() => handleEdit(item.id)}
      onDelete={() => handleDelete(item.id, item.cardName)}
    />
  ), [filteredCards.length]);

  // If viewing an account's detail & audit history full-screen in this tab:
  if (activeSection === 'ACCOUNTS' && selectedAccount) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <AccountDetailView
          account={selectedAccount}
          onBack={() => setSelectedAccountId(null)}
          onDeleteAccount={(id) => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            removeAccount(id);
            setSelectedAccountId(null);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <View>
          <Text style={styles.title}>Finances Vault</Text>
          <Text style={styles.subtitle}>Cards, Accounts & Liabilities</Text>
        </View>
      </View>

      {/* Segmented Switcher */}
      <View style={styles.segmentContainer}>
        <Pressable
          style={[styles.segmentBtn, activeSection === 'CARDS' && styles.segmentBtnActive]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveSection('CARDS');
            setSelectedAccountId(null);
          }}
        >
          <Icon name="card" size={13} color={activeSection === 'CARDS' ? '#00FE9D' : '#71717A'} />
          <Text style={[styles.segmentBtnText, activeSection === 'CARDS' && styles.segmentBtnTextActive]}>
            CARDS ({cards.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.segmentBtn, activeSection === 'ACCOUNTS' && styles.segmentBtnActive]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveSection('ACCOUNTS');
            setSelectedAccountId(null);
          }}
        >
          <Icon name="business" size={13} color={activeSection === 'ACCOUNTS' ? '#00FE9D' : '#71717A'} />
          <Text style={[styles.segmentBtnText, activeSection === 'ACCOUNTS' && styles.segmentBtnTextActive]}>
            BANKS & CASH ({accounts.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.segmentBtn, activeSection === 'LOANS' && styles.segmentBtnActive]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveSection('LOANS');
            setSelectedAccountId(null);
          }}
        >
          <Icon name="receipt-outline" size={13} color={activeSection === 'LOANS' ? '#00FE9D' : '#71717A'} />
          <Text style={[styles.segmentBtnText, activeSection === 'LOANS' && styles.segmentBtnTextActive]}>
            LOANS ({loans.length})
          </Text>
        </Pressable>
      </View>

      {/* Section 1: CARDS */}
      {activeSection === 'CARDS' && (
        <>
          <View style={styles.searchContainer}>
            <Icon name="search" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search cards..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')}>
                <Icon name="close-circle" size={18} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>

          {copiedLabel && (
            <View style={styles.copiedToast}>
              <Icon name="checkmark-circle" size={16} color="#000" />
              <Text style={styles.copiedToastText}>{copiedLabel} copied</Text>
            </View>
          )}

          {filteredCards.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="card-outline" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{search ? 'No cards found' : 'No cards yet'}</Text>
              <Text style={styles.emptySubtext}>Store your card details securely</Text>
              {!search && (
                <View style={{ marginTop: 24, width: '70%' }}>
                  <NeoPopTiltedButton onPress={() => router.push('/add-card')} showShimmer>
                    <Text style={styles.ctaText}>ADD YOUR FIRST CARD</Text>
                  </NeoPopTiltedButton>
                </View>
              )}
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scrollBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Card Carousel */}
              <FlatList
                data={filteredCards}
                keyExtractor={(item) => item.id}
                renderItem={renderCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH}
                snapToAlignment="start"
                decelerationRate="fast"
                contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
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

              {/* Active Card Statement Bill & Mark Paid Banner */}
              {activeCard && (
                <View style={styles.hubContainer}>
                  <View style={styles.cardBillCard}>
                    <View style={styles.cardBillLeft}>
                      <Text style={styles.cardBillLabel}>OUTSTANDING STATEMENT BILL</Text>
                      <Text
                        style={[
                          styles.cardBillAmount,
                          (activeCard.currentBill || 0) > 0 ? { color: '#FF334B' } : { color: '#00E599' },
                        ]}
                      >
                        {formatCurrency(activeCard.currentBill || 0)}
                      </Text>
                      <Text style={styles.cardBillDueDate}>
                        {(activeCard.currentBill || 0) > 0 ? 'PAYMENT PENDING' : '✓ ALL BILLS PAID'}
                      </Text>
                    </View>

                    {(activeCard.currentBill || 0) > 0 ? (
                      <View style={styles.cardBillActionBtns}>
                        <Pressable
                          style={styles.cardEditBillSmallBtn}
                          onPress={() => {
                            setBillInputAmount(activeCard.currentBill ? String(activeCard.currentBill) : '');
                            setSetBillModalCard(activeCard);
                          }}
                        >
                          <Icon name="pencil-outline" size={12} color="#D8D8D8" />
                          <Text style={styles.cardEditBillSmallText}>EDIT</Text>
                        </Pressable>

                        <Pressable
                          style={styles.cardMarkPaidBtn}
                          onPress={async () => {
                            if (Platform.OS !== 'web') {
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                            await updateCard({ ...activeCard, currentBill: 0 });
                          }}
                        >
                          <View style={styles.cardMarkPaidIconBox}>
                            <Icon name="checkmark" size={13} color="#00E599" />
                          </View>
                          <Text style={styles.cardMarkPaidBtnText}>MARK PAID</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.cardSetBillBtn}
                        onPress={() => {
                          setBillInputAmount('');
                          setSetBillModalCard(activeCard);
                        }}
                      >
                        <Icon name="add" size={12} color="#FFFFFF" />
                        <Text style={styles.cardSetBillBtnText}>SET BILL</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          )}

          {filteredCards.length > 0 && (
            <View style={[styles.addFab, { bottom: Platform.OS === 'web' ? 84 + 34 + 16 : 100 }]}>
              <NeoPopTiltedButton onPress={() => router.push('/add-card')} showShimmer>
                <Icon name="add" size={24} color="#000" />
              </NeoPopTiltedButton>
            </View>
          )}
        </>
      )}

      {/* Section 2: BANKS & CASH */}
      {activeSection === 'ACCOUNTS' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          {/* Total Liquid Cash Card */}
          <LinearGradient
            colors={['#0E442B', '#082D1D', '#03170F']}
            start={{ x: 0.1, y: 0.1 }}
            end={{ x: 0.9, y: 0.9 }}
            style={styles.vaultSummaryCard}
          >
            <Text style={styles.vaultSummaryLabel}>TOTAL LIQUID CASH & ACCOUNTS</Text>
            <Text style={styles.vaultSummaryAmount}>
              {formatCurrency(totalCashAndAccounts)}
            </Text>
            <Text style={styles.vaultSummarySub}>
              {accounts.length} active bank account{accounts.length === 1 ? '' : 's'} / wallet{accounts.length === 1 ? '' : 's'}
            </Text>
          </LinearGradient>

          {/* Accounts List */}
          <View style={styles.vaultSectionTitleRow}>
            <Text style={styles.vaultSectionTitle}>SAVED BANK ACCOUNTS & WALLETS</Text>
            <Pressable
              style={styles.addSmallBtn}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAccountsModal(true);
              }}
            >
              <Icon name="add" size={14} color={Colors.primary} />
              <Text style={styles.addSmallBtnText}>ADD NEW</Text>
            </Pressable>
          </View>

          {accounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="wallet-outline" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No bank accounts added</Text>
              <Text style={styles.emptySubtext}>Track salary, bank balances and liquid cash</Text>
              <View style={{ marginTop: 20, width: '70%' }}>
                <NeoPopTiltedButton onPress={() => setShowAccountsModal(true)}>
                  <Text style={styles.ctaText}>ADD BANK ACCOUNT</Text>
                </NeoPopTiltedButton>
              </View>
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
                  style={styles.vaultAccountCard}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedAccountId(acc.id);
                  }}
                >
                  <AccountLogoBadge name={acc.name} type={acc.type} size={48} />
                  <View style={styles.vaultAccountInfo}>
                    <Text style={styles.vaultAccountName} numberOfLines={1}>
                      {acc.name}
                    </Text>
                    <Text style={styles.vaultAccountSub}>{subLabel}</Text>
                  </View>

                  <View style={styles.vaultAccountRight}>
                    <Text
                      style={[
                        styles.vaultAccountBalance,
                        isPositive ? styles.vaultAccountBalancePositive : styles.vaultAccountBalanceZero,
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

          {accounts.length > 0 && (
            <View style={{ marginHorizontal: 20, marginTop: 16 }}>
              <NeoPopTiltedButton onPress={() => setShowAccountsModal(true)}>
                <Text style={styles.ctaText}>+ ADD ANOTHER ACCOUNT</Text>
              </NeoPopTiltedButton>
            </View>
          )}
        </ScrollView>
      )}

      {/* Section 3: LOANS */}
      {activeSection === 'LOANS' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
        >
          {/* Total Loans Card */}
          <View style={styles.vaultSummaryCard}>
            <Text style={styles.vaultSummaryLabel}>TOTAL ACTIVE LOAN DEBT</Text>
            <Text style={[styles.vaultSummaryAmount, { color: '#F59E0B' }]}>
              {formatCurrency(totalLoansRemaining)}
            </Text>
            <Text style={styles.vaultSummarySub}>
              {loans.length} active loan{loans.length === 1 ? '' : 's'} / liability accounts
            </Text>
          </View>

          <View style={styles.vaultSectionTitleRow}>
            <Text style={styles.vaultSectionTitle}>ACTIVE LOANS & EMIS</Text>
            <Pressable
              style={styles.addSmallBtn}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowLoansModal(true);
              }}
            >
              <Icon name="add" size={14} color={Colors.primary} />
              <Text style={styles.addSmallBtnText}>MANAGE</Text>
            </Pressable>
          </View>

          {loans.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="alert-circle-outline" size={56} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No active loans</Text>
              <Text style={styles.emptySubtext}>Track personal, home, or vehicle EMIs</Text>
              <View style={{ marginTop: 20, width: '70%' }}>
                <NeoPopTiltedButton onPress={() => setShowLoansModal(true)}>
                  <Text style={styles.ctaText}>ADD FIRST LOAN</Text>
                </NeoPopTiltedButton>
              </View>
            </View>
          ) : (
            loans.map((loan) => (
              <View key={loan.id} style={styles.vaultAccountCard}>
                <View style={styles.vaultAccountLeft}>
                  <View style={[styles.vaultAccountIconBox, { backgroundColor: '#2D1B06', borderColor: '#4D2E0B' }]}>
                    <Icon name="alert-circle-outline" size={18} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vaultAccountName}>{loan.name}</Text>
                    <View style={styles.vaultBadgeRow}>
                      <Text style={[styles.vaultTypeBadge, { color: '#F59E0B' }]}>{loan.type}</Text>
                      {Boolean(loan.emiAmount) && (
                        <Text style={styles.vaultDateSub}>EMI: {formatCurrency(loan.emiAmount || 0)}/mo</Text>
                      )}
                    </View>
                    <Text style={styles.vaultDateSub}>
                      Total: {formatCurrency(loan.totalAmount)}
                    </Text>
                  </View>
                </View>

                <View style={styles.vaultAccountRight}>
                  <Text style={[styles.vaultAccountBalance, { color: '#F59E0B' }]}>
                    {formatCurrency(loan.remainingAmount)}
                  </Text>
                </View>
              </View>
            ))
          )}

          {loans.length > 0 && (
            <View style={{ marginHorizontal: 20, marginTop: 16 }}>
              <NeoPopTiltedButton onPress={() => setShowLoansModal(true)}>
                <Text style={styles.ctaText}>+ MANAGE & ADD LOANS</Text>
              </NeoPopTiltedButton>
            </View>
          )}
        </ScrollView>
      )}

      {/* Modals for Adding Accounts or Loans */}
      <AccountsModal visible={showAccountsModal} onClose={() => setShowAccountsModal(false)} />
      <LoansModal visible={showLoansModal} onClose={() => setShowLoansModal(false)} />

      {/* 3D Card Inspector Modal */}
      {card3DModalCard && (
        <Card3DModal
          visible={!!card3DModalCard}
          card={card3DModalCard}
          onClose={() => setCard3DModalCard(null)}
          onEdit={handleEdit}
        />
      )}

      {/* Set Bill Modal */}
      <Modal
        visible={!!setBillModalCard}
        transparent
        animationType="fade"
        onRequestClose={() => setSetBillModalCard(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.setBillModalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setSetBillModalCard(null)}
          />
          <View style={styles.setBillCardDialog}>
            <View style={styles.setBillDialogHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.setBillDialogTitle}>SET STATEMENT BILL</Text>
                <Text style={styles.setBillDialogSub}>
                  {setBillModalCard?.cardName} (•••• {setBillModalCard?.cardNumber.replace(/\s/g, '').slice(-4)})
                </Text>
              </View>
              <Pressable
                onPress={() => setSetBillModalCard(null)}
                style={styles.setBillCloseBtn}
                hitSlop={8}
              >
                <Icon name="close" size={18} color="#A0A0A0" />
              </Pressable>
            </View>

            <Text style={styles.setBillInputLabel}>STATEMENT BILL AMOUNT (₹)</Text>
            <View style={styles.setBillAmountInputRow}>
              <Text style={styles.setBillCurrencySymbol}>₹</Text>
              <TextInput
                style={styles.setBillAmountInput}
                placeholder="0"
                placeholderTextColor="#666666"
                keyboardType="numeric"
                autoFocus
                value={billInputAmount}
                onChangeText={setBillInputAmount}
              />
            </View>

            <View style={styles.setBillDialogActions}>
              <Pressable
                style={styles.setBillCancelBtn}
                onPress={() => setSetBillModalCard(null)}
              >
                <Text style={styles.setBillCancelBtnText}>CANCEL</Text>
              </Pressable>

              <Pressable
                style={styles.setBillSaveBtn}
                onPress={async () => {
                  if (!setBillModalCard) return;
                  const parsed = parseFloat(billInputAmount.replace(/,/g, '')) || 0;
                  if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                  await updateCard({
                    ...setBillModalCard,
                    currentBill: parsed,
                    billDueDate: null,
                  });
                  setSetBillModalCard(null);
                }}
              >
                <Text style={styles.setBillSaveBtnText}>SAVE BILL</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.serif,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  cardCount: {
    fontSize: 12,
    fontFamily: Fonts.serif,
    color: Colors.primary,
    backgroundColor: 'rgba(229,254,64,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 15,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 20,
    height: 6,
    borderRadius: 3,
  },
  scrollBody: {
    paddingBottom: 110,
  },
  hubContainer: {
    marginHorizontal: 20,
    marginTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  sectionSub: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  quickTilesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: 'space-between',
    minHeight: 80,
  },
  tileTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tileValue: {
    color: Colors.white,
    fontFamily: Fonts.serif,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  tileLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontFamily: Fonts.semibold,
    letterSpacing: 1,
    marginTop: 4,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 14,
  },
  detailsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsCardTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  detailsCardSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.white,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.positive,
  },
  statusText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.positive,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(229, 254, 64, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(229, 254, 64, 0.15)',
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
    gap: 12,
  },
  securityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(229, 254, 64, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTextBox: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.white,
    marginBottom: 2,
  },
  securityDesc: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    lineHeight: 16,
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 4,
    opacity: 0.7,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
  addFab: {
    position: 'absolute',
    right: 20,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#D4D4D4',
    marginTop: 2,
  },
  cardBillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#383838',
    borderBottomWidth: 3.5,
    borderRightWidth: 1.5,
    borderBottomColor: '#000000',
    borderRightColor: '#000000',
    borderRadius: 2,
    padding: 14,
    marginBottom: 14,
  },
  cardBillLeft: {
    flex: 1,
    marginRight: 10,
  },
  cardBillLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.extraBold,
    color: '#E0E0E0',
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  cardBillAmount: {
    fontSize: 22,
    fontFamily: Fonts.serif,
    marginBottom: 3,
  },
  cardBillDueDate: {
    fontSize: 9,
    fontFamily: Fonts.extraBold,
    color: '#FFA834',
    letterSpacing: 0.8,
  },
  cardMarkPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: '#0C2618',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#00E599',
    borderBottomWidth: 2.5,
    borderRightWidth: 1,
    borderBottomColor: '#000000',
    borderRightColor: '#000000',
  },
  cardMarkPaidIconBox: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMarkPaidBtnText: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    color: '#00E599',
    letterSpacing: 1,
  },
  cardSetBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#202020',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#444444',
    borderBottomWidth: 3,
    borderBottomColor: '#000000',
  },
  cardSetBillBtnText: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardBillActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardEditBillSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: '#1E1E22',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#383842',
    borderBottomWidth: 2.5,
    borderRightWidth: 1,
    borderBottomColor: '#000000',
    borderRightColor: '#000000',
  },
  cardEditBillSmallText: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    color: '#D8D8D8',
    letterSpacing: 0.8,
  },
  setBillModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  setBillCardDialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#141416',
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: '#38383F',
    borderBottomWidth: 4,
    borderRightWidth: 2,
    borderBottomColor: '#000000',
    borderRightColor: '#000000',
    padding: 18,
  },
  setBillDialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  setBillDialogTitle: {
    fontSize: 12,
    fontFamily: Fonts.extraBold,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  setBillDialogSub: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#A0A0A0',
    marginTop: 2,
  },
  setBillCloseBtn: {
    padding: 4,
  },
  setBillInputLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.extraBold,
    color: '#A8A8A8',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  setBillAmountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0E',
    borderWidth: 1,
    borderColor: '#2D2D33',
    borderRadius: 2,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  setBillCurrencySymbol: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    marginRight: 6,
  },
  setBillAmountInput: {
    flex: 1,
    height: 48,
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: Fonts.serif,
  },
  setBillDialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  setBillCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 2,
    backgroundColor: '#1E1E22',
    borderWidth: 1,
    borderColor: '#333338',
  },
  setBillCancelBtnText: {
    fontSize: 10.5,
    fontFamily: Fonts.extraBold,
    color: '#CCCCCC',
    letterSpacing: 0.8,
  },
  setBillSaveBtn: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: '#EDFF24',
    borderBottomWidth: 2.5,
    borderRightWidth: 1,
    borderBottomColor: '#000000',
    borderRightColor: '#000000',
  },
  setBillSaveBtnText: {
    fontSize: 10.5,
    fontFamily: Fonts.extraBold,
    color: '#000000',
    letterSpacing: 0.8,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 14,
    backgroundColor: '#111114',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E1E24',
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#1C1C22',
    borderWidth: 1,
    borderColor: '#2F2F3B',
  },
  segmentBtnText: {
    fontSize: 9.5,
    fontFamily: Fonts.extraBold,
    color: '#71717A',
    letterSpacing: 0.8,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  vaultSummaryCard: {
    borderWidth: 1.5,
    borderColor: '#0E5C3B',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  vaultSummaryLabel: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    color: '#7BE5B0',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  vaultSummaryAmount: {
    fontSize: 30,
    fontFamily: Fonts.serif,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  vaultSummarySub: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#A1A1AA',
  },
  vaultSectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  vaultSectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.extraBold,
    color: '#E0E0E0',
    letterSpacing: 1.8,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1C240A',
    borderWidth: 1,
    borderColor: '#4A5B12',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  addSmallBtnText: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  vaultAccountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111114',
    borderWidth: 1,
    borderColor: '#1E1E22',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  vaultAccountInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  vaultAccountName: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  vaultAccountSub: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#8E8E93',
    marginTop: 3,
  },
  vaultAccountRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaultAccountBalance: {
    fontSize: 16,
    fontFamily: Fonts.semibold,
    letterSpacing: -0.2,
  },
  vaultAccountBalancePositive: {
    color: '#00FE9D',
  },
  vaultAccountBalanceZero: {
    color: '#FFFFFF',
  },
  vaultAccountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  vaultAccountIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1C1C22',
    borderWidth: 1,
    borderColor: '#2A2A34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  vaultTypeBadge: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#8E8E93',
  },
  vaultTapHint: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: '#71717A',
  },
  vaultDateSub: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: '#71717A',
    letterSpacing: 0.3,
  },
});
