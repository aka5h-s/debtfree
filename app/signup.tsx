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
import { useAuth } from '@/contexts/AuthContext';
import { C, FONT } from '@/theme/neo';
import {
  Extruded,
  TiltButton,
  NeoButton,
  Field,
  DotGrid,
} from '@/components/neo';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const { signUpEmail, signInGoogle, updateUserProfile } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');
    setLoading(true);
    const result = await signUpEmail(email.trim(), password.trim());
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (name.trim()) {
      await updateUserProfile({ displayName: name.trim() });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    const result = await signInGoogle();
    setGoogleLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        <View style={styles.brandSection}>
          <Extruded
            depth={4}
            face="poli"
            bg={C.poli}
            contentStyle={styles.monogramBox}
          >
            <Text style={styles.monogramText}>DF</Text>
          </Extruded>

          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start managing your debts and assets cleanly</Text>
        </View>

        <View style={styles.formSection}>
          <Field
            label="FULL NAME"
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError('');
            }}
            placeholder="John Doe"
            autoCapitalize="words"
          />

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
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TiltButton
            disabled={loading}
            onPress={handleSignup}
            style={{ marginTop: 8 }}
          >
            {loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}
          </TiltButton>

          <NeoButton
            variant="white"
            size="lg"
            disabled={googleLoading}
            onPress={handleGoogleSignIn}
            fullWidth
          >
            {googleLoading ? 'CONNECTING…' : 'CONTINUE WITH GOOGLE'}
          </NeoButton>

          <View style={styles.ghostRow}>
            <NeoButton
              variant="ghost"
              onPress={() => router.push('/login')}
            >
              ALREADY HAVE AN ACCOUNT? SIGN IN
            </NeoButton>
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 32,
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
    fontSize: 34,
    lineHeight: 38,
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
  },
});
