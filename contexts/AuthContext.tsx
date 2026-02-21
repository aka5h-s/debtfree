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
import Constants, { ExecutionEnvironment } from 'expo-constants';
import GoogleSignInWebView from '@/components/GoogleSignInWebView';

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
const FIREBASE_AUTH_DOMAIN = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '';

const IS_DEV_BUILD = Constants.executionEnvironment === ExecutionEnvironment.Bare;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGoogleWebView, setShowGoogleWebView] = useState(false);
  const [googleResolve, setGoogleResolve] = useState<((value: { error?: string }) => void) | null>(null);
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

  const handleGoogleToken = useCallback(async (idToken: string) => {
    setShowGoogleWebView(false);
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, credential);
      if (googleResolve) googleResolve({});
    } catch (e: any) {
      if (googleResolve) googleResolve({ error: e.message || 'Google sign-in failed' });
    }
    setGoogleResolve(null);
  }, [googleResolve]);

  const handleGoogleClose = useCallback(() => {
    setShowGoogleWebView(false);
    if (googleResolve) googleResolve({});
    setGoogleResolve(null);
  }, [googleResolve]);

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

    return new Promise<{ error?: string }>((resolve) => {
      setGoogleResolve(() => resolve);
      setShowGoogleWebView(true);
    });
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

  return (
    <AuthContext.Provider value={value}>
      {children}
      {Platform.OS !== 'web' && (
        <GoogleSignInWebView
          visible={showGoogleWebView}
          onToken={handleGoogleToken}
          onClose={handleGoogleClose}
          clientId={GOOGLE_WEB_CLIENT_ID}
          firebaseAuthDomain={FIREBASE_AUTH_DOMAIN}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
