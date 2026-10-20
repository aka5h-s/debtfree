import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import {
  Pencil,
  KeyRound,
  ChevronRight,
  RefreshCw,
  Copy,
  RotateCcw,
  X,
  Sparkles,
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
  DotGrid,
  Sheet,
  Field,
  haptic,
  formatRupees,
} from '@/src/design';
import { useToast } from '@/components/neo/Toast';
import { formatRelativeDate } from '@/lib/formatters';
import type { DeletedItem } from '@/lib/types';

type AssistantType = 'chatgpt' | 'claude' | 'muse';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, updateUserProfile, changeUserPassword } = useAuth();
  const { showToast } = useToast();
  const {
    people,
    transactions,
    cards,
    accounts,
    loans,
    deletedItems,
    isOnline,
    isSyncing,
    reload,
    restoreDeletedItem,
    permanentlyDeleteTrashItem,
    emptyTrash,
  } = useData();

  // Edit Profile Sheet
  const [showEditProfileSheet, setShowEditProfileSheet] = useState(false);
  const [profileName, setProfileName] = useState(user?.displayName || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password Sheet
  const [showPasswordSheet, setShowPasswordSheet] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // AI Assistant Setup Sheet
  const [activeAssistant, setActiveAssistant] = useState<AssistantType | null>(null);

  // Recently Deleted Sheet
  const [showTrashSheet, setShowTrashSheet] = useState(false);

  // Manual Syncing
  const [manualSyncing, setManualSyncing] = useState(false);

  const initial =
    user?.displayName?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    'A';

  const isGoogleUser = useMemo(() => {
    // Check if user signs in with Google without password
    if (!user) return false;
    const providers = user.providerData?.map((p) => p.providerId) || [];
    return providers.includes('google.com') && !providers.includes('password');
  }, [user]);

  const handleCopyText = async (text: string, label: string) => {
    haptic('light');
    await Clipboard.setStringAsync(text);
    showToast(`${label} copied`);
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) {
      showToast("Name can't be empty");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await updateUserProfile({ displayName: profileName.trim() });
      if (res.error) {
        showToast(res.error);
      } else {
        showToast('Profile updated');
        setShowEditProfileSheet(false);
      }
    } catch (e: any) {
      showToast(e.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      showToast('Enter your current password');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords don't match");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await changeUserPassword(currentPassword, newPassword);
      if (res.error) {
        showToast(res.error);
      } else {
        showToast('Password changed');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSheet(false);
      }
    } catch (e: any) {
      showToast(e.message || "Couldn't change password");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleManualSync = async () => {
    haptic('light');
    setManualSyncing(true);
    try {
      await reload();
      showToast('Data synced');
    } catch (e: any) {
      showToast('Sync failed');
    } finally {
      setManualSyncing(false);
    }
  };

  const handleRestoreItem = async (item: DeletedItem) => {
    haptic('light');
    try {
      await restoreDeletedItem(item.id);
      showToast(`Restored "${item.title}"`);
    } catch (e: any) {
      showToast('Failed to restore');
    }
  };

  const handleDeleteForeverItem = async (item: DeletedItem) => {
    haptic('heavy');
    try {
      await permanentlyDeleteTrashItem(item.id);
      showToast('Item deleted permanently');
    } catch (e: any) {
      showToast('Failed to delete');
    }
  };

  const handleConfirmEmptyTrash = () => {
    haptic('heavy');
    Alert.alert(
      'Empty trash',
      'Delete everything in the trash forever?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Empty All',
          style: 'destructive',
          onPress: async () => {
            try {
              await emptyTrash();
              showToast('Trash emptied');
            } catch (e: any) {
              showToast('Failed to empty trash');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    haptic('heavy');
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
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
      >
        {/* 3a. Title: Just "Profile" in Fraunces Black 36px */}
        <Text style={styles.screenTitle}>Profile</Text>

        {/* 3b. Profile Card with dotted background, 20px padding */}
        <NeoCard face="dark" depth={4} style={styles.profileCard}>
          <DotGrid opacity={0.09} />

          <View style={styles.profileHeaderRow}>
            {/* Avatar 64x64 poli-yellow block with 4px NeoPOP extrusion */}
            <NeoCard face="poli" depth={4} style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{initial}</Text>
            </NeoCard>

            <View style={{ flex: 1, gap: 4 }}>
              <Text numberOfLines={1} style={styles.profileDisplayName}>
                {user?.displayName || 'DebtFree User'}
              </Text>
              <Text numberOfLines={1} style={styles.profileEmail}>
                {user?.email || 'Logged in'}
              </Text>
            </View>
          </View>

          {/* 20px below: two slim rows split by 1px lines (top border too) */}
          <View style={{ marginTop: 20 }}>
            <Pressable
              onPress={() => {
                haptic('light');
                setProfileName(user?.displayName || '');
                setShowEditProfileSheet(true);
              }}
              style={styles.slimActionRow}
            >
              <View style={styles.slimActionLeft}>
                <Pencil size={16} color={C.primary} />
                <Text style={styles.slimActionText}>Edit profile</Text>
              </View>
              <ChevronRight size={16} color={C.mutedFg} />
            </Pressable>

            <View style={styles.cardDivider} />

            <Pressable
              onPress={() => {
                haptic('light');
                setShowPasswordSheet(true);
              }}
              style={styles.slimActionRow}
            >
              <View style={styles.slimActionLeft}>
                <KeyRound size={16} color={C.primary} />
                <Text style={styles.slimActionText}>Change password</Text>
              </View>
              <ChevronRight size={16} color={C.mutedFg} />
            </Pressable>
          </View>
        </NeoCard>

        {/* 3c. Cloud sync: CLOUD SYNC eyebrow ABOVE the card */}
        <View style={{ gap: 8 }}>
          <Eyebrow>CLOUD SYNC</Eyebrow>
          <NeoCard
            face={!isOnline ? 'red' : 'green'}
            depth={3}
            style={styles.syncCard}
          >
            <View style={styles.syncHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                <View
                  style={[
                    styles.syncDot,
                    { backgroundColor: !isOnline ? C.negative : C.positive },
                  ]}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.syncStatusText}>
                    {!isOnline
                      ? 'Offline'
                      : isSyncing
                      ? 'Syncing…'
                      : 'All synced'}
                  </Text>
                  <Text style={styles.syncSubtext}>
                    Data is saved to your DebtFree account.
                  </Text>
                </View>
              </View>

              {/* Small dark raised icon-only refresh button */}
              <NeoButton
                variant="dark"
                size="sm"
                icon={
                  <RefreshCw
                    size={15}
                    color={C.foreground}
                    style={manualSyncing ? styles.spin : undefined}
                  />
                }
                onPress={handleManualSync}
                disabled={manualSyncing}
                style={{ width: 36, height: 36, paddingHorizontal: 0 }}
              />
            </View>
          </NeoCard>
        </View>

        {/* 3d. On this phone */}
        <View style={{ gap: 8 }}>
          <Eyebrow>ON THIS PHONE</Eyebrow>
          <NeoCard face="poli" depth={3} style={styles.onPhoneCard}>
            <Text style={styles.onPhoneTitle}>Running as an app</Text>
            <Text style={styles.onPhoneSub}>
              Opens full screen from its own home-screen icon — no browser bar.
            </Text>
          </NeoCard>
        </View>

        {/* 3e. Your Data: 3x2 grid with 16px gaps, each tile a NeoCard with extrusion */}
        <View style={{ gap: 10 }}>
          <Eyebrow>YOUR DATA</Eyebrow>
          <View style={styles.dataCountsGrid}>
            <View style={styles.gridTileWrapper}>
              <NeoCard face="dark" depth={3} style={styles.countBox}>
                <Text style={styles.countNumber}>{people.length}</Text>
                <Eyebrow style={{ fontSize: 9 }}>PEOPLE</Eyebrow>
              </NeoCard>
            </View>

            <View style={styles.gridTileWrapper}>
              <NeoCard face="dark" depth={3} style={styles.countBox}>
                <Text style={styles.countNumber}>{transactions.length}</Text>
                <Eyebrow style={{ fontSize: 9 }}>ENTRIES</Eyebrow>
              </NeoCard>
            </View>

            <View style={styles.gridTileWrapper}>
              <NeoCard face="dark" depth={3} style={styles.countBox}>
                <Text style={styles.countNumber}>{cards.length}</Text>
                <Eyebrow style={{ fontSize: 9 }}>CARDS</Eyebrow>
              </NeoCard>
            </View>

            <View style={styles.gridTileWrapper}>
              <NeoCard face="dark" depth={3} style={styles.countBox}>
                <Text style={styles.countNumber}>{accounts.length}</Text>
                <Eyebrow style={{ fontSize: 9 }}>ACCOUNTS</Eyebrow>
              </NeoCard>
            </View>

            <View style={styles.gridTileWrapper}>
              <NeoCard face="dark" depth={3} style={styles.countBox}>
                <Text style={styles.countNumber}>{loans.length}</Text>
                <Eyebrow style={{ fontSize: 9 }}>LOANS</Eyebrow>
              </NeoCard>
            </View>

            <View style={styles.gridTileWrapper}>
              <NeoCard face="dark" depth={3} style={styles.countBox}>
                <Text style={styles.countNumber}>{deletedItems.length}</Text>
                <Eyebrow style={{ fontSize: 9 }}>DELETED</Eyebrow>
              </NeoCard>
            </View>
          </View>
        </View>

        {/* 3f. AI Assistants */}
        <View style={{ gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Eyebrow>AI ASSISTANTS</Eyebrow>
            <Text style={styles.sectionSubtitle}>
              Ask your AI about your debts. Tap one for the setup guide.
            </Text>
          </View>

          <View style={{ gap: 10 }}>
            {/* ChatGPT */}
            <NeoCard
              face="dark"
              depth={3}
              press
              onPress={() => {
                haptic('light');
                setActiveAssistant('chatgpt');
              }}
              style={styles.assistantCard}
            >
              <View style={styles.assistantIconWhite}>
                <Text style={styles.chatGptIconText}>G</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.assistantTitle}>ChatGPT</Text>
                <Text style={styles.assistantSubtitle}>
                  Custom MCP app · Developer mode
                </Text>
              </View>
              <ChevronRight size={18} color={C.primary} />
            </NeoCard>

            {/* Claude */}
            <NeoCard
              face="dark"
              depth={3}
              press
              onPress={() => {
                haptic('light');
                setActiveAssistant('claude');
              }}
              style={styles.assistantCard}
            >
              <View style={styles.assistantIconRed}>
                <Text style={styles.claudeIconText}>✳</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.assistantTitle}>Claude</Text>
                <Text style={styles.assistantSubtitle}>
                  Native MCP · Web, desktop & mobile
                </Text>
              </View>
              <ChevronRight size={18} color={C.primary} />
            </NeoCard>

            {/* Muse */}
            <NeoCard
              face="dark"
              depth={3}
              press
              onPress={() => {
                haptic('light');
                setActiveAssistant('muse');
              }}
              style={styles.assistantCard}
            >
              <View style={styles.assistantIconDark}>
                <Text style={styles.museIconText}>m</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.assistantTitle}>Muse (Meta AI)</Text>
                <Text style={styles.assistantSubtitle}>
                  Secure credentials store · Meta AI
                </Text>
              </View>
              <ChevronRight size={18} color={C.primary} />
            </NeoCard>
          </View>

          {/* Copy Universal Endpoint Box */}
          <Pressable
            onPress={() =>
              handleCopyText(
                'https://debtfree-p2wx.onrender.com/sse',
                'Universal endpoint'
              )
            }
          >
            <NeoCard face="dark" depth={2} style={styles.copyEndpointBox}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.copyBoxLabel}>
                  UNIVERSAL SERVER ENDPOINT · TAP TO COPY
                </Text>
                <Text numberOfLines={1} style={styles.copyBoxValue}>
                  https://debtfree-p2wx.onrender.com/sse
                </Text>
              </View>
              <Copy size={16} color={C.primary} />
            </NeoCard>
          </Pressable>
        </View>

        {/* 3f. Recently Deleted (Pressable NeoCard with red extrusion) */}
        <Pressable
          onPress={() => {
            haptic('light');
            setShowTrashSheet(true);
          }}
        >
          <NeoCard face="red" depth={3} style={styles.recentlyDeletedRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Eyebrow style={{ color: '#FFFFFF' }}>RECENTLY DELETED</Eyebrow>
              <View style={styles.trashCountBadge}>
                <Text style={styles.trashCountText}>{deletedItems.length}</Text>
              </View>
            </View>
            <ChevronRight size={18} color={C.mutedFg} />
          </NeoCard>
        </Pressable>

        {/* 3f. Sign out: Full-width red raised button */}
        <View style={{ marginTop: 8 }}>
          <NeoButton
            label="SIGN OUT"
            variant="red"
            size="md"
            fullWidth
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>

      {/* Edit Profile Sheet */}
      <Sheet
        visible={showEditProfileSheet}
        onClose={() => setShowEditProfileSheet(false)}
        title="Edit profile"
        footer={
          <TiltButton onPress={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? 'SAVING…' : 'SAVE CHANGES'}
          </TiltButton>
        }
      >
        <Field
          label="DISPLAY NAME"
          placeholder="Your full name"
          value={profileName}
          onChangeText={setProfileName}
        />
      </Sheet>

      {/* Change Password Sheet */}
      <Sheet
        visible={showPasswordSheet}
        onClose={() => setShowPasswordSheet(false)}
        title="Change password"
        footer={
          !isGoogleUser ? (
            <TiltButton
              onPress={handleUpdatePassword}
              disabled={updatingPassword}
            >
              {updatingPassword ? 'UPDATING…' : 'UPDATE PASSWORD'}
            </TiltButton>
          ) : undefined
        }
      >
        {isGoogleUser ? (
          <View style={styles.googleNoticeBox}>
            <Text style={styles.googleNoticeText}>
              You sign in with Google, so your password is managed by your Google
              account.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Field
              label="CURRENT PASSWORD"
              secureTextEntry
              placeholder="Enter current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <Field
              label="NEW PASSWORD"
              secureTextEntry
              placeholder="At least 6 characters"
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Field
              label="CONFIRM NEW PASSWORD"
              secureTextEntry
              placeholder="Repeat new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>
        )}
      </Sheet>

      {/* AI Assistant Setup Sheet (7.3) */}
      <Sheet
        visible={!!activeAssistant}
        onClose={() => setActiveAssistant(null)}
        title={`Connect to ${
          activeAssistant === 'chatgpt'
            ? 'ChatGPT'
            : activeAssistant === 'claude'
            ? 'Claude'
            : 'Muse'
        }`}
        maxHeightRatio={0.92}
      >
        {activeAssistant === 'chatgpt' && (
          <View style={{ gap: 16 }}>
            {/* Step 1 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stepTitle}>Enable Developer Mode</Text>
                <Text style={styles.stepDesc}>
                  Settings → Security and login → Developer mode
                </Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stepTitle}>Create MCP App</Text>
                <Text style={styles.stepDesc}>
                  Settings → Plugins / Advanced → + → Create MCP App
                </Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.stepTitle}>Enter Server URL</Text>
                <Pressable
                  onPress={() =>
                    handleCopyText(
                      'https://debtfree-p2wx.onrender.com/mcp',
                      'Server URL'
                    )
                  }
                  style={styles.stepCopyBox}
                >
                  <Text numberOfLines={1} style={styles.stepCopyText}>
                    https://debtfree-p2wx.onrender.com/mcp
                  </Text>
                  <Copy size={14} color={C.primary} />
                </Pressable>
              </View>
            </View>

            {/* Step 4 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.stepTitle}>OAuth Settings</Text>
                <Text style={styles.stepDesc}>
                  Authentication: OAuth → Advanced OAuth settings
                </Text>
                <Pressable
                  onPress={() =>
                    handleCopyText('debtfree-chatgpt', 'Client ID')
                  }
                  style={styles.stepCopyBox}
                >
                  <Text style={styles.stepCopyText}>debtfree-chatgpt</Text>
                  <Copy size={14} color={C.primary} />
                </Pressable>
              </View>
            </View>

            {/* Step 5 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.stepTitle}>Connect & Prompt</Text>
                <Text style={styles.stepDesc}>Create → sign in</Text>
                <View style={styles.promptBox}>
                  <Text style={styles.promptText}>
                    "Who owes me money in DebtFree right now?"
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeAssistant === 'claude' && (
          <View style={{ gap: 16 }}>
            {/* Step 1 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stepTitle}>Open Claude Connectors</Text>
                <Text style={styles.stepDesc}>
                  Settings → Connectors / Add custom connector
                </Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.stepTitle}>Paste MCP SSE URL</Text>
                <Pressable
                  onPress={() =>
                    handleCopyText(
                      'https://debtfree-p2wx.onrender.com/sse',
                      'MCP SSE URL'
                    )
                  }
                  style={styles.stepCopyBox}
                >
                  <Text numberOfLines={1} style={styles.stepCopyText}>
                    https://debtfree-p2wx.onrender.com/sse
                  </Text>
                  <Copy size={14} color={C.primary} />
                </Pressable>
              </View>
            </View>

            {/* Step 3 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stepTitle}>Authenticate Account</Text>
                <Text style={styles.stepDesc}>
                  Connect → sign in with Google or DebtFree password
                </Text>
              </View>
            </View>

            {/* Step 4 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.stepTitle}>Test in Claude Chat</Text>
                <View style={styles.promptBox}>
                  <Text style={styles.promptText}>
                    "Check my circle debts and list any overdue repayments."
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeAssistant === 'muse' && (
          <View style={{ gap: 16 }}>
            {/* Step 1 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stepTitle}>
                  Open Credentials Store in Muse
                </Text>
                <Text style={styles.stepDesc}>
                  chat menu → Secure credentials store → Add custom connector
                </Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.stepTitle}>Server Domain</Text>
                <Pressable
                  onPress={() =>
                    handleCopyText(
                      'debtfree-p2wx.onrender.com',
                      'Server domain'
                    )
                  }
                  style={styles.stepCopyBox}
                >
                  <Text style={styles.stepCopyText}>
                    debtfree-p2wx.onrender.com
                  </Text>
                  <Copy size={14} color={C.primary} />
                </Pressable>
              </View>
            </View>

            {/* Step 3 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.stepTitle}>Client ID</Text>
                <Pressable
                  onPress={() => handleCopyText('debtfree-client', 'Client ID')}
                  style={styles.stepCopyBox}
                >
                  <Text style={styles.stepCopyText}>debtfree-client</Text>
                  <Copy size={14} color={C.primary} />
                </Pressable>
              </View>
            </View>

            {/* Step 4 */}
            <View style={styles.stepRow}>
              <View style={styles.stepNumberSquare}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.stepTitle}>Complete & Query</Text>
                <Text style={styles.stepDesc}>Add credentials</Text>
                <View style={styles.promptBox}>
                  <Text style={styles.promptText}>
                    "Use DebtFree to show who owes me money right now."
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </Sheet>

      {/* Recently Deleted Sheet (7.4) */}
      <Sheet
        visible={showTrashSheet}
        onClose={() => setShowTrashSheet(false)}
        title="Recently deleted"
        maxHeightRatio={0.92}
        footer={
          deletedItems.length > 0 ? (
            <NeoButton
              label="EMPTY ALL"
              variant="red"
              size="md"
              fullWidth
              onPress={handleConfirmEmptyTrash}
            />
          ) : undefined
        }
      >
        {deletedItems.length === 0 ? (
          <View style={styles.emptyTrashBox}>
            <Text style={styles.emptyText}>Trash is empty.</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {deletedItems.map((item) => {
              const tagColor =
                item.type === 'PERSON'
                  ? C.primary
                  : item.type === 'TRANSACTION'
                  ? C.positive
                  : item.type === 'CARD'
                  ? '#E65100'
                  : item.type === 'ACCOUNT'
                  ? '#1A237E'
                  : C.negative;

              return (
                <NeoCard key={item.id} face="dark" depth={3} style={styles.trashCard}>
                  <View style={styles.trashCardInner}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View
                          style={[
                            styles.typeTag,
                            { backgroundColor: tagColor },
                          ]}
                        >
                          <Text style={styles.typeTagText}>{item.type}</Text>
                        </View>
                        <Text style={styles.trashTime}>
                          {formatRelativeDate(item.deletedAt)}
                        </Text>
                      </View>

                      <Text numberOfLines={1} style={styles.trashTitle}>
                        {item.title}
                      </Text>
                      {item.amount !== undefined && (
                        <Text style={styles.trashAmount}>
                          {formatRupees(item.amount)}
                        </Text>
                      )}
                    </View>

                    <View style={styles.trashActionsRow}>
                      <NeoButton
                        label="↺ RESTORE"
                        variant="dark"
                        size="sm"
                        onPress={() => handleRestoreItem(item)}
                      />
                      <Pressable
                        onPress={() => handleDeleteForeverItem(item)}
                        style={styles.deleteForeverBtn}
                      >
                        <X size={18} color={C.negative} />
                      </Pressable>
                    </View>
                  </View>
                </NeoCard>
              );
            })}
          </View>
        )}
      </Sheet>
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
  screenTitle: {
    fontFamily: 'Fraunces_900Black',
    fontSize: 36,
    color: C.foreground,
  },
  profileCard: {
    padding: 20,
    backgroundColor: C.surface,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontFamily: 'Fraunces_900Black',
    fontSize: 30,
    color: C.background,
  },
  profileDisplayName: {
    fontFamily: 'Fraunces_900Black',
    fontSize: 24,
    color: C.foreground,
  },
  profileEmail: {
    ...T.body,
    fontSize: 14,
    color: C.mutedFg,
  },
  cardDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 14,
  },
  slimActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  slimActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slimActionText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.foreground,
  },
  syncCard: {
    padding: 16,
    backgroundColor: C.surface,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  syncDot: {
    width: 8,
    height: 8,
    marginTop: 4,
  },
  syncStatusText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.foreground,
  },
  syncSubtext: {
    ...T.body,
    fontSize: 12,
    color: C.mutedFg,
  },
  spin: {
    transform: [{ rotate: '45deg' }],
  },
  onPhoneCard: {
    padding: 16,
    backgroundColor: C.surface,
  },
  onPhoneTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.foreground,
    marginBottom: 4,
  },
  onPhoneSub: {
    ...T.body,
    fontSize: 12,
    color: C.mutedFg,
    lineHeight: 16,
  },
  dataCountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  gridTileWrapper: {
    width: '30.5%',
  },
  countBox: {
    width: '100%',
    backgroundColor: C.surface,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  countNumber: {
    fontFamily: 'Fraunces_900Black',
    fontSize: 26,
    color: C.foreground,
  },
  countLabel: {
    ...T.caps,
    fontSize: 8,
    color: C.mutedFg,
    letterSpacing: 1.5,
  },
  sectionSubtitle: {
    ...T.body,
    fontSize: 12,
    color: C.mutedFg,
  },
  assistantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
    backgroundColor: C.surface,
  },
  assistantIconWhite: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatGptIconText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 20,
    color: '#000000',
  },
  assistantIconRed: {
    width: 40,
    height: 40,
    backgroundColor: C.negative,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claudeIconText: {
    fontSize: 22,
    color: '#FFFFFF',
  },
  assistantIconDark: {
    width: 40,
    height: 40,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  museIconText: {
    fontFamily: 'Fraunces_900Black',
    fontSize: 20,
    fontStyle: 'italic',
    color: C.primary,
  },
  assistantTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    color: C.foreground,
  },
  assistantSubtitle: {
    ...T.body,
    fontSize: 12,
    color: C.mutedFg,
  },
  copyEndpointBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: C.surface2,
    gap: 10,
  },
  copyBoxLabel: {
    ...T.caps,
    fontSize: 8,
    color: C.primary,
    letterSpacing: 1.5,
  },
  copyBoxValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: C.foreground,
    marginTop: 2,
  },
  recentlyDeletedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: C.surface,
  },
  trashCountBadge: {
    backgroundColor: C.negativeDeep,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  trashCountText: {
    ...T.caps,
    fontSize: 10,
    color: C.negative,
  },
  googleNoticeBox: {
    padding: 16,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
  },
  googleNoticeText: {
    ...T.body,
    fontSize: 13,
    color: C.mutedFg,
    lineHeight: 18,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumberSquare: {
    width: 24,
    height: 24,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 12,
    color: C.background,
  },
  stepTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.foreground,
  },
  stepDesc: {
    ...T.body,
    fontSize: 12,
    color: C.mutedFg,
  },
  stepCopyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  stepCopyText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 12,
    color: C.primary,
    flex: 1,
  },
  promptBox: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    padding: 10,
  },
  promptText: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 13,
    fontStyle: 'italic',
    color: C.primary,
  },
  emptyTrashBox: {
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
  trashCard: {
    backgroundColor: C.surface,
    padding: 12,
  },
  trashCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeTagText: {
    ...T.caps,
    fontSize: 8,
    color: '#000000',
    letterSpacing: 1,
  },
  trashTime: {
    ...T.body,
    fontSize: 10,
    color: C.mutedFg,
  },
  trashTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 14,
    color: C.foreground,
  },
  trashAmount: {
    ...T.mono,
    fontSize: 13,
    color: C.foreground,
  },
  trashActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteForeverBtn: {
    width: 36,
    height: 36,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
