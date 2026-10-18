import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import Colors from '@/constants/colors';
import { useData } from '@/contexts/DataContext';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { Fonts } from '@/lib/fonts';
import { AccountLogoBadge } from '@/components/AccountLogoBadge';
import type { Account, AccountType, AccountLogType, AccountLogEntry } from '@/lib/types';

interface AccountDetailViewProps {
  account: Account;
  onBack: () => void;
  onDeleteAccount?: (id: string, name: string) => void;
}

const ACCOUNT_TYPE_ICONS: Record<AccountType, string> = {
  BANK: 'business-outline',
  CASH: 'cash-outline',
  WALLET: 'phone-portrait-outline',
  OTHER: 'wallet-outline',
};

const EDIT_ACCOUNT_TYPES: { type: AccountType; shortLabel: string; icon: string }[] = [
  { type: 'BANK', shortLabel: 'Bank', icon: 'bank' },
  { type: 'CASH', shortLabel: 'Cash', icon: 'cash' },
  { type: 'WALLET', shortLabel: 'Wallet', icon: 'wallet' },
  { type: 'OTHER', shortLabel: 'Other', icon: 'menu' },
];

type ActiveActionType = 'ADD_MONEY' | 'SET_BALANCE' | null;

export function AccountDetailView({ account, onBack, onDeleteAccount }: AccountDetailViewProps) {
  const { addAccountLog, deleteAccountLog, updateAccount } = useData();

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(account.name);
  const [editType, setEditType] = useState<AccountType>(account.type);
  const [editNotes, setEditNotes] = useState(account.notes || '');
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);

  useEffect(() => {
    setEditName(account.name);
    setEditType(account.type);
    setEditNotes(account.notes || '');
  }, [account.name, account.type, account.notes]);

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Please enter an account name');
      return;
    }
    try {
      setIsUpdatingAccount(true);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await updateAccount({
        ...account,
        name: editName.trim(),
        type: editType,
        notes: editNotes.trim() || undefined,
      });
      setShowEditModal(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to update account details');
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  // Intercept Android hardware back button / swipe back gesture to return to accounts list
  useEffect(() => {
    const onBackPress = () => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onBack();
      return true; // Prevent exiting tab to Dashboard!
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [onBack]);

  const [activeAction, setActiveAction] = useState<ActiveActionType>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [dateMode, setDateMode] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDateStr, setCustomDateStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute effective history (if account has no history yet, synthesize initial balance log)
  const historyList = useMemo(() => {
    if (account.history && account.history.length > 0) {
      return [...account.history].sort((a, b) => (b.date || b.createdAt) - (a.date || a.createdAt));
    }
    const initialEntry: AccountLogEntry = {
      id: 'initial',
      accountId: account.id,
      amount: account.balance,
      type: 'SET_BALANCE',
      previousBalance: 0,
      newBalance: account.balance,
      note: account.notes || 'Initial balance',
      date: account.createdAt,
      createdAt: account.createdAt,
    };
    return [initialEntry];
  }, [account]);

  const numAmount = parseFloat(amount.replace(/,/g, '')) || 0;

  const previewBalance = useMemo(() => {
    const prev = account.balance || 0;
    if (activeAction === 'ADD_MONEY') return prev + numAmount;
    if (activeAction === 'SET_BALANCE') return numAmount;
    return prev;
  }, [account.balance, activeAction, numAmount]);

  const handleSelectAction = (action: ActiveActionType) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveAction(action);
    setAmount('');
    setNote('');
    setDateMode('today');
  };

  const handleSaveLog = async () => {
    if (!activeAction) return;
    if (numAmount <= 0 && activeAction !== 'SET_BALANCE') {
      Alert.alert('Required', 'Please enter a valid amount');
      return;
    }

    let targetDate = Date.now();
    if (dateMode === 'yesterday') {
      targetDate = Date.now() - 86400000;
    } else if (dateMode === 'custom') {
      const parsed = new Date(customDateStr).getTime();
      if (!isNaN(parsed)) {
        targetDate = parsed;
      }
    }

    try {
      setIsSubmitting(true);
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await addAccountLog(account.id, {
        amount: numAmount,
        type: activeAction,
        note: note.trim() || undefined,
        date: targetDate,
      });

      setActiveAction(null);
      setAmount('');
      setNote('');
    } catch (e) {
      Alert.alert('Error', 'Failed to record entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLog = (logId: string) => {
    if (logId === 'initial') {
      Alert.alert('Notice', 'Cannot delete the initial balance entry');
      return;
    }
    Alert.alert(
      'Delete Log Entry',
      'Remove this history entry and recalculate balance?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await deleteAccountLog(account.id, logId);
          },
        },
      ]
    );
  };

  const iconName = ACCOUNT_TYPE_ICONS[account.type] || 'wallet-outline';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Navigation Row */}
      <View style={styles.navRow}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onBack();
          }}
        >
          <Icon name="arrow-back" size={16} color="#FFFFFF" />
          <Text style={styles.backBtnText}>ALL ACCOUNTS</Text>
        </Pressable>

        <View style={styles.navActionsRow}>
          <Pressable
            style={styles.editBtn}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowEditModal(true);
            }}
          >
            <Icon name="create-outline" size={14} color="#FFFFFF" />
            <Text style={styles.editBtnText}>EDIT</Text>
          </Pressable>

          {onDeleteAccount && (
            <Pressable
              style={styles.deleteBtn}
              onPress={() => onDeleteAccount(account.id, account.name)}
            >
              <Icon name="trash-outline" size={16} color={Colors.negative} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, activeAction ? { paddingBottom: 340 } : null]}
        automaticallyAdjustKeyboardInsets={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Current Balance Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTitleBox}>
              <AccountLogoBadge name={account.name} type={account.type} size={46} />
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.accountNameText}>{account.name}</Text>
                <Text style={styles.accountTypeBadge}>
                  {account.type === 'BANK' ? 'Bank account' : account.type === 'CASH' ? 'Cash in hand' : account.type === 'WALLET' ? 'Digital wallet' : 'Other funds'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.heroBalanceBox}>
            <Text style={styles.heroBalanceLabel}>CURRENT BALANCE</Text>
            <Text
              style={[
                styles.heroBalanceAmount,
                account.balance < 0 ? { color: Colors.negative } : { color: '#FFFFFF' },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {account.balance < 0 ? `-${formatCurrency(account.balance)}` : formatCurrency(account.balance)}
            </Text>
            <Text style={styles.heroUpdateSubtitle}>
              Last updated on {formatDateTime(account.updatedAt || account.createdAt)}
            </Text>
            {Boolean(account.notes) && (
              <Text style={styles.accountNotesText}>{account.notes}</Text>
            )}
          </View>
        </View>

        {/* Quick Action Buttons (100% CRED NeoPOP 3D Solid Raised Buttons) */}
        <View style={styles.actionButtonsRow}>
          {/* Add Money Button */}
          <Pressable
            style={[
              styles.actionBtn,
              styles.actionBtnAdd,
              activeAction === 'ADD_MONEY' && styles.actionBtnAddActive,
            ]}
            onPress={() => handleSelectAction(activeAction === 'ADD_MONEY' ? null : 'ADD_MONEY')}
          >
            <View style={styles.actionIconSquareAdd}>
              <Icon name="add" size={14} color="#00E599" />
            </View>
            <Text style={styles.actionBtnTextAdd}>
              ADD MONEY
            </Text>
          </Pressable>

          {/* Set / Update Balance Button */}
          <Pressable
            style={[
              styles.actionBtn,
              styles.actionBtnSet,
              activeAction === 'SET_BALANCE' && styles.actionBtnSetActive,
            ]}
            onPress={() => handleSelectAction(activeAction === 'SET_BALANCE' ? null : 'SET_BALANCE')}
          >
            <View style={styles.actionIconSquareSet}>
              <Icon name="sync-outline" size={13} color="#FFFFFF" />
            </View>
            <Text style={styles.actionBtnTextSet}>
              UPDATE BALANCE
            </Text>
          </Pressable>
        </View>

        {/* Action Form Sheet (Inline) */}
        {activeAction && (
          <View style={styles.formContainer}>
            <View style={styles.formHeaderRow}>
              <Text style={styles.formTitle}>
                {activeAction === 'ADD_MONEY'
                  ? 'ADD MONEY TO ACCOUNT'
                  : 'UPDATE LATEST BALANCE'}
              </Text>
              <Pressable onPress={() => setActiveAction(null)} style={styles.formCloseBtn}>
                <Icon name="close" size={16} color={Colors.textMuted} />
              </Pressable>
            </View>

            {/* Amount Input */}
            <Text style={styles.inputLabel}>
              {activeAction === 'SET_BALANCE' ? 'NEW TOTAL BALANCE (₹)' : 'AMOUNT TO ADD (₹)'}
            </Text>
            <View style={styles.amountInputRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#555555"
                keyboardType="numeric"
                autoFocus
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Note / Reason Input */}
            <Text style={styles.inputLabel}>NOTE / DESCRIPTION (OPTIONAL)</Text>
            <TextInput
              style={styles.textInput}
              placeholder={
                activeAction === 'ADD_MONEY'
                  ? 'e.g. Salary credited, UPI deposit, Cash added'
                  : 'e.g. Monthly statement balance, Passbook update'
              }
              placeholderTextColor="#555555"
              value={note}
              onChangeText={setNote}
            />

            {/* Date Selection */}
            <Text style={styles.inputLabel}>DATE OF ENTRY</Text>
            <View style={styles.datePillsRow}>
              <Pressable
                style={[styles.datePill, dateMode === 'today' && styles.datePillActive]}
                onPress={() => setDateMode('today')}
              >
                <Text style={[styles.datePillText, dateMode === 'today' && styles.datePillTextActive]}>
                  TODAY
                </Text>
              </Pressable>

              <Pressable
                style={[styles.datePill, dateMode === 'yesterday' && styles.datePillActive]}
                onPress={() => setDateMode('yesterday')}
              >
                <Text style={[styles.datePillText, dateMode === 'yesterday' && styles.datePillTextActive]}>
                  YESTERDAY
                </Text>
              </Pressable>

              <Pressable
                style={[styles.datePill, dateMode === 'custom' && styles.datePillActive]}
                onPress={() => setDateMode('custom')}
              >
                <Text style={[styles.datePillText, dateMode === 'custom' && styles.datePillTextActive]}>
                  CUSTOM DATE
                </Text>
              </Pressable>
            </View>

            {dateMode === 'custom' && (
              <TextInput
                style={[styles.textInput, { marginTop: 8 }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#555555"
                value={customDateStr}
                onChangeText={setCustomDateStr}
              />
            )}

            {/* Preview Banner */}
            <View style={styles.previewBanner}>
              <Text style={styles.previewLabel}>RESULTING BALANCE:</Text>
              <Text
                style={[
                  styles.previewAmount,
                  previewBalance < 0 ? { color: Colors.negative } : { color: '#00E599' },
                ]}
              >
                {previewBalance < 0 ? `-${formatCurrency(previewBalance)}` : formatCurrency(previewBalance)}
              </Text>
            </View>

            {/* Confirm Button */}
            <View style={{ marginTop: 14 }}>
              <NeoPopTiltedButton onPress={handleSaveLog} disabled={isSubmitting}>
                <Text style={styles.btnText}>
                  {isSubmitting
                    ? 'SAVING...'
                    : activeAction === 'ADD_MONEY'
                    ? 'CONFIRM & ADD MONEY'
                    : 'CONFIRM & UPDATE BALANCE'}
                </Text>
              </NeoPopTiltedButton>
            </View>
          </View>
        )}

        {/* History / Audit Log Section */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>BALANCE & MONEY LOG</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{historyList.length}</Text>
              </View>
            </View>
          </View>

          {historyList.map((entry) => {
            const isAdd = entry.type === 'ADD_MONEY';
            const isWithdraw = entry.type === 'WITHDRAW_MONEY';

            return (
              <View key={entry.id} style={styles.historyItemCard}>
                {/* Left Colored Pill Tab (matching credit card view in home page) */}
                <View
                  style={[
                    styles.historyPillTab,
                    {
                      backgroundColor: isAdd
                        ? '#00FE9D'
                        : isWithdraw
                        ? '#FF5252'
                        : '#E2E8F0',
                    },
                  ]}
                />

                <View style={styles.historyItemLeft}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.logTitleRow}>
                      <Icon
                        name={isAdd ? 'arrow-down' : isWithdraw ? 'arrow-up' : 'sync-outline'}
                        size={13}
                        color={isAdd ? '#00FE9D' : isWithdraw ? '#FF5252' : '#A1A1AA'}
                      />
                      <Text style={styles.logTitleText} numberOfLines={1}>
                        {isAdd
                          ? 'Money added'
                          : isWithdraw
                          ? 'Withdrawn'
                          : 'Balance updated'}
                      </Text>
                    </View>

                    {Boolean(entry.note) && (
                      <Text style={styles.historyNote} numberOfLines={1}>{entry.note}</Text>
                    )}

                    <Text style={styles.historyDate}>
                      {formatDateTime(entry.date || entry.createdAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.historyItemRight}>
                  <Text
                    style={[
                      styles.historyAmountText,
                      isAdd && { color: '#00FE9D' },
                      isWithdraw && { color: '#FF5252' },
                      !isAdd && !isWithdraw && { color: '#FFFFFF' },
                    ]}
                  >
                    {isAdd ? `+${formatCurrency(entry.amount)}` : isWithdraw ? `-${formatCurrency(entry.amount)}` : formatCurrency(entry.amount)}
                  </Text>
                  <Text style={styles.historyBalanceAfter}>
                    Bal: {formatCurrency(entry.newBalance)}
                  </Text>

                  {entry.id !== 'initial' && (
                    <Pressable
                      style={styles.deleteLogBtn}
                      hitSlop={8}
                      onPress={() => handleDeleteLog(entry.id)}
                    >
                      <Icon name="trash-outline" size={13} color="#71717A" />
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Edit Account Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowEditModal(false)}
          />
          <View style={styles.editModalContainer}>
            {/* Modal Header */}
            <View style={styles.editModalHeader}>
              <View>
                <Text style={styles.editModalTitle}>EDIT ACCOUNT</Text>
                <Text style={styles.editModalSubtitle}>Update account name, type & details</Text>
              </View>
              <Pressable
                style={styles.editModalCloseBtn}
                hitSlop={10}
                onPress={() => setShowEditModal(false)}
              >
                <Icon name="close" size={18} color="#A1A1AA" />
              </Pressable>
            </View>

            {/* Account Name */}
            <View style={styles.editFieldGroup}>
              <Text style={styles.editFieldLabel}>ACCOUNT NAME</Text>
              <TextInput
                style={styles.editTextInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. HDFC Salary, ICICI Savings, Pocket Cash"
                placeholderTextColor="#52525B"
                autoCapitalize="words"
              />
            </View>

            {/* Account Type Selector */}
            <View style={styles.editFieldGroup}>
              <Text style={styles.editFieldLabel}>ACCOUNT TYPE</Text>
              <View style={styles.editTypeTilesRow}>
                {EDIT_ACCOUNT_TYPES.map((t) => {
                  const isSelected = editType === t.type;
                  return (
                    <Pressable
                      key={t.type}
                      style={[
                        styles.editTypeTile,
                        isSelected && styles.editTypeTileActive,
                      ]}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEditType(t.type);
                      }}
                    >
                      <Icon
                        name={
                          t.type === 'BANK'
                            ? 'business-outline'
                            : t.type === 'CASH'
                            ? 'cash-outline'
                            : t.type === 'WALLET'
                            ? 'phone-portrait-outline'
                            : 'wallet-outline'
                        }
                        size={18}
                        color={isSelected ? '#00FE9D' : '#71717A'}
                      />
                      <Text
                        style={[
                          styles.editTypeTileLabel,
                          isSelected && styles.editTypeTileLabelActive,
                        ]}
                      >
                        {t.shortLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.editFieldGroup}>
              <Text style={styles.editFieldLabel}>NOTES (OPTIONAL)</Text>
              <TextInput
                style={[styles.editTextInput, { height: 44 }]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="e.g. Primary salary account"
                placeholderTextColor="#52525B"
              />
            </View>

            {/* Save Button */}
            <View style={{ marginTop: 8 }}>
              <NeoPopTiltedButton
                onPress={handleSaveEdit}
                disabled={isUpdatingAccount}
                color="#00FE9D"
                plunkColor="#006E46"
              >
                <Text style={styles.btnText}>
                  {isUpdatingAccount ? 'SAVING...' : 'SAVE CHANGES'}
                </Text>
              </NeoPopTiltedButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#161618',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#26262B',
  },
  backBtnText: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    color: '#FFFFFF',
    letterSpacing: 1.6,
  },
  navActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1E1E24',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E2E38',
  },
  editBtnText: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    color: '#FFFFFF',
    letterSpacing: 1.4,
  },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#1A0D10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3D141A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    borderBottomWidth: 4,
    borderRightWidth: 2,
    borderBottomColor: '#000000',
    borderRightColor: '#000000',
    borderRadius: 2,
    padding: 18,
    marginBottom: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconBox: {
    width: 38,
    height: 38,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 229, 153, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00E599',
  },
  accountNameText: {
    fontSize: 18,
    fontFamily: Fonts.extraBold,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  accountTypeBadge: {
    fontSize: 12.5,
    fontFamily: Fonts.medium,
    color: '#8E8E93',
    marginTop: 2,
  },
  heroBalanceBox: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },
  heroBalanceLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.extraBold,
    color: '#E0E0E0',
    letterSpacing: 2.2,
    marginBottom: 6,
  },
  heroBalanceAmount: {
    fontSize: 38,
    fontFamily: Fonts.serif,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroUpdateSubtitle: {
    fontSize: 10.5,
    fontFamily: Fonts.semibold,
    color: '#B8B8B8',
    letterSpacing: 0.5,
  },
  accountNotesText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: '#D0D0D0',
    marginTop: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderRadius: 4,
    gap: 8,
  },
  actionBtnAdd: {
    backgroundColor: '#00E599',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: '#52FFA8',
    borderLeftColor: '#2BEB96',
    borderBottomWidth: 5,
    borderRightWidth: 3,
    borderBottomColor: '#006E46',
    borderRightColor: '#00945F',
  },
  actionBtnAddActive: {
    backgroundColor: '#00C782',
    transform: [{ translateY: 3 }],
    borderBottomWidth: 2,
    borderRightWidth: 1,
    borderBottomColor: '#004A2F',
    borderRightColor: '#006E46',
  },
  actionBtnSet: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderTopColor: '#FFFFFF',
    borderLeftColor: '#F3F4F6',
    borderBottomWidth: 5,
    borderRightWidth: 3,
    borderBottomColor: '#8C929C',
    borderRightColor: '#BDC3CC',
  },
  actionBtnSetActive: {
    backgroundColor: '#E5E7EB',
    transform: [{ translateY: 3 }],
    borderBottomWidth: 2,
    borderRightWidth: 1,
    borderBottomColor: '#6B7280',
    borderRightColor: '#9CA3AF',
  },
  actionIconSquareAdd: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconSquareSet: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnTextAdd: {
    fontSize: 11.5,
    fontFamily: Fonts.extraBold,
    color: '#000000',
    letterSpacing: 1.2,
  },
  actionBtnTextSet: {
    fontSize: 11.5,
    fontFamily: Fonts.extraBold,
    color: '#000000',
    letterSpacing: 1.2,
  },
  formContainer: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#383838',
    borderBottomWidth: 4,
    borderRightWidth: 2,
    borderBottomColor: '#000000',
    borderRightColor: '#000000',
    borderRadius: 2,
    padding: 16,
    marginBottom: 16,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 11,
    fontFamily: Fonts.extraBold,
    color: '#FFFFFF',
    letterSpacing: 1.8,
  },
  formCloseBtn: {
    padding: 4,
  },
  inputLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.extraBold,
    color: '#E0E0E0',
    letterSpacing: 1.8,
    marginBottom: 6,
    marginTop: 12,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#383838',
    borderRadius: 2,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 22,
    fontFamily: Fonts.serif,
    color: '#00E599',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    height: 48,
    fontSize: 22,
    fontFamily: Fonts.serif,
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#383838',
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#FFFFFF',
  },
  datePillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  datePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#333333',
    borderBottomWidth: 2.5,
    borderBottomColor: '#000000',
    borderRadius: 2,
  },
  datePillActive: {
    borderColor: '#00E599',
    backgroundColor: '#082618',
    borderBottomColor: '#003D20',
  },
  datePillText: {
    fontSize: 9.5,
    fontFamily: Fonts.extraBold,
    color: '#CCCCCC',
    letterSpacing: 1.2,
  },
  datePillTextActive: {
    color: '#00E599',
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0B2217',
    borderWidth: 1,
    borderColor: '#00E599',
    borderBottomWidth: 2.5,
    borderBottomColor: '#000000',
    borderRadius: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 14,
  },
  previewLabel: {
    fontSize: 9.5,
    fontFamily: Fonts.extraBold,
    color: '#E0E0E0',
    letterSpacing: 1.5,
  },
  previewAmount: {
    fontSize: 17,
    fontFamily: Fonts.serif,
  },
  btnText: {
    fontSize: 12,
    fontFamily: Fonts.extraBold,
    color: '#000000',
    letterSpacing: 1.5,
  },
  historySection: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.extraBold,
    color: '#A1A1AA',
    letterSpacing: 1.8,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: '#18181B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  countBadgeText: {
    fontSize: 9.5,
    fontFamily: Fonts.extraBold,
    color: '#D4D4D8',
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#1E1E22',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  historyPillTab: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 10,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  logTitleText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  historyNote: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#A1A1AA',
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#52525B',
    marginTop: 2,
  },
  historyItemRight: {
    alignItems: 'flex-end',
  },
  historyAmountText: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  historyBalanceAfter: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#71717A',
  },
  deleteLogBtn: {
    marginTop: 3,
    padding: 3,
  },

  /* Edit Account Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#141416',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#26262B',
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E24',
    paddingBottom: 14,
  },
  editModalTitle: {
    fontSize: 15,
    fontFamily: Fonts.extraBold,
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  editModalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#71717A',
    marginTop: 3,
  },
  editModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1F1F24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editFieldGroup: {
    marginBottom: 16,
  },
  editFieldLabel: {
    fontSize: 10,
    fontFamily: Fonts.extraBold,
    color: '#71717A',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  editTextInput: {
    backgroundColor: '#0D0D0F',
    borderWidth: 1,
    borderColor: '#26262B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: '#FFFFFF',
  },
  editTypeTilesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editTypeTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#0D0D0F',
    borderWidth: 1,
    borderColor: '#26262B',
    borderRadius: 12,
    gap: 6,
  },
  editTypeTileActive: {
    borderColor: '#00FE9D',
    backgroundColor: 'rgba(0, 254, 157, 0.08)',
  },
  editTypeTileLabel: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#71717A',
  },
  editTypeTileLabelActive: {
    color: '#00FE9D',
    fontFamily: Fonts.bold,
  },
});
