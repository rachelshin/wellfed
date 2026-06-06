import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/auth';

const MIN_DISPLAY_MS = 1600;

// ── Bag geometry (all px, fixed coordinate space) ────────────────────────
const BAG_W    = 96;
const BAG_H    = 112;
const ABOVE    = 52;  // space above bag where items peek out
const TOTAL_H  = BAG_H + ABOVE;
const FOLD_H   = 16;
const HANDLE_C = '#8B5E3C';
const ITEM_START = 44; // translateY items start at (inside bag, hidden)

function GroceryBagScene() {
  const bagOpacity = useRef(new Animated.Value(0)).current;
  const bagScale   = useRef(new Animated.Value(0.82)).current;

  const gY = useRef(new Animated.Value(ITEM_START)).current; // greens
  const gO = useRef(new Animated.Value(0)).current;
  const oY = useRef(new Animated.Value(ITEM_START)).current; // orange
  const oO = useRef(new Animated.Value(0)).current;
  const bY = useRef(new Animated.Value(ITEM_START)).current; // baguette
  const bO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Bag entrance
    Animated.parallel([
      Animated.spring(bagScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(bagOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();

    // Items pop in one by one
    const popIn = (y: Animated.Value, o: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.spring(y, { toValue: 0, friction: 5, tension: 160, useNativeDriver: true }),
          Animated.timing(o, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]),
      ]);

    Animated.parallel([
      popIn(gY, gO, 380),
      popIn(oY, oO, 560),
      popIn(bY, bO, 720),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: bagOpacity, transform: [{ scale: bagScale }] }}>
      <View style={{ width: BAG_W, height: TOTAL_H }}>

        {/* ── Bag body ── */}
        <View style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: BAG_H,
          backgroundColor: '#e8d9c0',
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        }}>
          <View style={{
            height: FOLD_H,
            backgroundColor: '#d4c4a8',
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
          }} />
          <View style={{
            position: 'absolute',
            top: FOLD_H, bottom: 16, left: BAG_W / 2 - 1,
            width: 1.5,
            backgroundColor: 'rgba(0,0,0,0.07)',
          }} />
        </View>

        {/* ── Handles (rendered before items so items appear in front) ── */}
        <View style={{
          position: 'absolute',
          top: ABOVE - 14, left: 14,
          width: 22, height: 18,
          borderTopWidth: 4.5, borderLeftWidth: 4.5, borderRightWidth: 4.5, borderBottomWidth: 0,
          borderTopLeftRadius: 11, borderTopRightRadius: 11,
          borderColor: HANDLE_C,
        }} />
        <View style={{
          position: 'absolute',
          top: ABOVE - 14, right: 14,
          width: 22, height: 18,
          borderTopWidth: 4.5, borderLeftWidth: 4.5, borderRightWidth: 4.5, borderBottomWidth: 0,
          borderTopLeftRadius: 11, borderTopRightRadius: 11,
          borderColor: HANDLE_C,
        }} />

        {/* ── Items (rendered last → in front of handles) ── */}

        {/* Leafy greens — left */}
        <Animated.View style={{
          position: 'absolute', top: 8, left: 8,
          opacity: gO, transform: [{ translateY: gY }],
        }}>
          <View style={{
            width: 22, height: 34, borderRadius: 11,
            backgroundColor: '#4a8a56',
            transform: [{ rotate: '-18deg' }],
          }} />
          <View style={{
            position: 'absolute', top: 4, left: 9,
            width: 18, height: 30, borderRadius: 9,
            backgroundColor: '#5c9e68',
            transform: [{ rotate: '18deg' }],
          }} />
        </Animated.View>

        {/* Orange — centre */}
        <Animated.View style={{
          position: 'absolute', top: 22, left: 35,
          width: 26, height: 26, borderRadius: 13,
          backgroundColor: '#F08030',
          opacity: oO, transform: [{ translateY: oY }],
        }} />

        {/* Baguette — right */}
        <Animated.View style={{
          position: 'absolute', top: 4, right: 10,
          width: 13, height: 46, borderRadius: 6.5,
          backgroundColor: '#c8963c',
          opacity: bO, transform: [{ translateY: bY }],
        }} />

      </View>
    </Animated.View>
  );
}

function SplashOverlay({ authReady, onDone }: { authReady: boolean; onDone: () => void }) {
  const mountTime   = useRef(Date.now());
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  // Hand off from the HTML placeholder — React overlay takes over immediately.
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.getElementById('splash')?.remove();
    }
  }, []);

  // Wordmark fades in after the last item has popped in.
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 900);
    return () => clearTimeout(t);
  }, []);

  // Exit once auth resolves AND minimum display time has elapsed.
  useEffect(() => {
    if (!authReady) return;
    const elapsed = Date.now() - mountTime.current;
    const delay = Math.max(0, MIN_DISPLAY_MS - elapsed);
    const t = setTimeout(() => {
      Animated.timing(exitOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(({ finished }) => { if (finished) onDone(); });
    }, delay);
    return () => clearTimeout(t);
  }, [authReady]);

  return (
    <Animated.View style={[ss.overlay, { opacity: exitOpacity }]}>
      <GroceryBagScene />
      <Animated.Text style={[ss.wordmark, { opacity: textOpacity }]}>
        Well Fed
      </Animated.Text>
    </Animated.View>
  );
}

function AuthGate() {
  const { user, isGuest, loading } = useAuth();
  const router   = useRouter();
  const segments = useSegments();
  // Always show splash on first load — SplashOverlay handles minimum display time internally.
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (loading) return;
    const isAuthed = !!user || isGuest;
    const inAuthScreen = segments[0] === 'sign-in';
    if (!isAuthed && !inAuthScreen) router.replace('/sign-in');
    else if (isAuthed && inAuthScreen) router.replace('/(tabs)');
  }, [user, isGuest, loading]);

  // Stack must not render until auth resolves — screens capture user uid at mount time.
  return (
    <View style={{ flex: 1 }}>
      {loading
        ? <View style={{ flex: 1, backgroundColor: '#faf7f2' }} />
        : <Stack screenOptions={{ headerShown: false }} />
      }
      {showSplash && (
        <SplashOverlay authReady={!loading} onDone={() => setShowSplash(false)} />
      )}
    </View>
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
    backgroundColor: '#faf7f2',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  wordmark: {
    marginTop: 32,
    fontSize: 13,
    fontWeight: '500',
    color: '#9a8aaa',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
});
