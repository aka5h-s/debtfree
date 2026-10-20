import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { C, FONT } from '@/theme/neo';
import {
  Extruded,
  TiltButton,
  NeoButton,
  Field,
  DotGrid,
  Sheet,
} from '@/components/neo';
import { useToast } from '@/components/neo/Toast';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInEmail, signInGoogle } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot password sheet
  const [showForgotSheet, setShowForgotSheet] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    setError('');
    setLoading(true);
    const result = await signInEmail(email.trim(), password.trim());
    setLoading(false);
    if (result.error) setError(result.error);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    const result = await signInGoogle();
    setGoogleLoading(false);
    if (result.error) setError(result.error);
  };

  const handleSendResetEmail = async () => {
    if (!forgotEmail.trim()) {
      showToast('Please enter your email');
      return;
    }
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail.trim());
      setShowForgotSheet(false);
      setForgotEmail('');
      showToast('Password reset link sent to your email');
    } catch (e: any) {
      showToast(e.message || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Dot grid top half */}
      <View style={styles.topHalfGrid}>
        <DotGrid />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 20,
            paddingBottom: Math.max(insets.bottom, 24) + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Monogram & Title */}
        <View style={styles.brandSection}>
          <Extruded
            depth={4}
            face="poli"
            bg={C.poli}
            contentStyle={styles.monogramBox}
          >
            <Text style={styles.monogramText}>DF</Text>
          </Extruded>

          <Text style={styles.title}>DebtFree</Text>
          <Text style={styles.subtitle}>Track every rupee, settle with confidence</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <Field
            label="EMAIL"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setError('');
            }}
            placeholder="you@domain.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Field
            label="PASSWORD"
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError('');
            }}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Primary CTA: TiltButton */}
          <TiltButton
            disabled={loading}
            onPress={handleLogin}
            style={{ marginTop: 8 }}
          >
            {loading ? 'SIGNING IN…' : 'SIGN IN'}
          </TiltButton>

          {/* Google Sign In */}
          <NeoButton
            variant="white"
            size="lg"
            disabled={googleLoading}
            onPress={handleGoogleSignIn}
            fullWidth
          >
            {googleLoading ? 'CONNECTING…' : 'CONTINUE WITH GOOGLE'}
          </NeoButton>

          {/* Secondary Ghost Actions */}
          <View style={styles.ghostRow}>
            <NeoButton
              variant="ghost"
              onPress={() => {
                setForgotEmail(email);
                setShowForgotSheet(true);
              }}
            >
              FORGOT PASSWORD?
            </NeoButton>

            <NeoButton
              variant="ghost"
              onPress={() => router.push('/signup')}
            >
              NEW HERE? CREATE ACCOUNT
            </NeoButton>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password Sheet */}
      <Sheet
        visible={showForgotSheet}
        onClose={() => setShowForgotSheet(false)}
        title="Reset Password"
        subtitle="Enter your email to receive a password recovery link"
        footer={
          <NeoButton
            variant="poli"
            size="lg"
            fullWidth
            disabled={forgotLoading}
            onPress={handleSendResetEmail}
          >
            {forgotLoading ? 'SENDING…' : 'SEND RESET LINK'}
          </NeoButton>
        }
      >
        <Field
          label="EMAIL ADDRESS"
          value={forgotEmail}
          onChangeText={setForgotEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  topHalfGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
  },
  scrollContent: {
    paddingHorizontal: 20,
    minHeight: '100%',
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  monogramBox: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
  },
  monogramText: {
    fontFamily: FONT.display,
    fontSize: 28,
    lineHeight: 32,
    color: C.ink,
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: C.text,
    marginTop: 18,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: FONT.sans,
    fontSize: 14,
    lineHeight: 20,
    color: C.muted,
    textAlign: 'center',
  },
  formSection: {
    gap: 16,
    width: '100%',
  },
  errorText: {
    fontFamily: FONT.sansBold,
    fontSize: 13,
    color: C.red,
    marginTop: -4,
  },
  ghostRow: {
    marginTop: 12,
    alignItems: 'center',
    gap: 8,
  },
});
