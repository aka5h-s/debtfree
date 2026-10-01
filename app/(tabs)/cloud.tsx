import React, { useState } from 'react';
import { StyleSheet, Text, View, Platform, Pressable, Alert, TextInput, ActivityIndicator, ScrollView, Modal, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import Colors from '@/constants/colors';
import { NeoPopCard } from '@/components/NeoPopCard';
import { NeoPopButton } from '@/components/NeoPopButton';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Fonts } from '@/lib/fonts';
import * as Clipboard from 'expo-clipboard';
import { sendTestNotificationNow, requestNotificationPermissions } from '@/lib/notifications';
import { formatRelativeDate, formatCurrency } from '@/lib/formatters';

const chatGptLogo = require('@/assets/images/chatgpt-logo.png');
const claudeLogo = require('@/assets/images/claude-logo.png');
const museLogo = require('@/assets/images/muse-logo.png');

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, updateUserProfile, setAccountPassword } = useAuth();
  const {
    people,
    transactions,
    cards,
    isOnline,
    isSyncing,
    pendingSyncCount,
    reload,
    deletedItems,
    restoreDeletedItem,
    permanentlyDeleteTrashItem,
    emptyTrash,
  } = useData();
  const [showTrashModal, setShowTrashModal] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const topPad = Math.max(insets.top, webTopInset);
  const bottomPad = Math.max(insets.bottom, webBottomInset) + 80;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [activeAiModal, setActiveAiModal] = useState<'chatgpt' | 'claude' | 'muse' | null>(null);

  const handleSignOut = () => {
    const doSignOut = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      signOut();
    };
    if (Platform.OS === 'web') {
      if (confirm('Sign out of DebtFree?')) doSignOut();
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
      ]);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setEditError('Name cannot be empty');
      return;
    }
    setEditError('');
    setSaving(true);
    const result = await updateUserProfile({ displayName: editName.trim() });
    setSaving(false);
    if (result.error) {
      setEditError(result.error);
    } else {
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleStartEdit = () => {
    setEditName(user?.displayName || '');
    setEditError('');
    setIsEditing(true);
  };

  const initial = user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';

  const providerIds = user?.providerData?.map(p => p.providerId) || [];
  const hasGoogle = providerIds.includes('google.com');
  const hasPassword = providerIds.includes('password');

  const handleSavePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordSaving(true);
    const result = await setAccountPassword(newPassword);
    setPasswordSaving(false);
    if (result.error) {
      setPasswordError(result.error);
    } else {
      setPasswordSuccess(hasPassword ? 'Password updated successfully!' : 'Password set! You can now log in with email and password.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsSettingPassword(false);
        setPasswordSuccess('');
      }, 2500);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const [testingNotification, setTestingNotification] = useState(false);

  const handleTestNotification = async () => {
    if (testingNotification) return;
    setTestingNotification(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      const result = await sendTestNotificationNow();
      if (result.success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert('🔔 Notification Scheduled', result.message);
      } else {
        if (result.isExpoGoAndroid) {
          Alert.alert(
            '⚠️ Expo Go Notice',
            'Expo Go on Android (SDK 53+) disables OS system notification popups. A standalone APK or development build delivers system notifications. In-app due & overdue reminder badges are active.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Notification Notice', result.message);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not trigger test notification.');
    } finally {
      setTestingNotification(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad }}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.section}>
        <NeoPopCard color={Colors.surface} depth={3}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            {isEditing ? (
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>DISPLAY NAME</Text>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={(t) => { setEditName(t); setEditError(''); }}
                  placeholder="Your name"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />

                {editError ? (
                  <Text style={styles.editErrorText}>{editError}</Text>
                ) : null}

                <View style={styles.editActions}>
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Pressable onPress={() => setIsEditing(false)} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={handleSaveProfile} style={styles.saveBtn}>
                        <Text style={styles.saveText}>Save</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            ) : isSettingPassword ? (
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>{hasPassword ? 'CHANGE PASSWORD' : 'SET PASSWORD'}</Text>
                <Text style={styles.passwordHint}>
                  {hasPassword ? 'Update your password for email login' : 'Create a password so you can also log in directly using your email and password.'}
                </Text>

                <TextInput
                  style={styles.editInput}
                  value={newPassword}
                  onChangeText={(t) => { setNewPassword(t); setPasswordError(''); }}
                  placeholder="New password (min 6 chars)"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                />

                <TextInput
                  style={[styles.editInput, { marginTop: 10 }]}
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setPasswordError(''); }}
                  placeholder="Confirm password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry
                />

                {passwordError ? (
                  <Text style={styles.editErrorText}>{passwordError}</Text>
                ) : null}

                {passwordSuccess ? (
                  <Text style={styles.passwordSuccessText}>{passwordSuccess}</Text>
                ) : null}

                <View style={styles.editActions}>
                  {passwordSaving ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Pressable onPress={() => { setIsSettingPassword(false); setPasswordError(''); }} style={styles.cancelBtn}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={handleSavePassword} style={styles.saveBtn}>
                        <Text style={styles.saveText}>Save Password</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.userName}>{user?.displayName || 'DebtFree User'}</Text>
                <Text style={styles.userEmail}>{user?.email || ''}</Text>

                <View style={styles.providerRow}>
                  {hasGoogle && (
                    <View style={styles.providerBadge}>
                      <Icon name="logo-google" size={12} color={Colors.white} />
                      <Text style={styles.providerText}>Google</Text>
                    </View>
                  )}
                  {hasPassword && (
                    <View style={styles.providerBadge}>
                      <Icon name="mail" size={12} color={Colors.white} />
                      <Text style={styles.providerText}>Email</Text>
                    </View>
                  )}
                </View>

                <View style={styles.profileButtonRow}>
                  <Pressable onPress={handleStartEdit} style={styles.editProfileBtn}>
                    <Icon name="create-outline" size={16} color={Colors.primary} />
                    <Text style={styles.editProfileText}>Edit Profile</Text>
                  </Pressable>

                  <Pressable onPress={() => { setIsSettingPassword(true); setPasswordError(''); setPasswordSuccess(''); }} style={styles.passwordBtn}>
                    <Icon name="key-outline" size={16} color={Colors.white} />
                    <Text style={styles.passwordBtnText}>{hasPassword ? 'Change Password' : 'Set Password'}</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </NeoPopCard>
      </View>

      <View style={styles.section}>
        <NeoPopCard color={Colors.surface} depth={3}>
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>YOUR DATA</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{people.length}</Text>
                <Text style={styles.statLabel}>People</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{transactions.length}</Text>
                <Text style={styles.statLabel}>Transactions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{cards.length}</Text>
                <Text style={styles.statLabel}>Cards</Text>
              </View>
            </View>
            <View style={styles.syncBadge}>
              <Icon
                name={isSyncing ? 'sync' : isOnline ? 'cloud-done' : 'cloud-offline'}
                size={14}
                color={isSyncing ? Colors.primary : isOnline ? (pendingSyncCount > 0 ? '#F59E0B' : Colors.positive) : Colors.negative}
              />
              <Text style={[styles.syncText, !isOnline && { color: Colors.negative }]}>
                {isSyncing
                  ? 'Backing up to cloud...'
                  : !isOnline
                  ? `Offline • ${pendingSyncCount} changes not yet backed up`
                  : pendingSyncCount > 0
                  ? `${pendingSyncCount} changes pending sync`
                  : 'Synced with Firebase'}
              </Text>
            </View>
            {isOnline && pendingSyncCount > 0 && (
              <Pressable onPress={reload} style={styles.syncNowBtn}>
                <Text style={styles.syncNowText}>Sync Now</Text>
              </Pressable>
            )}
          </View>
        </NeoPopCard>
      </View>

      {/* Universal AI & MCP Integration */}
      <View style={styles.section}>
        <NeoPopCard color={Colors.surface} depth={3}>
          <View style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="sparkles" size={18} color={Colors.primary} />
                <Text style={styles.aiTitle}>AI ASSISTANT CONNECTIONS</Text>
              </View>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>MCP READY</Text>
              </View>
            </View>

            <Text style={styles.aiDescription}>
              Connect your DebtFree ledger to your favorite AI assistant. Tap an assistant below to open the setup guide with copyable credentials:
            </Text>

            {/* 3 Clickable Assistant Cards */}
            <View style={styles.assistantCardList}>
              <Pressable
                style={styles.assistantCard}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  setActiveAiModal('chatgpt');
                }}
              >
                <View style={[styles.assistantCardIconBox, { backgroundColor: '#1A1A1A', borderColor: '#404040' }]}>
                  <Image source={chatGptLogo} style={{ width: 28, height: 28 }} resizeMode="contain" />
                </View>
                <View style={styles.assistantCardInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.assistantCardTitle}>ChatGPT</Text>
                    <View style={styles.connectedBadge}><Text style={styles.connectedBadgeText}>CONNECT</Text></View>
                  </View>
                  <Text style={styles.assistantCardSubtitle}>Custom MCP App • Developer Mode</Text>
                </View>
                <Icon name="chevron-forward" size={16} color={Colors.primary} />
              </Pressable>

              <Pressable
                style={styles.assistantCard}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  setActiveAiModal('claude');
                }}
              >
                <View style={[styles.assistantCardIconBox, { backgroundColor: '#2B1A12', borderColor: '#D97706' }]}>
                  <Image source={claudeLogo} style={{ width: 28, height: 28, borderRadius: 5 }} resizeMode="contain" />
                </View>
                <View style={styles.assistantCardInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.assistantCardTitle}>Claude</Text>
                    <View style={styles.connectedBadge}><Text style={styles.connectedBadgeText}>CONNECT</Text></View>
                  </View>
                  <Text style={styles.assistantCardSubtitle}>Native MCP SSE • Web, Desktop & Mobile</Text>
                </View>
                <Icon name="chevron-forward" size={16} color={Colors.primary} />
              </Pressable>

              <Pressable
                style={styles.assistantCard}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  setActiveAiModal('muse');
                }}
              >
                <View style={[styles.assistantCardIconBox, { backgroundColor: '#FFFFFF', borderColor: '#3B82F6' }]}>
                  <Image source={museLogo} style={{ width: 28, height: 28, borderRadius: 5 }} resizeMode="contain" />
                </View>
                <View style={styles.assistantCardInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.assistantCardTitle}>Muse (Meta AI)</Text>
                    <View style={styles.connectedBadge}><Text style={styles.connectedBadgeText}>CONNECT</Text></View>
                  </View>
                  <Text style={styles.assistantCardSubtitle}>Secure Credentials Store • Meta AI</Text>
                </View>
                <Icon name="chevron-forward" size={16} color={Colors.primary} />
              </Pressable>
            </View>

            {/* Quick Endpoint Copy */}
            <View style={[styles.aiCredentialBlock, { marginTop: 12 }]}>
              <Text style={styles.aiCredLabel}>UNIVERSAL SERVER ENDPOINT</Text>
              <Pressable
                style={styles.aiCredBox}
                onPress={async () => {
                  await Clipboard.setStringAsync('https://debtfree-p2wx.onrender.com/sse');
                  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Copied!', 'MCP SSE endpoint copied to clipboard');
                }}
              >
                <Text style={styles.aiCredValue} numberOfLines={1}>https://debtfree-p2wx.onrender.com/sse</Text>
                <Icon name="copy-outline" size={14} color={Colors.primary} />
              </Pressable>
            </View>
          </View>
        </NeoPopCard>
      </View>

      {/* Notifications & Reminders Section */}
      <View style={styles.section}>
        <NeoPopCard color={Colors.surface} depth={3}>
          <View style={styles.notifCard}>
            <View style={styles.notifHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.notifIconBadge}>
                  <Icon name="notifications-outline" size={16} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.notifSectionTitle}>DUE DATE REMINDERS</Text>
                  <Text style={styles.notifSubtitle}>Day -2, Day -1 & Due Day alerts</Text>
                </View>
              </View>
            </View>

            <Text style={styles.notifDescription}>
              DebtFree automatically schedules reminders 2 days prior, 1 day prior, and on due dates at 9:00 AM & 8:30 PM.
            </Text>

            <View style={styles.notifButtonRow}>
              <Pressable
                style={[styles.testNotifBtn, testingNotification && styles.testNotifBtnDisabled]}
                onPress={handleTestNotification}
                disabled={testingNotification}
              >
                {testingNotification ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Icon name="sparkles" size={16} color="#000000" />
                    <Text style={styles.testNotifBtnText}>TEST NOTIFICATION NOW</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </NeoPopCard>
      </View>

      {/* Recently Deleted / Trash Bin Card */}
      <View style={styles.section}>
        <NeoPopCard color={Colors.surface} depth={3}>
          <Pressable
            style={styles.trashCard}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowTrashModal(true);
            }}
          >
            <View style={styles.trashCardLeft}>
              <View style={[styles.trashCardIconBox, deletedItems.length > 0 && styles.trashCardIconBoxActive]}>
                <Icon
                  name="trash-outline"
                  size={18}
                  color={deletedItems.length > 0 ? Colors.negative : Colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.trashCardTitle}>RECENTLY DELETED</Text>
                  {deletedItems.length > 0 && (
                    <View style={styles.trashCountBadge}>
                      <Text style={styles.trashCountBadgeText}>{deletedItems.length}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.trashCardSubtitle}>
                  {deletedItems.length === 0
                    ? 'Trash is empty • all contacts & txs safe'
                    : `${deletedItems.length} recoverable item${deletedItems.length === 1 ? '' : 's'}`}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={16} color={Colors.textMuted} />
          </Pressable>
        </NeoPopCard>
      </View>

      <View style={styles.section}>
        <NeoPopButton onPress={handleSignOut} variant="secondary">
          <View style={styles.signOutBtn}>
            <Icon name="log-out-outline" size={20} color={Colors.negative} />
            <Text style={styles.signOutText}>SIGN OUT</Text>
          </View>
        </NeoPopButton>
      </View>

      {/* POPUP / MODAL SCREEN FOR SELECTED AI */}
      <Modal
        visible={activeAiModal !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveAiModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.modalIconBadge, activeAiModal === 'claude' ? { backgroundColor: '#2B1A12', borderColor: '#D97706' } : activeAiModal === 'chatgpt' ? { backgroundColor: '#1A1A1A', borderColor: '#404040' } : { backgroundColor: '#FFFFFF', borderColor: '#3B82F6' }]}>
                  {activeAiModal === 'chatgpt' ? (
                    <Image source={chatGptLogo} style={{ width: 22, height: 22 }} resizeMode="contain" />
                  ) : activeAiModal === 'claude' ? (
                    <Image source={claudeLogo} style={{ width: 22, height: 22, borderRadius: 4 }} resizeMode="contain" />
                  ) : (
                    <Image source={museLogo} style={{ width: 22, height: 22, borderRadius: 4 }} resizeMode="contain" />
                  )}
                </View>
                <View>
                  <Text style={styles.modalTitleText}>
                    {activeAiModal === 'chatgpt' ? 'Connect to ChatGPT' : activeAiModal === 'claude' ? 'Connect to Claude' : 'Connect to Muse (Meta AI)'}
                  </Text>
                  <Text style={styles.modalSubtitleText}>Step-by-step setup guide</Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  setActiveAiModal(null);
                }}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={18} color={Colors.white} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* CHATGPT MODAL CONTENT */}
              {activeAiModal === 'chatgpt' && (
                <View style={{ gap: 12 }}>
                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>1</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Enable Developer Mode</Text>
                      <Text style={styles.aiStepText}>
                        On ChatGPT Web, open <Text style={{ color: Colors.primary }}>Settings → Security and login → Developer mode</Text> and toggle it ON.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>2</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Create MCP App</Text>
                      <Text style={styles.aiStepText}>
                        In Settings, go to <Text style={{ color: Colors.primary }}>Plugins / Advanced</Text> → tap the <Text style={{ color: Colors.primary }}>+</Text> icon → choose <Text style={{ color: Colors.primary }}>Create MCP App</Text>.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>3</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Enter Server URL</Text>
                      <Pressable
                        style={styles.copyableStepCard}
                        onPress={async () => {
                          await Clipboard.setStringAsync('https://debtfree-p2wx.onrender.com/mcp');
                          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert('Copied!', 'ChatGPT MCP URL copied');
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.copyCardLabel}>SERVER URL (TAP TO COPY)</Text>
                          <Text style={styles.copyCardValue}>https://debtfree-p2wx.onrender.com/mcp</Text>
                        </View>
                        <Icon name="copy-outline" size={14} color={Colors.primary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>4</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>OAuth Settings</Text>
                      <Text style={styles.aiStepText}>
                        Select Authentication: <Text style={{ color: Colors.white }}>OAuth</Text>. Tap <Text style={{ color: Colors.primary }}>Advanced OAuth settings</Text> and paste this Client ID:
                      </Text>
                      <Pressable
                        style={styles.copyableStepCard}
                        onPress={async () => {
                          await Clipboard.setStringAsync('debtfree-chatgpt');
                          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert('Copied!', 'Client ID copied');
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.copyCardLabel}>CLIENT ID (TAP TO COPY)</Text>
                          <Text style={styles.copyCardValue}>debtfree-chatgpt</Text>
                        </View>
                        <Icon name="copy-outline" size={14} color={Colors.primary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>5</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Connect & Prompt</Text>
                      <Text style={styles.aiStepText}>
                        Click <Text style={{ color: Colors.primary }}>Create</Text> → Sign in with Google or Email. Then ask in a new chat:
                      </Text>
                      <Pressable
                        style={styles.promptPill}
                        onPress={async () => {
                          await Clipboard.setStringAsync('What is my DebtFree summary and who owes me money?');
                          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert('Copied!', 'Prompt copied');
                        }}
                      >
                        <Text style={styles.promptPillText}>"What is my DebtFree summary and who owes me money?"</Text>
                        <Icon name="copy-outline" size={12} color={Colors.primary} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* CLAUDE MODAL CONTENT */}
              {activeAiModal === 'claude' && (
                <View style={{ gap: 12 }}>
                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>1</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Open Claude Connectors</Text>
                      <Text style={styles.aiStepText}>
                        In Claude (Desktop, Web, or Mobile app), go to <Text style={{ color: Colors.primary }}>Settings → Connectors</Text> (or tap Add Custom Connector).
                      </Text>
                    </View>
                  </View>

                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>2</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Paste MCP SSE URL</Text>
                      <Pressable
                        style={styles.copyableStepCard}
                        onPress={async () => {
                          await Clipboard.setStringAsync('https://debtfree-p2wx.onrender.com/sse');
                          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert('Copied!', 'Claude MCP SSE URL copied');
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.copyCardLabel}>CONNECTOR URL (TAP TO COPY)</Text>
                          <Text style={styles.copyCardValue}>https://debtfree-p2wx.onrender.com/sse</Text>
                        </View>
                        <Icon name="copy-outline" size={14} color={Colors.primary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>3</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Authenticate Account</Text>
                      <Text style={styles.aiStepText}>
                        Tap <Text style={{ color: Colors.primary }}>Connect</Text>. Sign in with Google or your DebtFree password to grant authorization.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>4</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Test in Claude Chat</Text>
                      <Text style={styles.aiStepText}>
                        Enable the DebtFree tool card and ask:
                      </Text>
                      <Pressable
                        style={styles.promptPill}
                        onPress={async () => {
                          await Clipboard.setStringAsync('Check my circle debts and list any overdue repayments.');
                          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert('Copied!', 'Prompt copied');
                        }}
                      >
                        <Text style={styles.promptPillText}>"Check my circle debts and list any overdue repayments."</Text>
                        <Icon name="copy-outline" size={12} color={Colors.primary} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* MUSE / META AI MODAL CONTENT */}
              {activeAiModal === 'muse' && (
                <View style={{ gap: 12 }}>
                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>1</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Open Credentials Store in Muse</Text>
                      <Text style={styles.aiStepText}>
                        In the Muse chat menu, tap <Text style={{ color: Colors.primary }}>Secure credentials store → Add custom connector</Text>.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>2</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Server Domain</Text>
                      <Pressable
                        style={styles.copyableStepCard}
                        onPress={async () => {
                          await Clipboard.setStringAsync('debtfree-p2wx.onrender.com');
                          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert('Copied!', 'Server domain copied');
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.copyCardLabel}>SERVER DOMAIN (TAP TO COPY)</Text>
                          <Text style={styles.copyCardValue}>debtfree-p2wx.onrender.com</Text>
                        </View>
                        <Icon name="copy-outline" size={14} color={Colors.primary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>3</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Client ID</Text>
                      <Pressable
                        style={styles.copyableStepCard}
                        onPress={async () => {
                          await Clipboard.setStringAsync('debtfree-client');
                          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert('Copied!', 'Client ID copied');
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.copyCardLabel}>CLIENT ID (TAP TO COPY)</Text>
                          <Text style={styles.copyCardValue}>debtfree-client</Text>
                        </View>
                        <Icon name="copy-outline" size={14} color={Colors.primary} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.aiStepRow}>
                    <View style={styles.stepNumBadge}><Text style={styles.stepNumText}>4</Text></View>
                    <View style={styles.stepContent}>
                      <Text style={styles.aiStepHeading}>Complete & Query</Text>
                      <Text style={styles.aiStepText}>
                        Tap <Text style={{ color: Colors.primary }}>Add</Text>. Then query your finances directly in Muse:
                      </Text>
                      <Pressable
                        style={styles.promptPill}
                        onPress={async () => {
                          await Clipboard.setStringAsync('Use DebtFree to show who owes me money right now.');
                          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          Alert.alert('Copied!', 'Prompt copied');
                        }}
                      >
                        <Text style={styles.promptPillText}>"Use DebtFree to show who owes me money right now."</Text>
                        <Icon name="copy-outline" size={12} color={Colors.primary} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <Pressable
              style={styles.modalDoneBtn}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setActiveAiModal(null);
              }}
            >
              <Text style={styles.modalDoneBtnText}>GOT IT, CLOSE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Recently Deleted Trash Bin Modal */}
      <Modal visible={showTrashModal} transparent animationType="slide" onRequestClose={() => setShowTrashModal(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowTrashModal(false)} />
        <View style={styles.trashSheet}>
          <View style={styles.sheetHandle} />
          
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
                  setShowTrashModal(false);
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
                const itemAmount = item.amount !== undefined ? item.amount : item.data?.amount;
                const itemDirection = item.direction || item.data?.direction;
                const isLent = itemDirection === 'YOU_LENT';
                const hasAmount = itemAmount !== undefined && (isTx || itemAmount > 0);

                return (
                  <View key={item.id} style={styles.trashItemRow}>
                    <View style={styles.trashItemInfo}>
                      <View style={styles.trashItemTopLine}>
                        <View style={[styles.trashItemBadge, { backgroundColor: badgeBg }]}>
                          <Text style={[styles.trashItemBadgeText, { color: badgeColor }]}>{item.type}</Text>
                        </View>
                        <Text style={styles.trashItemTime}>{formatRelativeDate(item.deletedAt)}</Text>
                      </View>
                      <View style={styles.trashItemTitleRow}>
                        <Text style={styles.trashItemTitle} numberOfLines={1}>{item.title}</Text>
                        {hasAmount && (
                          <Text
                            style={[
                              styles.trashItemAmount,
                              { color: isLent ? Colors.positive : Colors.negative }
                            ]}
                          >
                            {formatCurrency(itemAmount)}
                          </Text>
                        )}
                      </View>
                      {item.subtitle ? (
                        <Text style={styles.trashItemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                      ) : null}
                    </View>

                    <View style={styles.trashItemActions}>
                      <Pressable
                        style={styles.restoreBtn}
                        onPress={async () => {
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                          if (item.type === 'TRANSACTION') {
                            const txPersonId = item.data?.personId;
                            const isPersonActive = people.some(p => p.id === txPersonId);

                            if (!isPersonActive) {
                              const deletedPersonItem = deletedItems.find(d => d.type === 'PERSON' && d.data?.id === txPersonId);
                              const personName = deletedPersonItem?.title || item.title.replace(/^(Lent to|Borrowed from)\s*/i, '') || 'The contact';

                              if (deletedPersonItem) {
                                const doRestoreBoth = async () => {
                                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                  await restoreDeletedItem(item.id, { alsoRestoreTrashIds: [deletedPersonItem.id] });
                                };

                                if (Platform.OS === 'web') {
                                  if (confirm(`"${personName}" is currently deleted. To restore this transaction, "${personName}" will also be restored. Proceed?`)) {
                                    doRestoreBoth();
                                  }
                                } else {
                                  Alert.alert(
                                    'Restore Contact First',
                                    `"${personName}" is currently deleted. To restore this transaction, "${personName}" will also be restored to your circle.\n\nRestore both?`,
                                    [
                                      { text: 'Cancel', style: 'cancel' },
                                      { text: 'Restore Both', onPress: doRestoreBoth },
                                    ]
                                  );
                                }
                                return;
                              } else {
                                if (Platform.OS === 'web') {
                                  alert(`Cannot restore transaction: "${personName}" has been permanently deleted and is no longer available.`);
                                } else {
                                  Alert.alert(
                                    'Cannot Restore Transaction',
                                    `The contact "${personName}" was deleted and is no longer in trash. It cannot be restored without an active contact.`,
                                    [{ text: 'OK' }]
                                  );
                                }
                                return;
                              }
                            }
                          }

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.serif,
    color: Colors.white,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  profileCard: {
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(229, 254, 64, 0.15)',
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  userName: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  providerText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.textSecondary,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editProfileText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.primary,
  },
  editSection: {
    width: '100%',
    paddingHorizontal: 4,
  },
  editLabel: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  editInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 14,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  editErrorText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.negative,
    marginTop: 6,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  saveText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: '#000',
  },
  statsCard: {
    padding: 20,
  },
  statsTitle: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontFamily: Fonts.serif,
    color: Colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  syncText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.positive,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  signOutText: {
    fontSize: 14,
    fontFamily: Fonts.semibold,
    color: Colors.negative,
    letterSpacing: 1,
  },
  profileButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  passwordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  passwordBtnText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.white,
  },
  passwordHint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginBottom: 12,
    lineHeight: 16,
  },
  passwordSuccessText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.positive,
    marginTop: 8,
    textAlign: 'center',
  },
  syncNowBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: 'rgba(229, 254, 64, 0.1)',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  syncNowText: {
    fontSize: 11,
    fontFamily: Fonts.semibold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  aiCard: {
    padding: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiTitle: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.white,
    letterSpacing: 1.5,
  },
  aiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#1E1E14',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  aiBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  aiDescription: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  aiCredentialBlock: {
    marginBottom: 12,
  },
  aiCredLabel: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  aiCredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  aiCredValue: {
    fontSize: 12,
    fontFamily: Fonts.serif,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  aiSupportedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  aiAgentChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
  },
  aiAgentText: {
    fontSize: 10,
    fontFamily: Fonts.medium,
    color: Colors.textMuted,
  },
  aiGuideToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181814',
    borderWidth: 1,
    borderColor: 'rgba(229, 254, 64, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  aiGuideToggleText: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    color: Colors.primary,
    letterSpacing: 1,
  },
  aiGuideContainer: {
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#262626',
    padding: 10,
    marginBottom: 12,
  },
  aiTabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  aiTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  aiTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  aiTabText: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  aiTabTextActive: {
    color: '#000000',
    fontFamily: Fonts.bold,
  },
  aiStepBox: {
    gap: 6,
  },
  aiStepTitle: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  aiStepText: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  aiStepCode: {
    fontSize: 10,
    fontFamily: Fonts.serif,
    color: Colors.textMuted,
    backgroundColor: '#161616',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  aiGuideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#202020',
    paddingBottom: 8,
  },
  aiStepMainTitle: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 0.8,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 8,
    fontFamily: Fonts.bold,
    letterSpacing: 0.5,
  },
  aiStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  stepNumBadge: {
    width: 20,
    height: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#000000',
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  aiStepHeading: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  copyableStepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  copyCardLabel: {
    fontSize: 8,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  copyCardValue: {
    fontSize: 11,
    fontFamily: Fonts.serif,
    color: Colors.textSecondary,
  },
  promptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161910',
    borderWidth: 1,
    borderColor: 'rgba(229, 254, 64, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
    gap: 8,
  },
  promptPillText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.primary,
    fontStyle: 'italic',
    flex: 1,
  },
  assistantCardList: {
    gap: 10,
    marginTop: 6,
  },
  assistantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#262626',
    padding: 12,
    gap: 12,
  },
  assistantCardIconBox: {
    width: 38,
    height: 38,
    backgroundColor: '#122615',
    borderWidth: 1,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantEmoji: {
    fontSize: 18,
  },
  assistantCardInfo: {
    flex: 1,
    gap: 2,
  },
  assistantCardTitle: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  assistantCardSubtitle: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  connectedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#191C0E',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  connectedBadgeText: {
    fontSize: 8,
    fontFamily: Fonts.bold,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    backgroundColor: '#101010',
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#2A2A2A',
    maxHeight: '85%',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222222',
    paddingBottom: 14,
  },
  modalIconBadge: {
    width: 32,
    height: 32,
    backgroundColor: '#1C1C14',
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  modalSubtitleText: {
    fontSize: 10,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  modalCloseBtn: {
    padding: 6,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalScrollBody: {
    maxHeight: 460,
  },
  modalDoneBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
    boxShadow: '3px 3px 0px #FFFFFF',
  },
  modalDoneBtnText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 1,
  },
  notifCard: {
    padding: 16,
    gap: 12,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 0,
    backgroundColor: '#1C1C14',
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifSectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 1,
  },
  notifSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  notifDescription: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  notifButtonRow: {
    marginTop: 4,
  },
  testNotifBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    boxShadow: '3px 3px 0px #FFFFFF',
  },
  testNotifBtnDisabled: {
    opacity: 0.6,
  },
  testNotifBtnText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: '#000000',
    letterSpacing: 1,
  },
  trashCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trashCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  trashCardIconBox: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashCardIconBoxActive: {
    backgroundColor: 'rgba(238, 77, 55, 0.12)',
    borderColor: Colors.negative,
  },
  trashCardTitle: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 1,
  },
  trashCardSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
    marginTop: 2,
  },
  trashCountBadge: {
    backgroundColor: Colors.negative,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  trashCountBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
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
  trashItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  trashItemTitle: {
    fontSize: 15,
    fontFamily: Fonts.semibold,
    color: Colors.white,
    flex: 1,
  },
  trashItemAmount: {
    fontSize: 14,
    fontFamily: Fonts.bold,
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
