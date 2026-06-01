import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/auth';

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
  }, [user, isGuest, loading]);

  if (loading) return <View style={{ flex: 1, backgroundColor: '#FFF5F8' }} />;

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
