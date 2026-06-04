import React, { useEffect } from 'react';
import { View, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/auth';
import theme from '../lib/theme';

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

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const MIN_SPLASH_MS = 1000;

      const removeSplash = () => {
        const elapsed = Date.now() - ((window as any).__splashStart ?? Date.now());
        const delay = Math.max(0, MIN_SPLASH_MS - elapsed);
        setTimeout(() => {
          const splash = document.getElementById('splash');
          if (splash) {
            splash.classList.add('fade-out');
            setTimeout(() => splash.remove(), 350);
          }
        }, delay);
      };

      // On iOS PWA the web view can finish loading while the native launch image is
      // still covering it. If the page isn't visible yet, wait until it is so the
      // splash is never removed before the user sees it.
      if (document.visibilityState === 'visible') {
        removeSplash();
      } else {
        document.addEventListener('visibilitychange', function onVisible() {
          if (document.visibilityState === 'visible') {
            document.removeEventListener('visibilitychange', onVisible);
            // Reset the start time so the full MIN_SPLASH_MS is shown from now
            (window as any).__splashStart = Date.now();
            removeSplash();
          }
        });
      }
    }
  }, [user, isGuest, loading]);

  if (loading) return <View style={{ flex: 1, backgroundColor: '#9B80A8' }} />;

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
