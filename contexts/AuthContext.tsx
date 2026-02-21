import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  signInWithCredential,
  GoogleAuthProvider,
  type User,
} from '@/lib/firebase';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import Constants, { ExecutionEnvironment } from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signInEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signInGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

const IS_DEV_BUILD = Constants.executionEnvironment === ExecutionEnvironment.Bare;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const nativeAvailable = Platform.OS !== 'web' && IS_DEV_BUILD;

  useEffect(() => {
    if (nativeAvailable) {
      try {
        const RNGoogleSignIn = require('@react-native-google-signin/google-signin');
        RNGoogleSignIn.GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
        });
      } catch (e) {
        console.log('Native Google Sign-In config failed:', e);
      }
    }
  }, [nativeAvailable]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return {};
    } catch (e: any) {
      let msg = 'Login failed';
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') msg = 'Invalid email or password';
      else if (e.code === 'auth/invalid-email') msg = 'Invalid email address';
      else if (e.code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later';
      return { error: msg };
    }
  }, []);

  const signUpEmail = useCallback(async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return {};
    } catch (e: any) {
      let msg = 'Sign up failed';
      if (e.code === 'auth/email-already-in-use') msg = 'Email already in use';
      else if (e.code === 'auth/invalid-email') msg = 'Invalid email address';
      else if (e.code === 'auth/weak-password') msg = 'Password must be at least 6 characters';
      return { error: msg };
    }
  }, []);

  const signInGoogle = useCallback(async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      return { error: 'Google sign-in is not configured.' };
    }

    if (Platform.OS === 'web') {
      try {
        const { signInWithPopup } = await import('firebase/auth');
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        return {};
      } catch (e: any) {
        if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') {
          return {};
        }
        return { error: e.message || 'Google sign-in failed' };
      }
    }

    if (nativeAvailable) {
      try {
        const RNGoogleSignIn = require('@react-native-google-signin/google-signin');
        await RNGoogleSignIn.GoogleSignin.hasPlayServices();
        const signInResult = await RNGoogleSignIn.GoogleSignin.signIn();
        const idToken = signInResult?.data?.idToken;
        if (!idToken) {
          return { error: 'Could not get ID token from Google.' };
        }
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
        return {};
      } catch (e: any) {
        if (e.code === 'SIGN_IN_CANCELLED') return {};
        return { error: e.message || 'Google sign-in failed' };
      }
    }

    try {
      const backendDomain = (process.env.EXPO_PUBLIC_DOMAIN || '').replace(/:5000$/, '');
      const redirectUri = `https://${backendDomain}/auth/google/callback`;
      const nonce = Crypto.randomUUID();

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_WEB_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=id_token` +
        `&scope=${encodeURIComponent('openid profile email')}` +
        `&nonce=${nonce}` +
        `&prompt=select_account`;

      console.log('Google OAuth redirect_uri:', redirectUri);

      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'debtfree://auth');

      console.log('Google OAuth result type:', result.type);
      if ('url' in result) console.log('Google OAuth result url:', result.url);

      if (result.type === 'success' && result.url) {
        const url = result.url;
        const queryString = url.includes('?') ? url.split('?')[1] : '';
        if (queryString) {
          const params = new URLSearchParams(queryString.split('#')[0]);
          const idToken = params.get('id_token');
          if (idToken) {
            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);
            return {};
          }
        }
        return { error: 'Could not get sign-in token from Google.' };
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        return {};
      }
      return { error: 'Google sign-in was interrupted.' };
    } catch (e: any) {
      console.log('Google sign-in error:', e);
      return { error: e.message || 'Google sign-in failed' };
    }
  }, [nativeAvailable]);

  const signOut = useCallback(async () => {
    if (nativeAvailable) {
      try {
        const RNGoogleSignIn = require('@react-native-google-signin/google-signin');
        await RNGoogleSignIn.GoogleSignin.signOut();
      } catch {}
    }
    await firebaseSignOut(auth);
  }, [nativeAvailable]);

  const value = useMemo(() => ({
    user, isLoading, signInEmail, signUpEmail, signInGoogle, signOut,
  }), [user, isLoading, signInEmail, signUpEmail, signInGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
