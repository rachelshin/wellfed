import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/auth';
import theme from '../lib/theme';

// Module-level flag — survives re-renders, guarantees the splash is dismissed at most once.
let _splashDismissed = false;

function dismissSplash() {
  if (_splashDismissed || Platform.OS !== 'web' || typeof document === 'undefined') return;
  _splashDismissed = true;

  const MIN_SPLASH_MS = 2500;
  const elapsed = Date.now() - ((window as any).__splashStart ?? Date.now());
  const delay = Math.max(0, MIN_SPLASH_MS - elapsed);

  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (!splash) return;
    splash.classList.add('fade-out');
    setTimeout(() => splash.remove(), 450);
  }, delay);
}

function AuthGate() {
  const { user, isGuest, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const isAuthed = !!user || isGuest;
    const inAuthScreen = segments[0] === 'sign-in';
    if (!isAuthed && !inAuthScreen) {
      router.replace('/sign-in');
    } else if (isAuthed && inAuthScreen) {
      router.replace('/(tabs)');
    }

    // On iOS PWA, visibilityState starts as 'hidden' while the native launch
    // image is still covering the screen. Wait until the page is actually visible
    // so the splash isn't dismissed before the user ever sees it.
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      if (document.visibilityState === 'visible') {
        dismissSplash();
      } else {
        const onVisible = () => {
          if (document.visibilityState !== 'visible') return;
          document.removeEventListener('visibilitychange', onVisible);
          // Reset start time so the full MIN_SPLASH_MS plays from when the user sees it.
          (window as any).__splashStart = Date.now();
          dismissSplash();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
      }
    }
  }, [user, isGuest, loading]);

  if (loading) return <View style={{ flex: 1, backgroundColor: '#7050BE' }} />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
