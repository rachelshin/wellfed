import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { SpaceGrotesk_700Bold, SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk';
import { AuthProvider, useAuth } from '../context/auth';

const MIN_DISPLAY_MS = 2000;

// ── Bag geometry ──────────────────────────────────────────────────────────
// ABOVE = vertical space above the bag where items peek out.
// Fold strip is rendered ON TOP of items, clipping them at the bag opening.
const BAG_W    = 96;
const BAG_H    = 115;
const ABOVE    = 60;          // y of bag opening in the container
const TOTAL_H  = BAG_H + ABOVE; // 175
const FOLD_H   = 20;          // fold strip clips this many px of items at the opening
const HANDLE_C = '#8B5E3C';

// Items animate from ITEM_START (fully inside bag) to 0 (half in / half out).
// Must be ≥ (ABOVE - topmost item's top) so every item starts below the fold.
const ITEM_START = 58;

function GroceryBagScene() {
  const bagOpacity = useRef(new Animated.Value(0)).current;
  const bagScale   = useRef(new Animated.Value(0.85)).current;

  const gY = useRef(new Animated.Value(ITEM_START)).current; // greens
  const gO = useRef(new Animated.Value(0)).current;
  const oY = useRef(new Animated.Value(ITEM_START)).current; // orange
  const oO = useRef(new Animated.Value(0)).current;
  const bY = useRef(new Animated.Value(ITEM_START)).current; // baguette
  const bO = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(bagScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      Animated.timing(bagOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();

    const popIn = (y: Animated.Value, o: Animated.Value, delay: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.spring(y, { toValue: 0, friction: 5, tension: 120, useNativeDriver: true }),
          Animated.timing(o, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]),
      ]);

    Animated.parallel([
      popIn(gY, gO, 380),  // greens — leftmost, front
      popIn(oY, oO, 570),  // orange — center
      popIn(bY, bO, 740),  // baguette — right, back
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: bagOpacity, transform: [{ scale: bagScale }] }}>
      <View style={{ width: BAG_W, height: TOTAL_H }}>

        {/* ── 1. Bag body (behind everything) ────────────────────────── */}
        <View style={{
          position: 'absolute',
          top: ABOVE, left: 0, right: 0, bottom: 0,
          backgroundColor: '#e8d9c0',
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
        }}>
          {/* Center crease */}
          <View style={{
            position: 'absolute',
            top: FOLD_H + 4, bottom: 16, left: BAG_W / 2 - 1,
            width: 1.5, backgroundColor: 'rgba(0,0,0,0.07)',
          }} />
        </View>

        {/* ── 2. Items — rendered behind fold strip so fold clips them ── */}

        {/* Baguette — right side, behind orange (rendered first = lowest z) */}
        <Animated.View style={{
          position: 'absolute', top: 5, left: 65,
          width: 16, height: 72, borderRadius: 8,
          backgroundColor: '#c8963c',
          opacity: bO, transform: [{ translateY: bY }],
        }} />

        {/* Orange — center, behind greens (rendered second) */}
        <Animated.View style={{
          position: 'absolute', top: 22, left: 22,
          width: 42, height: 42, borderRadius: 21,
          backgroundColor: '#E87830',
          opacity: oO, transform: [{ translateY: oY }],
        }} />

        {/* Leafy greens — left, in front (rendered third = highest item z) */}
        <Animated.View style={{
          position: 'absolute', top: 4, left: 4,
          opacity: gO, transform: [{ translateY: gY }],
        }}>
          <View style={{
            width: 26, height: 58, borderRadius: 13,
            backgroundColor: '#3a7a48',
            transform: [{ rotate: '-18deg' }],
          }} />
          <View style={{
            position: 'absolute', top: 6, left: 12,
            width: 22, height: 50, borderRadius: 11,
            backgroundColor: '#4d9060',
            transform: [{ rotate: '18deg' }],
          }} />
        </Animated.View>

        {/* ── 3. Fold strip — clips the lower portion of items ─────────
             Rendered AFTER items so it paints on top of them.
             This is what creates the "half in / half out" illusion.    */}
        <View style={{
          position: 'absolute',
          top: ABOVE, left: 0, right: 0,
          height: FOLD_H,
          backgroundColor: '#d4c4a8',
        }} />

        {/* ── 4. Handles (top layer) ───────────────────────────────────── */}
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

      </View>
    </Animated.View>
  );
}

function SplashOverlay({ authReady, onDone }: { authReady: boolean; onDone: () => void }) {
  const mountTime   = useRef(Date.now());
  const exitOpacity = useRef(new Animated.Value(1)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.getElementById('splash')?.remove();
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, 950);
    return () => clearTimeout(t);
  }, []);

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
  const [fontsLoaded] = useFonts({ SpaceGrotesk_700Bold, SpaceGrotesk_500Medium });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#faf7f2' }} />;
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
