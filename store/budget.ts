import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type Category =
  | 'groceries'
  | 'delivery'
  | 'fast-food'
  | 'restaurants'
  | 'snacks'
  | 'drinks';

export interface SpendingEntry {
  id: string;
  date: string;        // YYYY-MM-DD
  amount: number;
  category: Category;
  description: string;
  timestamp: number;
}

export interface BudgetSettings {
  dailyBudget: number;
  startDate: string;          // YYYY-MM-DD — first day of tracking
  adjustments?: Record<string, number>; // date → manual remaining override delta
  bankBalance?: number;
}

const ENTRIES_KEY = '@budget_entries';
const SETTINGS_KEY = '@budget_settings';

// Module-level cache so tab re-focus renders instantly without a network round-trip
const _entriesCache = new Map<string, SpendingEntry[]>();
const _settingsCache = new Map<string, BudgetSettings | null>();

export function getCachedEntries(uid: string): SpendingEntry[] | null {
  return _entriesCache.get(uid) ?? null;
}
export function getCachedSettings(uid: string): BudgetSettings | null | undefined {
  return _settingsCache.has(uid) ? (_settingsCache.get(uid) ?? null) : undefined;
}

function entriesCol(uid: string) {
  return collection(db, 'users', uid, 'entries');
}
function settingsDoc(uid: string) {
  return doc(db, 'users', uid, 'settings', 'main');
}

export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export async function loadEntries(uid?: string | null): Promise<SpendingEntry[]> {
  if (uid) {
    const snap = await getDocs(entriesCol(uid));
    const entries = snap.docs.map((d) => d.data() as SpendingEntry);
    _entriesCache.set(uid, entries);
    return entries;
  }
  const json = await AsyncStorage.getItem(ENTRIES_KEY);
  return json ? JSON.parse(json) : [];
}

export async function addEntry(
  entries: SpendingEntry[],
  entry: Omit<SpendingEntry, 'id' | 'timestamp'>,
  uid?: string | null,
): Promise<SpendingEntry[]> {
  const newEntry: SpendingEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
  };
  const updated = [...entries, newEntry];
  if (uid) {
    await setDoc(doc(entriesCol(uid), newEntry.id), newEntry);
    _entriesCache.set(uid, updated);
  } else {
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function deleteEntry(
  entries: SpendingEntry[],
  id: string,
  uid?: string | null,
): Promise<SpendingEntry[]> {
  const updated = entries.filter((e) => e.id !== id);
  if (uid) {
    await deleteDoc(doc(entriesCol(uid), id));
    _entriesCache.set(uid, updated);
  } else {
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function loadSettings(uid?: string | null): Promise<BudgetSettings | null> {
  if (uid) {
    const snap = await getDoc(settingsDoc(uid));
    const settings = snap.exists() ? (snap.data() as BudgetSettings) : null;
    _settingsCache.set(uid, settings);
    return settings;
  }
  const json = await AsyncStorage.getItem(SETTINGS_KEY);
  return json ? JSON.parse(json) : null;
}

export async function saveSettings(settings: BudgetSettings, uid?: string | null): Promise<void> {
  if (uid) {
    await setDoc(settingsDoc(uid), settings);
    _settingsCache.set(uid, settings);
  } else {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}

export function getDaySpent(entries: SpendingEntry[], date: string): number {
  return entries
    .filter((e) => e.date === date)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function getAvailableBudget(
  entries: SpendingEntry[],
  settings: BudgetSettings,
  forDate: string
): number {
  const { dailyBudget, startDate, adjustments = {} } = settings;

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(forDate + 'T00:00:00');

  // carry = end-of-day remaining accumulated from previous days
  // each day's carry factors in any manual adjustment for that day
  let carry = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    const dateStr = cursor.toISOString().split('T')[0];
    const daySpent = getDaySpent(entries, dateStr);
    carry = dailyBudget + carry - daySpent + (adjustments[dateStr] ?? 0);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dailyBudget + carry + (adjustments[forDate] ?? 0);
}

export const CATEGORIES: Record<
  Category,
  { label: string; emoji: string; color: string }
> = {
  groceries: { label: 'Groceries', emoji: '🛒', color: '#7AAB87' },
  delivery: { label: 'Delivery', emoji: '🚚', color: '#3B82F6' },
  'fast-food': { label: 'Fast Food', emoji: '🍔', color: '#F97316' },
  restaurants: { label: 'Restaurants', emoji: '🍽️', color: '#A78BFA' },
  snacks: { label: 'Snacks', emoji: '🍿', color: '#FB923C' },
  drinks: { label: 'Drinks', emoji: '🧃', color: '#06B6D4' },
};
