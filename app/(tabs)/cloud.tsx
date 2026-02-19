import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Platform, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { NeoPopButton } from '@/components/NeoPopButton';
import { NeoPopCard } from '@/components/NeoPopCard';
import { useData } from '@/contexts/DataContext';
import { initFirebase, isFirebaseInitialized, uploadAllToCloud, downloadFromCloud, disconnectFirebase } from '@/lib/firebase';
import type { FirebaseConfig } from '@/lib/firebase';
import { getStoredFirebaseConfig, saveFirebaseConfig, clearFirebaseConfig } from '@/lib/firebase-config-storage';

export default function CloudScreen() {
  const insets = useSafeAreaInsets();
  const { reload } = useData();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;
  const topPad = Math.max(insets.top, webTopInset);
  const bottomPad = Math.max(insets.bottom, webBottomInset) + 80;

  const [isConnected, setIsConnected] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [projectId, setProjectId] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');

  useEffect(() => {
    (async () => {
      const stored = await getStoredFirebaseConfig();
      if (stored) {
        const ok = initFirebase(stored);
        if (ok) {
          setIsConnected(true);
          setApiKey(stored.apiKey);
          setAuthDomain(stored.authDomain);
          setProjectId(stored.projectId);
          setStorageBucket(stored.storageBucket);
          setMessagingSenderId(stored.messagingSenderId);
          setAppId(stored.appId);
        }
      }
    })();
  }, []);

  const handleConnect = async () => {
    if (!apiKey.trim() || !projectId.trim() || !appId.trim()) {
      showAlert('Missing Info', 'API Key, Project ID, and App ID are required.');
      return;
    }

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    const ok = initFirebase(config);
    if (ok) {
      await saveFirebaseConfig(config);
      setIsConnected(true);
      setIsConfiguring(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert('Connected', 'Firebase connected successfully!');
    } else {
      showAlert('Error', 'Failed to connect to Firebase. Check your config.');
    }
  };

  const handleDisconnect = async () => {
    disconnectFirebase();
    await clearFirebaseConfig();
    setIsConnected(false);
    setApiKey('');
    setAuthDomain('');
    setProjectId('');
    setStorageBucket('');
    setMessagingSenderId('');
    setAppId('');
    setSyncMessage('');
    setLastSyncTime(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const handleUpload = async () => {
    setIsSyncing(true);
    setSyncMessage('Uploading data to cloud...');
    const result = await uploadAllToCloud();
    setIsSyncing(false);
    if (result.success) {
      const now = new Date().toLocaleString();
      setLastSyncTime(now);
      setSyncMessage('Data uploaded successfully!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setSyncMessage(`Upload failed: ${result.error}`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDownload = async () => {
    const doDownload = async () => {
      setIsSyncing(true);
      setSyncMessage('Downloading data from cloud...');
      const result = await downloadFromCloud();
      setIsSyncing(false);
      if (result.success) {
        await reload();
        const now = new Date().toLocaleString();
        setLastSyncTime(now);
        setSyncMessage('Data downloaded successfully!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setSyncMessage(`Download failed: ${result.error}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    };

    showConfirm(
      'Download from Cloud',
      'This will merge cloud data with your local data. Continue?',
      doDownload
    );
  };

  const showAlert = (title: string, msg: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const showConfirm = (title: string, msg: string, onOk: () => void) => {
    if (Platform.OS === 'web') {
      if (confirm(`${title}\n${msg}`)) onOk();
    } else {
      Alert.alert(title, msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: onOk },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: bottomPad }}>
      <View style={styles.header}>
        <Text style={styles.title}>Cloud Sync</Text>
        <Text style={styles.subtitle}>Backup your data with Firebase</Text>
      </View>

      {!isConnected && !isConfiguring && (
        <View style={styles.section}>
          <NeoPopCard color={Colors.surface} depth={3}>
            <View style={styles.statusCard}>
              <View style={styles.statusIconWrap}>
                <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
              </View>
              <Text style={styles.statusTitle}>Not Connected</Text>
              <Text style={styles.statusDesc}>
                Connect your Firebase project to backup and sync your data across devices.
              </Text>
              <View style={{ marginTop: 20 }}>
                <NeoPopTiltedButton onPress={() => setIsConfiguring(true)} showShimmer>
                  <Text style={styles.ctaText}>CONNECT FIREBASE</Text>
                </NeoPopTiltedButton>
              </View>
            </View>
          </NeoPopCard>
        </View>
      )}

      {isConfiguring && (
        <View style={styles.section}>
          <NeoPopCard color={Colors.surface} depth={3}>
            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Firebase Configuration</Text>
              <Text style={styles.configHint}>Enter your Firebase project config values from the Firebase Console.</Text>

              <Text style={styles.fieldLabel}>API KEY *</Text>
              <TextInput style={styles.input} value={apiKey} onChangeText={setApiKey} placeholder="AIza..." placeholderTextColor={Colors.textMuted} autoCapitalize="none" />

              <Text style={styles.fieldLabel}>AUTH DOMAIN</Text>
              <TextInput style={styles.input} value={authDomain} onChangeText={setAuthDomain} placeholder="myapp.firebaseapp.com" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />

              <Text style={styles.fieldLabel}>PROJECT ID *</Text>
              <TextInput style={styles.input} value={projectId} onChangeText={setProjectId} placeholder="my-project-id" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />

              <Text style={styles.fieldLabel}>STORAGE BUCKET</Text>
              <TextInput style={styles.input} value={storageBucket} onChangeText={setStorageBucket} placeholder="myapp.appspot.com" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />

              <Text style={styles.fieldLabel}>MESSAGING SENDER ID</Text>
              <TextInput style={styles.input} value={messagingSenderId} onChangeText={setMessagingSenderId} placeholder="123456789" placeholderTextColor={Colors.textMuted} keyboardType="number-pad" />

              <Text style={styles.fieldLabel}>APP ID *</Text>
              <TextInput style={styles.input} value={appId} onChangeText={setAppId} placeholder="1:123:web:abc" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />

              <View style={{ marginTop: 20 }}>
                <NeoPopTiltedButton onPress={handleConnect} showShimmer>
                  <Text style={styles.ctaText}>CONNECT</Text>
                </NeoPopTiltedButton>
              </View>
              <View style={{ marginTop: 12 }}>
                <NeoPopButton onPress={() => setIsConfiguring(false)} variant="secondary">
                  <View style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>CANCEL</Text>
                  </View>
                </NeoPopButton>
              </View>
            </View>
          </NeoPopCard>
        </View>
      )}

      {isConnected && (
        <>
          <View style={styles.section}>
            <NeoPopCard color={Colors.surface} depth={3}>
              <View style={styles.statusCard}>
                <View style={[styles.statusIconWrap, { backgroundColor: 'rgba(141, 208, 74, 0.1)' }]}>
                  <Ionicons name="cloud-done" size={48} color={Colors.positive} />
                </View>
                <Text style={[styles.statusTitle, { color: Colors.positive }]}>Connected</Text>
                <Text style={styles.statusDesc}>Project: {projectId}</Text>
                {lastSyncTime && <Text style={styles.lastSync}>Last sync: {lastSyncTime}</Text>}
              </View>
            </NeoPopCard>
          </View>

          <View style={styles.section}>
            <NeoPopCard color={Colors.surface} depth={3}>
              <View style={styles.syncCard}>
                <Text style={styles.syncTitle}>SYNC OPTIONS</Text>

                {isSyncing ? (
                  <View style={styles.syncingWrap}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.syncingText}>{syncMessage}</Text>
                  </View>
                ) : (
                  <>
                    {syncMessage ? (
                      <View style={styles.syncMsgWrap}>
                        <Text style={[styles.syncMsg, {
                          color: syncMessage.includes('failed') ? Colors.negative : Colors.positive
                        }]}>{syncMessage}</Text>
                      </View>
                    ) : null}

                    <View style={styles.syncBtnRow}>
                      <View style={styles.syncBtnWrap}>
                        <Pressable onPress={handleUpload} style={styles.syncBtn}>
                          <Ionicons name="cloud-upload" size={28} color={Colors.primary} />
                          <Text style={styles.syncBtnLabel}>UPLOAD</Text>
                          <Text style={styles.syncBtnHint}>Push local data to cloud</Text>
                        </Pressable>
                      </View>
                      <View style={styles.syncBtnWrap}>
                        <Pressable onPress={handleDownload} style={styles.syncBtn}>
                          <Ionicons name="cloud-download" size={28} color={Colors.accent} />
                          <Text style={styles.syncBtnLabel}>DOWNLOAD</Text>
                          <Text style={styles.syncBtnHint}>Pull cloud data to device</Text>
                        </Pressable>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </NeoPopCard>
          </View>

          <View style={styles.section}>
            <NeoPopButton onPress={handleDisconnect} variant="secondary">
              <View style={styles.disconnectBtn}>
                <Ionicons name="unlink-outline" size={18} color={Colors.negative} />
                <Text style={[styles.cancelText, { color: Colors.negative, marginLeft: 8 }]}>DISCONNECT FIREBASE</Text>
              </View>
            </NeoPopButton>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statusCard: {
    padding: 24,
    alignItems: 'center',
  },
  statusIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(102, 102, 102, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    marginBottom: 8,
  },
  statusDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  lastSync: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginTop: 8,
  },
  configCard: {
    padding: 20,
  },
  configTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    marginBottom: 4,
  },
  configHint: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    color: Colors.white,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#000',
    letterSpacing: 1,
  },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.white,
    letterSpacing: 1,
  },
  syncCard: {
    padding: 20,
  },
  syncTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  syncBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  syncBtnWrap: {
    flex: 1,
  },
  syncBtn: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  syncBtnLabel: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    letterSpacing: 1,
    marginTop: 10,
  },
  syncBtnHint: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  syncingWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  syncingText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 12,
  },
  syncMsgWrap: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  syncMsg: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
});
