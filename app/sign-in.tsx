import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, enterGuestMode } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [iosPWAKeyboard, setIosPWAKeyboard] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!window.navigator?.standalone || !window.visualViewport) return;
    const onResize = () =>
      setIosPWAKeyboard(Math.max(0, window.innerHeight - window.visualViewport!.height));
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport!.removeEventListener('resize', onResize);
  }, []);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in both fields.'); return; }
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        if (password.length < 6) { setError('Password needs at least 6 characters.'); setLoading(false); return; }
        await signUp(email.trim(), password);
      }
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? '';
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
        setError('Incorrect email or password.');
      } else if (code.includes('email-already-in-use')) {
        setError('An account with this email already exists.');
      } else if (code.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else {
        setError('Something went wrong — please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    await enterGuestMode();
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 + iosPWAKeyboard }]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Text style={s.logo}>🍽️</Text>
        <Text style={s.appName}>Food Budget</Text>
        <Text style={s.tagline}>
          {mode === 'signin'
            ? 'Welcome back! Ready to eat well? 🌟'
            : 'Let\'s set you up — your food journey starts here 🚀'}
        </Text>

        <View style={s.card}>
          <View style={s.modeToggle}>
            <TouchableOpacity
              style={[s.modeBtn, mode === 'signin' && s.modeBtnActive]}
              onPress={() => { setMode('signin'); setError(''); }}
            >
              <Text style={[s.modeBtnText, mode === 'signin' && s.modeBtnTextActive]}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeBtn, mode === 'signup' && s.modeBtnActive]}
              onPress={() => { setMode('signup'); setError(''); }}
            >
              <Text style={[s.modeBtnText, mode === 'signup' && s.modeBtnTextActive]}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#D1C4D4"
            autoFocus
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
            placeholderTextColor="#D1C4D4"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.submitBtn, loading && s.submitBtnLoading]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={s.submitBtnText}>
              {loading ? 'One moment…' : mode === 'signin' ? 'Sign In ✨' : 'Create Account 🎉'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.switchPrompt}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <Text
            style={s.switchLink}
            onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </Text>
        </Text>

        {/* Guest access divider */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        <TouchableOpacity style={s.guestBtn} onPress={handleGuest} activeOpacity={0.7}>
          <Text style={s.guestBtnText}>Continue as Guest</Text>
        </TouchableOpacity>

        <Text style={s.guestNote}>
          Your data stays on this device. You can sign in later to back it up.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF5F8' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 40 },

  logo: { fontSize: 64, textAlign: 'center', marginBottom: 12 },
  appName: { fontSize: 32, fontWeight: '900', color: '#1E1B4B', textAlign: 'center', marginBottom: 8 },
  tagline: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', marginBottom: 32, lineHeight: 22 },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#FF6B9D', shadowOpacity: 0.1, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 4,
    borderWidth: 1.5, borderColor: '#FCE7F3', marginBottom: 16,
  },

  modeToggle: {
    flexDirection: 'row', backgroundColor: '#FFF5F8', borderRadius: 14,
    padding: 4, marginBottom: 24,
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  modeBtnActive: {
    backgroundColor: '#FF6B9D',
    shadowColor: '#FF6B9D', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  modeBtnText: { fontSize: 14, fontWeight: '700', color: '#C4B5C8' },
  modeBtnTextActive: { color: '#fff' },

  label: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 2, borderColor: '#FCE7F3', borderRadius: 14,
    padding: 14, fontSize: 16, color: '#1E1B4B',
    backgroundColor: '#FFF5F8', marginBottom: 16,
  },
  error: { color: '#F43F5E', fontSize: 13, fontWeight: '600', marginBottom: 12, textAlign: 'center' },

  submitBtn: {
    backgroundColor: '#FF6B9D', borderRadius: 16, padding: 18, alignItems: 'center',
    shadowColor: '#FF6B9D', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    marginTop: 4,
  },
  submitBtnLoading: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  switchPrompt: { textAlign: 'center', fontSize: 14, color: '#9CA3AF', marginBottom: 20 },
  switchLink: { color: '#FF6B9D', fontWeight: '700' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#FCE7F3' },
  dividerText: { fontSize: 13, color: '#C4B5C8', fontWeight: '600' },

  guestBtn: {
    borderWidth: 2, borderColor: '#FCE7F3', borderRadius: 16, padding: 16,
    alignItems: 'center', backgroundColor: '#fff', marginBottom: 12,
  },
  guestBtnText: { color: '#9CA3AF', fontSize: 16, fontWeight: '700' },

  guestNote: { textAlign: 'center', fontSize: 12, color: '#C4B5C8', lineHeight: 18 },
});
