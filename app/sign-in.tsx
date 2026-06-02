import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth';
import theme from '../lib/theme';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp, signInWithGoogle, enterGuestMode } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setError('Google sign-in failed — please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 + iosPWAKeyboard }]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Text style={s.logo}>🌿</Text>
        <Text style={s.appName}>Well Fed</Text>

        <TouchableOpacity
          style={[s.googleBtn, googleLoading && s.btnDisabled]}
          onPress={handleGoogle}
          disabled={googleLoading}
          activeOpacity={0.85}
        >
          <Text style={s.googleG}>G</Text>
          <Text style={s.googleBtnText}>
            {googleLoading ? 'Signing in…' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor={theme.placeholder}
        />
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={mode === 'signup' ? 'Password (6+ characters)' : 'Password'}
          placeholderTextColor={theme.placeholder}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[s.submitBtn, loading && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={s.submitBtnText}>
            {loading ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
          style={s.switchWrap}
        >
          <Text style={s.switchText}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={s.switchLink}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={enterGuestMode} style={s.guestWrap}>
          <Text style={s.guestText}>Continue as guest</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingTop: 32 },

  logo: { fontSize: 56, textAlign: 'center', marginBottom: 10 },
  appName: { fontSize: 30, fontWeight: '800', color: theme.textDark, textAlign: 'center', marginBottom: 36 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.card, borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: theme.border, marginBottom: 24,
    shadowColor: theme.primaryShadow, shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 2, gap: 10,
  },
  googleG: { fontSize: 18, fontWeight: '800', color: theme.accent },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: theme.textDark },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { fontSize: 13, color: theme.textFaint, fontWeight: '600' },

  input: {
    backgroundColor: theme.card, borderRadius: 14, borderWidth: 1.5,
    borderColor: theme.border, padding: 15, fontSize: 16,
    color: theme.textDark, marginBottom: 12, outlineWidth: 0, outlineStyle: 'none',
  },

  error: { color: theme.negative, fontSize: 13, fontWeight: '600', marginBottom: 10, textAlign: 'center' },

  submitBtn: {
    backgroundColor: theme.primary, borderRadius: 16, padding: 17,
    alignItems: 'center', marginTop: 4, marginBottom: 20,
    shadowColor: theme.primaryShadow, shadowOpacity: 0.25, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 3,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: theme.card, fontSize: 16, fontWeight: '800' },

  switchWrap: { alignItems: 'center', marginBottom: 28 },
  switchText: { fontSize: 14, color: theme.textMuted },
  switchLink: { color: theme.primary, fontWeight: '700' },

  guestWrap: { alignItems: 'center', paddingVertical: 8 },
  guestText: { fontSize: 14, color: theme.textFaint, fontWeight: '600' },
});
