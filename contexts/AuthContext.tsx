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
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';

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

const EXPO_PROXY_REDIRECT_URI = 'https://auth.expo.io/@aka5h/aka5h-s';

function GoogleAuthInner({ onGooglePrompt }: { onGooglePrompt: (promptFn: () => Promise<AuthSession.AuthSessionResult | null>) => void }) {
  const [request, response, promptAsync] = useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri: EXPO_PROXY_REDIRECT_URI,
  });

  useEffect(() => {
    if (request) {
      onGooglePrompt(() => promptAsync());
    }
  }, [request]);

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const nativeAvailable = Platform.OS !== 'web' && IS_DEV_BUILD;
  const useExpoAuth = Platform.OS !== 'web' && !IS_DEV_BUILD;

  const googlePromptRef = React.useRef<(() => Promise<AuthSession.AuthSessionResult | null>) | null>(null);
  const pendingGoogleResolveRef = React.useRef<((result: { error?: string }) => void) | null>(null);

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

  const handleGooglePrompt = useCallback((promptFn: () => Promise<AuthSession.AuthSessionResult | null>) => {
    googlePromptRef.current = promptFn;
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

    if (!googlePromptRef.current) {
      return { error: 'Google Sign-In is still loading. Please try again.' };
    }

    try {
      const result = await googlePromptRef.current();
      if (!result) return { error: 'Google sign-in was interrupted.' };

      if (result.type === 'success') {
        const { params } = result;
        const idToken = params?.id_token;
        if (idToken) {
          const credential = GoogleAuthProvider.credential(idToken);
          await signInWithCredential(auth, credential);
          return {};
        }
        return { error: 'Could not get sign-in token from Google.' };
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        return {};
      }
      return { error: 'Google sign-in was interrupted.' };
    } catch (e: any) {
      console.log('Expo Auth Google sign-in error:', e);
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

  return (
    <AuthContext.Provider value={value}>
      {useExpoAuth && <GoogleAuthInner onGooglePrompt={handleGooglePrompt} />}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
