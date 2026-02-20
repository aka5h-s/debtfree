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
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';

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
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';

function isDevBuild(): boolean {
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    return !!GoogleSignin;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nativeAvailable] = useState(() => Platform.OS !== 'web' && isDevBuild());

  const expoOwner = Constants.expoConfig?.owner || 'anonymous';
  const expoSlug = Constants.expoConfig?.slug || 'aka5h-s';
  const redirectUri = Platform.OS === 'web'
    ? AuthSession.makeRedirectUri()
    : `https://auth.expo.io/@${expoOwner}/${expoSlug}`;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      console.log('Google Auth redirect URI:', redirectUri);
      console.log('Native SDK available:', nativeAvailable);
    }
  }, [redirectUri, nativeAvailable]);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    redirectUri,
  });

  useEffect(() => {
    if (nativeAvailable) {
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        GoogleSignin.configure({
          webClientId: GOOGLE_WEB_CLIENT_ID,
        });
      } catch {}
    }
  }, [nativeAvailable]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        const credential = GoogleAuthProvider.credential(id_token);
        signInWithCredential(auth, credential).catch(console.error);
      }
    }
  }, [response]);

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
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.hasPlayServices();
        const signInResult = await GoogleSignin.signIn();
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
      const result = await promptAsync();
      if (result?.type === 'cancel' || result?.type === 'dismiss') {
        return {};
      }
      return {};
    } catch (e: any) {
      return { error: e.message || 'Google sign-in failed' };
    }
  }, [nativeAvailable, promptAsync]);

  const signOut = useCallback(async () => {
    if (nativeAvailable) {
      try {
        const { GoogleSignin } = require('@react-native-google-signin/google-signin');
        await GoogleSignin.signOut();
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
