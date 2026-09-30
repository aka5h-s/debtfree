import React, { useState } from 'react';
import { StyleSheet, Text, View, Platform, Pressable, Alert, TextInput, ActivityIndicator, ScrollView } from 'react-native';
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, updateUserProfile, setAccountPassword } = useAuth();
  const { people, transactions, cards, isOnline, isSyncing, pendingSyncCount, reload } = useData();
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
  const [showAiInstructions, setShowAiInstructions] = useState(false);
  const [selectedAgentTab, setSelectedAgentTab] = useState<'chatgpt' | 'claude' | 'general'>('chatgpt');

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
                <Icon name="hardware-chip-outline" size={18} color={Colors.primary} />
                <Text style={styles.aiTitle}>AI INTEGRATION (MCP)</Text>
              </View>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>UNIVERSAL</Text>
              </View>
            </View>

            <Text style={styles.aiDescription}>
              Permanent 24/7 AI server is live. Connect ChatGPT, Gemini, Llama, or Claude to manage people and debts.
            </Text>

            <View style={styles.aiCredentialBlock}>
              <Text style={styles.aiCredLabel}>LIVE SERVER URL</Text>
              <Pressable
                style={styles.aiCredBox}
                onPress={async () => {
                  await Clipboard.setStringAsync('https://debtfree-p2wx.onrender.com');
                  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Copied', 'Server URL copied to clipboard');
                }}
              >
                <Text style={styles.aiCredValue} numberOfLines={1}>https://debtfree-p2wx.onrender.com</Text>
                <Icon name="copy-outline" size={14} color={Colors.primary} />
              </Pressable>
            </View>

            <View style={styles.aiCredentialBlock}>
              <Text style={styles.aiCredLabel}>OPENAPI SCHEMA URL (FOR CHATGPT / GEMINI)</Text>
              <Pressable
                style={styles.aiCredBox}
                onPress={async () => {
                  await Clipboard.setStringAsync('https://debtfree-p2wx.onrender.com/openapi.json');
                  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Copied', 'OpenAPI Schema URL copied to clipboard');
                }}
              >
                <Text style={styles.aiCredValue} numberOfLines={1}>https://debtfree-p2wx.onrender.com/openapi.json</Text>
                <Icon name="copy-outline" size={14} color={Colors.primary} />
              </Pressable>
            </View>

            <View style={styles.aiCredentialBlock}>
              <Text style={styles.aiCredLabel}>YOUR USER ID</Text>
              <Pressable
                style={styles.aiCredBox}
                onPress={async () => {
                  if (user?.uid) {
                    await Clipboard.setStringAsync(user.uid);
                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert('Copied', 'User ID copied to clipboard');
                  }
                }}
              >
                <Text style={styles.aiCredValue} numberOfLines={1}>{user?.uid || 'Not signed in'}</Text>
                <Icon name="copy-outline" size={14} color={Colors.primary} />
              </Pressable>
            </View>

            <View style={styles.aiCredentialBlock}>
              <Text style={styles.aiCredLabel}>AI SECRET API KEY</Text>
              <Pressable
                style={styles.aiCredBox}
                onPress={async () => {
                  await Clipboard.setStringAsync('df_sec_d20a49e1cdd3f8bff33018574b1d5320');
                  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Copied', 'Secret API key copied to clipboard');
                }}
              >
                <Text style={styles.aiCredValue} numberOfLines={1}>df_sec_d20a49e1cdd3f8bff33018574b1d5320</Text>
                <Icon name="copy-outline" size={14} color={Colors.primary} />
              </Pressable>
            </View>

            {/* Toggleable How-to-connect instructions */}
            <Pressable
              style={styles.aiGuideToggle}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.selectionAsync();
                setShowAiInstructions(!showAiInstructions);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Icon name="book-outline" size={14} color={Colors.primary} />
                <Text style={styles.aiGuideToggleText}>
                  {showAiInstructions ? 'HIDE CONNECTION GUIDE' : 'HOW TO CONNECT (STEP-BY-STEP)'}
                </Text>
              </View>
              <Icon name={showAiInstructions ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.primary} />
            </Pressable>

            {showAiInstructions && (
              <View style={styles.aiGuideContainer}>
                {/* Agent Selector Tabs */}
                <View style={styles.aiTabRow}>
                  <Pressable
                    style={[styles.aiTab, selectedAgentTab === 'chatgpt' && styles.aiTabActive]}
                    onPress={() => setSelectedAgentTab('chatgpt')}
                  >
                    <Text style={[styles.aiTabText, selectedAgentTab === 'chatgpt' && styles.aiTabTextActive]}>ChatGPT</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.aiTab, selectedAgentTab === 'claude' && styles.aiTabActive]}
                    onPress={() => setSelectedAgentTab('claude')}
                  >
                    <Text style={[styles.aiTabText, selectedAgentTab === 'claude' && styles.aiTabTextActive]}>Claude</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.aiTab, selectedAgentTab === 'general' && styles.aiTabActive]}
                    onPress={() => setSelectedAgentTab('general')}
                  >
                    <Text style={[styles.aiTabText, selectedAgentTab === 'general' && styles.aiTabTextActive]}>Gemini/Llama</Text>
                  </Pressable>
                </View>

                {selectedAgentTab === 'chatgpt' && (
                  <View style={styles.aiStepBox}>
                    <Text style={styles.aiStepTitle}>CONNECT TO CHATGPT (PLUGINS & AGENTS):</Text>
                    <Text style={styles.aiStepText}>1. Connect via Plugin or Custom Action using Schema URL:</Text>
                    <Text style={[styles.aiStepCode, { color: Colors.primary }]}>https://debtfree-p2wx.onrender.com/openapi.json</Text>
                    <Text style={styles.aiStepText}>2. For Authentication, choose "OAuth" or "API Key".</Text>
                    <Text style={styles.aiStepText}>3. When prompted, tap "Sign in with Google" or enter your DebtFree account Email & Password.</Text>
                    <Text style={styles.aiStepText}>4. Once linked, ChatGPT automatically knows your identity—no manual User ID or token typing needed!</Text>
                    <Text style={styles.aiStepText}>5. Ask on your phone: "Who owes me money?", "Record lent ₹500 to Rahul".</Text>
                  </View>
                )}

                {selectedAgentTab === 'claude' && (
                  <View style={styles.aiStepBox}>
                    <Text style={styles.aiStepTitle}>CONNECT TO CLAUDE / MCP CLIENTS:</Text>
                    <Text style={styles.aiStepText}>1. Use Native MCP Server URL (SSE Transport):</Text>
                    <Text style={[styles.aiStepCode, { color: Colors.primary }]}>https://debtfree-p2wx.onrender.com/sse</Text>
                    <Text style={styles.aiStepText}>2. Add custom header in your config:</Text>
                    <Text style={styles.aiStepCode}>x-api-key: df_sec_d20a49e1cdd3f8bff33018574b1d5320</Text>
                    <Text style={styles.aiStepText}>3. Claude can invoke list_people, add_transaction, get_summary, and get_due_and_overdue natively.</Text>
                  </View>
                )}

                {selectedAgentTab === 'general' && (
                  <View style={styles.aiStepBox}>
                    <Text style={styles.aiStepTitle}>CONNECT TO GEMINI / LLAMA / AGENTS:</Text>
                    <Text style={styles.aiStepText}>1. Any agent framework (LangChain, LlamaIndex, AutoGen) can import the OpenAPI 3.1 specification.</Text>
                    <Text style={styles.aiStepText}>2. All REST endpoints (/api/people, /api/transactions, /api/summary, /api/due) require the x-api-key header.</Text>
                    <Text style={styles.aiStepText}>3. Pass userId={user?.uid || 'YOUR_USER_ID'} as a query parameter or body field.</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.aiSupportedRow}>
              {['ChatGPT', 'Gemini', 'Llama', 'Claude', 'Cursor'].map(agent => (
                <View key={agent} style={styles.aiAgentChip}>
                  <Text style={styles.aiAgentText}>{agent}</Text>
                </View>
              ))}
            </View>
          </View>
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
});
