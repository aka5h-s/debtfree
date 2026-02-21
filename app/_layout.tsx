import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform, View, Text, Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold, Outfit_800ExtraBold } from "@expo-google-fonts/outfit";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import * as Font from "expo-font";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";

SplashScreen.preventAutoHideAsync();

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root {
      overflow-x: hidden !important;
      max-width: 100vw !important;
    }
    * {
      -webkit-overflow-scrolling: touch;
    }
  `;
  document.head.appendChild(style);
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === 'login' || segments[0] === 'signup';
    if (!user && !inAuth) {
      router.replace('/login');
    } else if (user && inAuth) {
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D0D0D' } }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="person/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="add-person" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="edit-person" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="add-transaction" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="edit-transaction" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="add-card" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="edit-card" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
        <Stack.Screen name="transaction-history" options={{ animation: Platform.OS === 'web' ? 'none' : 'slide_from_bottom' }} />
      </Stack>
    </AuthGate>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    DMSerifDisplay_400Regular,
    'ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
    'MaterialCommunityIcons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
    'Feather': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
    'material-community': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
    'feather': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Feather.ttf'),
  });
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
      const errMsg = `Font error: ${fontError.message || String(fontError)}`;
      setDebugInfo(errMsg);
      if (Platform.OS === 'android') {
        Alert.alert('Font Loading Error', errMsg);
      }
    }
    if (fontsLoaded || fontError) {
      const names = ['ionicons', 'material-community', 'feather', 'MaterialCommunityIcons', 'Feather',
        'Outfit_400Regular', 'DMSerifDisplay_400Regular'];
      const status = names.map(n => `${n}: ${Font.isLoaded(n)}`).join('\n');
      console.log('Font status:\n' + status);
      setDebugInfo(`loaded:${fontsLoaded} err:${!!fontError}\n${status}`);
      if (Platform.OS === 'android') {
        Alert.alert('Font Status', `fontsLoaded: ${fontsLoaded}\nfontError: ${fontError ? fontError.message : 'none'}\n\n${status}`);
      }
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, overflow: 'hidden' }}>
          <KeyboardProvider>
            <AuthProvider>
              <DataProvider>
                <StatusBar style="light" />
                {Platform.OS === 'android' && debugInfo ? (
                  <View style={{ backgroundColor: '#FF0000', padding: 10, paddingTop: 40 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' }}>{debugInfo}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                      <Text style={{ fontFamily: 'ionicons', fontSize: 24, color: '#FFFFFF' }}>{String.fromCodePoint(0xf233)}</Text>
                      <Text style={{ fontFamily: 'material-community', fontSize: 24, color: '#FFFFFF' }}>{String.fromCodePoint(0xF0004)}</Text>
                      <Text style={{ fontFamily: 'feather', fontSize: 24, color: '#FFFFFF' }}>{String.fromCodePoint(0xe81f)}</Text>
                      <Text style={{ fontSize: 10, color: '#FFFFFF' }}>← icons should appear here</Text>
                    </View>
                  </View>
                ) : null}
                <RootLayoutNav />
              </DataProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
