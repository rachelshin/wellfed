import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../lib/firebase';

const GUEST_KEY = '@is_guest';

interface AuthContextValue {
  user: User | null;
  isGuest: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  enterGuestMode: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check persisted guest mode before Firebase resolves
    AsyncStorage.getItem(GUEST_KEY).then((val) => {
      if (val === 'true') setIsGuest(true);
    });

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    // Clear guest mode if they sign in
    await AsyncStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    await AsyncStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    await AsyncStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
  };

  const enterGuestMode = async () => {
    await AsyncStorage.setItem(GUEST_KEY, 'true');
    setIsGuest(true);
  };

  const exitGuestMode = async () => {
    await AsyncStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, signIn, signUp, signOut, enterGuestMode, exitGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
