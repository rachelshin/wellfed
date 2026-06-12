import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously,
  signInWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  linkWithRedirect,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../lib/firebase';
import { migrateGuestData } from '../lib/migrateGuestData';

// Pre-anonymous-auth guest flag — only read once to upgrade old guests.
const LEGACY_GUEST_KEY = '@is_guest';

interface AuthContextValue {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  enterGuestMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result from Google sign-in on mobile PWA.
    // credential-already-in-use = an anonymous user link-redirected into a
    // Google account that already exists — sign into that account instead.
    getRedirectResult(auth).catch(async (e) => {
      if (e?.code === 'auth/credential-already-in-use') {
        const cred = GoogleAuthProvider.credentialFromError(e);
        if (cred) await signInWithCredential(auth, cred).catch(() => {});
      }
    });

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        // Upgrade legacy guests (old AsyncStorage flag) to an anonymous account
        try {
          if ((await AsyncStorage.getItem(LEGACY_GUEST_KEY)) === 'true') {
            await signInAnonymously(auth); // re-fires onAuthStateChanged
            await AsyncStorage.removeItem(LEGACY_GUEST_KEY);
            return;
          }
        } catch {}
      }
      // Move any local guest data into the account before screens mount and
      // start reading Firestore. No-op after the first run per account.
      if (u) {
        try { await migrateGuestData(u.uid); } catch {}
      }
      setUser(u);
      setIsGuest(u?.isAnonymous ?? false);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    // Signing into an existing account from guest mode abandons the
    // anonymous account — the existing account's data takes over.
    await signInWithEmailAndPassword(auth, email, password);
    setIsGuest(false);
  };

  const signUp = async (email: string, password: string) => {
    const current = auth.currentUser;
    if (current?.isAnonymous) {
      // Linking keeps the same uid, so all guest Firestore data carries over.
      // Note: linking does not re-fire onAuthStateChanged — update state here.
      await linkWithCredential(current, EmailAuthProvider.credential(email, password));
      setIsGuest(false);
      return;
    }
    await createUserWithEmailAndPassword(auth, email, password);
    setIsGuest(false);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const current = auth.currentUser;
      if (current?.isAnonymous) {
        try {
          await linkWithPopup(current, provider);
          setIsGuest(false);
          return;
        } catch (e: unknown) {
          // Google account already has a Well Fed account — sign into it
          if ((e as { code?: string })?.code !== 'auth/credential-already-in-use') throw e;
        }
      }
      await signInWithPopup(auth, provider);
      setIsGuest(false);
    } catch (e: unknown) {
      // Popups are blocked on iOS PWA — fall back to redirect
      if ((e as { code?: string })?.code === 'auth/popup-blocked') {
        const current = auth.currentUser;
        if (current?.isAnonymous) await linkWithRedirect(current, provider);
        else await signInWithRedirect(auth, provider);
      } else {
        throw e;
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const enterGuestMode = async () => {
    await signInAnonymously(auth);
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, signIn, signUp, signInWithGoogle, signOut, enterGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
