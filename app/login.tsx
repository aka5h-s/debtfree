import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { Icon } from '@/components/Icon';
import { useAuth } from '@/contexts/AuthContext';
import { NeoPopTiltedButton } from '@/components/NeoPopTiltedButton';
import { NeoPopButton } from '@/components/NeoPopButton';
import { NeoPopCard } from '@/components/NeoPopCard';
import { ShimmerText } from '@/components/ShimmerText';
import { Fonts } from '@/lib/fonts';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInEmail, signInGoogle } = useAuth();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPad = Math.max(insets.top, webTopInset);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    const result = await signInGoogle();
    setGoogleLoading(false);
    if (result.error) setError(result.error);
  };

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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: topPad + 40 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <Icon name="wallet" size={40} color={Colors.primary} />
          </View>
          <ShimmerText text="DebtFree" style={styles.appName} />
          <Text style={styles.tagline}>Track every rupee, settle with confidence</Text>
        </View>

        <View style={styles.formSection}>
          <NeoPopCard color={Colors.surface} depth={3}>
            <View style={styles.formInner}>
              <Text style={styles.formTitle}>Welcome Back</Text>

              {error ? (
                <View style={styles.errorBox}>
                  <Icon name="alert-circle" size={16} color={Colors.negative} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                placeholder="you@example.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Icon name={showPassword ? 'eye-off' : 'eye'} size={20} color={Colors.textMuted} />
                </Pressable>
              </View>

              <View style={{ marginTop: 20 }}>
                {loading ? (
                  <View style={styles.loadingWrap}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                  </View>
                ) : (
                  <NeoPopTiltedButton onPress={handleLogin} showShimmer>
                    <Text style={styles.ctaText}>LOG IN</Text>
                  </NeoPopTiltedButton>
                )}
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <NeoPopButton onPress={handleGoogleSignIn} variant="secondary">
                <View style={styles.googleBtn}>
                  {googleLoading ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Icon name="logo-google" size={20} color={Colors.white} />
                      <Text style={styles.googleText}>CONTINUE WITH GOOGLE</Text>
                    </>
                  )}
                </View>
              </NeoPopButton>
            </View>
          </NeoPopCard>
        </View>

        <Pressable onPress={() => router.push('/signup')} style={styles.switchBtn}>
          <Text style={styles.switchText}>
            Don't have an account? <Text style={styles.switchLink}>Sign Up</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 235, 52, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 235, 52, 0.2)',
  },
  appName: {
    fontSize: 36,
    fontFamily: Fonts.serif,
    color: Colors.primary,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  formSection: {
    marginBottom: 24,
  },
  formInner: {
    padding: 24,
  },
  formTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.negative,
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontFamily: Fonts.semibold,
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
    padding: 14,
    color: Colors.white,
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  passwordWrap: {
    position: 'relative' as const,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: 'absolute' as const,
    right: 12,
    top: 14,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },
  loadingWrap: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 12,
    fontFamily: Fonts.semibold,
    color: Colors.textMuted,
    marginHorizontal: 12,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  googleText: {
    fontSize: 13,
    fontFamily: Fonts.semibold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  switchBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.textMuted,
  },
  switchLink: {
    color: Colors.primary,
    fontFamily: Fonts.semibold,
  },
});
