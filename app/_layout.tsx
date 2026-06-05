import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/auth';

const MIN_SPLASH_MS = 2500;

function PulseDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.delay(Math.max(0, 1500 - delay - 900)),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return <Animated.View style={[ss.dot, { opacity }]} />;
}

function SplashOverlay({ authReady, onDone }: { authReady: boolean; onDone: () => void }) {
  const mountTime = useRef(Date.now());
  const logoScale = useRef(new Animated.Value(0.65)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  // Remove the HTML placeholder splash — React is now rendering the overlay
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.getElementById('splash')?.remove();
    }
  }, []);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  // Exit once auth resolves and the minimum display time has passed
  useEffect(() => {
    if (!authReady) return;
    const elapsed = Date.now() - mountTime.current;
    const delay = Math.max(0, MIN_SPLASH_MS - elapsed);
    const t = setTimeout(() => {
      Animated.timing(exitOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(({ finished }) => { if (finished) onDone(); });
    }, delay);
    return () => clearTimeout(t);
  }, [authReady]);

  return (
    <Animated.View style={[ss.overlay, { opacity: exitOpacity }]}>
      <Animated.Image
        source={require('../assets/icon.png')}
        style={[ss.logo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      />
      <Animated.View style={{ opacity: contentOpacity, alignItems: 'center' }}>
        <Text style={ss.title}>Well Fed</Text>
        <Text style={ss.subtitle}>your kitchen companion</Text>
      </Animated.View>
      <Animated.View style={[ss.dotsRow, { opacity: contentOpacity }]}>
        <PulseDot delay={0} />
        <PulseDot delay={180} />
        <PulseDot delay={360} />
      </Animated.View>
    </Animated.View>
  );
}

function AuthGate() {
  const { user, isGuest, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (loading) return;
    const isAuthed = !!user || isGuest;
    const inAuthScreen = segments[0] === 'sign-in';
    if (!isAuthed && !inAuthScreen) router.replace('/sign-in');
    else if (isAuthed && inAuthScreen) router.replace('/(tabs)');
  }, [user, isGuest, loading]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {showSplash && (
        <SplashOverlay authReady={!loading} onDone={() => setShowSplash(false)} />
      )}
    </>
  );
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

const ss = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#7050BE',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 22,
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 5,
    letterSpacing: 0.1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 48,
  },
  dot: {
    width: 7,
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 3.5,
  },
});
