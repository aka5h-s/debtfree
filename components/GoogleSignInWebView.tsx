import React, { useState, useCallback, useRef } from 'react';
import { Modal, View, ActivityIndicator, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onToken: (idToken: string) => void;
  onClose: () => void;
  clientId: string;
  firebaseAuthDomain: string;
}

export default function GoogleSignInWebView({ visible, onToken, onClose, clientId, firebaseAuthDomain }: Props) {
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  const tokenExtracted = useRef(false);

  const redirectUri = `https://${firebaseAuthDomain}/__/auth/handler`;
  const nonce = Math.random().toString(36).substring(2);

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=id_token` +
    `&scope=${encodeURIComponent('openid profile email')}` +
    `&nonce=${nonce}` +
    `&prompt=select_account`;

  const extractTokenJS = `
    (function() {
      try {
        var hash = window.location.hash;
        if (hash && hash.indexOf('id_token') !== -1) {
          var params = new URLSearchParams(hash.substring(1));
          var token = params.get('id_token');
          if (token) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'id_token', token: token }));
          }
        }
      } catch(e) {}
    })();
    true;
  `;

  const handleNavigationChange = useCallback((navState: WebViewNavigation) => {
    if (tokenExtracted.current) return;
    const url = navState.url || '';
    if (url.startsWith(redirectUri)) {
      webViewRef.current?.injectJavaScript(extractTokenJS);
    }
  }, [redirectUri]);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'id_token' && data.token && !tokenExtracted.current) {
        tokenExtracted.current = true;
        onToken(data.token);
      }
    } catch {}
  }, [onToken]);

  const handleClose = useCallback(() => {
    tokenExtracted.current = false;
    onClose();
  }, [onClose]);

  if (Platform.OS === 'web') return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Sign in with Google</Text>
          <View style={styles.closeBtn} />
        </View>
        <WebView
          ref={webViewRef}
          source={{ uri: authUrl }}
          onNavigationStateChange={handleNavigationChange}
          onMessage={handleMessage}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          style={styles.webview}
        />
        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#E5FE40" />
          </View>
        )}
      </View>
    </Modal>
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
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#1A1A1A',
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    top: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13,13,13,0.7)',
  },
});
