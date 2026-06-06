import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc, deleteDoc, getDoc, query, where, Query, DocumentData } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface FundsRecord {
  id: string;
  date: string;       // YYYY-MM-DD
  amount: number;
  note: string;
  timestamp: number;
  type: 'daily-increment' | 'manual';
}

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
  bankBalance?: number;
  carry?: { date: string; amount: number }; // end-of-day remaining cache through `date`
  fundsLastChecked?: string;  // YYYY-MM-DD — daily-increment records exist through this date
}

const ENTRIES_KEY = '@budget_entries';
const SETTINGS_KEY = '@budget_settings';
const FUNDS_KEY = '@budget_funds';
const ENTRIES_UID_PREFIX = '@budget_entries_uid_';
const SETTINGS_UID_PREFIX = '@budget_settings_uid_';
const FUNDS_UID_PREFIX = '@budget_funds_uid_';

// Module-level cache so tab re-focus renders instantly without a network round-trip
const _entriesCache = new Map<string, SpendingEntry[]>();
const _settingsCache = new Map<string, BudgetSettings | null>();
const _fundsCache = new Map<string, FundsRecord[]>();

export function getCachedEntries(uid: string): SpendingEntry[] | null {
  return _entriesCache.get(uid) ?? null;
}
export function getCachedSettings(uid: string): BudgetSettings | null | undefined {
  return _settingsCache.has(uid) ? (_settingsCache.get(uid) ?? null) : undefined;
}
export function getCachedFunds(uid: string): FundsRecord[] | null {
  return _fundsCache.get(uid) ?? null;
}

// Reads the persisted AsyncStorage copy for signed-in users (survives page refresh).
export async function getLocalCachedEntries(uid: string): Promise<SpendingEntry[] | null> {
  try {
    const json = await AsyncStorage.getItem(ENTRIES_UID_PREFIX + uid);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

// Returns undefined if the key has never been written (distinct from null = no settings).
export async function getLocalCachedSettings(uid: string): Promise<BudgetSettings | null | undefined> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_UID_PREFIX + uid);
    if (raw === null) return undefined;
    return JSON.parse(raw) as BudgetSettings | null;
  } catch { return undefined; }
}

export async function getLocalCachedFunds(uid: string): Promise<FundsRecord[] | null> {
  try {
    const json = await AsyncStorage.getItem(FUNDS_UID_PREFIX + uid);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

// Returns the earliest date we need entries from, given the current carry state.
// This lets us skip fetching the full history when carry is already up to date.
export function entriesNeededFrom(settings: BudgetSettings | null, todayStr: string): string {
  if (!settings?.carry?.date) return settings?.startDate ?? todayStr;
  return addDay(settings.carry.date);
}

function entriesCol(uid: string) {
  return collection(db, 'users', uid, 'entries');
}
function settingsDoc(uid: string) {
  return doc(db, 'users', uid, 'settings', 'main');
}
function fundsCol(uid: string) {
  return collection(db, 'users', uid, 'funds');
}

export function addDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function today(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export async function loadEntries(uid?: string | null, fromDate?: string): Promise<SpendingEntry[]> {
  if (uid) {
    const col = entriesCol(uid);
    const q: Query<DocumentData> = fromDate
      ? query(col, where('date', '>=', fromDate))
      : col;
    const snap = await getDocs(q);
    const entries = snap.docs.map((d) => d.data() as SpendingEntry);
    _entriesCache.set(uid, entries);
    AsyncStorage.setItem(ENTRIES_UID_PREFIX + uid, JSON.stringify(entries)); // fire-and-forget
    return entries;
  }
  const json = await AsyncStorage.getItem(ENTRIES_KEY);
  return json ? JSON.parse(json) : [];
}

export async function addSingleEntry(
  entry: Omit<SpendingEntry, 'id' | 'timestamp'>,
  uid?: string | null,
): Promise<void> {
  const newEntry: SpendingEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
  };
  if (uid) {
    await setDoc(doc(entriesCol(uid), newEntry.id), newEntry);
    _entriesCache.delete(uid);
  } else {
    const existing = await AsyncStorage.getItem(ENTRIES_KEY);
    const arr: SpendingEntry[] = existing ? JSON.parse(existing) : [];
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify([...arr, newEntry]));
  }
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

export async function updateEntry(
  entries: SpendingEntry[],
  id: string,
  updates: Omit<SpendingEntry, 'id' | 'timestamp'>,
  uid?: string | null,
): Promise<SpendingEntry[]> {
  const updated = entries.map((e) => e.id === id ? { ...e, ...updates } : e);
  if (uid) {
    const entry = updated.find((e) => e.id === id)!;
    await setDoc(doc(entriesCol(uid), id), entry);
    _entriesCache.set(uid, updated);
  } else {
    await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function loadFundsRecords(uid?: string | null): Promise<FundsRecord[]> {
  if (uid) {
    const snap = await getDocs(fundsCol(uid));
    const records = snap.docs.map((d) => d.data() as FundsRecord);
    _fundsCache.set(uid, records);
    AsyncStorage.setItem(FUNDS_UID_PREFIX + uid, JSON.stringify(records));
    return records;
  }
  const json = await AsyncStorage.getItem(FUNDS_KEY);
  return json ? JSON.parse(json) : [];
}

export async function addFundsRecord(
  records: FundsRecord[],
  record: Omit<FundsRecord, 'id' | 'timestamp'>,
  uid?: string | null,
): Promise<FundsRecord[]> {
  const newRecord: FundsRecord = { ...record, id: `${Date.now()}-${Math.random()}`, timestamp: Date.now() };
  const updated = [...records, newRecord];
  if (uid) {
    await setDoc(doc(fundsCol(uid), newRecord.id), newRecord);
    _fundsCache.set(uid, updated);
    AsyncStorage.setItem(FUNDS_UID_PREFIX + uid, JSON.stringify(updated));
  } else {
    await AsyncStorage.setItem(FUNDS_KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function updateFundsRecord(
  records: FundsRecord[],
  id: string,
  updates: Partial<Pick<FundsRecord, 'amount' | 'note' | 'date'>>,
  uid?: string | null,
): Promise<FundsRecord[]> {
  const updated = records.map((r) => r.id === id ? { ...r, ...updates } : r);
  if (uid) {
    const record = updated.find((r) => r.id === id)!;
    await setDoc(doc(fundsCol(uid), id), record);
    _fundsCache.set(uid, updated);
    AsyncStorage.setItem(FUNDS_UID_PREFIX + uid, JSON.stringify(updated));
  } else {
    await AsyncStorage.setItem(FUNDS_KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function deleteFundsRecord(
  records: FundsRecord[],
  id: string,
  uid?: string | null,
): Promise<FundsRecord[]> {
  const updated = records.filter((r) => r.id !== id);
  if (uid) {
    await deleteDoc(doc(fundsCol(uid), id));
    _fundsCache.set(uid, updated);
    AsyncStorage.setItem(FUNDS_UID_PREFIX + uid, JSON.stringify(updated));
  } else {
    await AsyncStorage.setItem(FUNDS_KEY, JSON.stringify(updated));
  }
  return updated;
}

// Ensures daily-increment records exist for every day from the day after fundsLastChecked
// (or startDate on first run) through today. Only looks forward — never re-creates deleted records.
// Returns updated records and updated settings (with fundsLastChecked advanced to today).
export async function ensureDailyIncrements(
  records: FundsRecord[],
  settings: BudgetSettings,
  todayStr: string,
  uid?: string | null,
): Promise<{ records: FundsRecord[]; settings: BudgetSettings }> {
  const fromDate = settings.fundsLastChecked
    ? addDay(settings.fundsLastChecked)
    : settings.startDate;

  const toAdd: Omit<FundsRecord, 'id' | 'timestamp'>[] = [];
  let cursor = fromDate;
  while (cursor <= todayStr) {
    toAdd.push({ date: cursor, amount: settings.dailyBudget, note: '', type: 'daily-increment' });
    cursor = addDay(cursor);
  }

  let updatedRecords = records;
  if (toAdd.length > 0) {
    const newRecords: FundsRecord[] = toAdd.map((r) => ({
      ...r,
      id: `${Date.now()}-${Math.random()}-${r.date}`,
      timestamp: Date.now(),
    }));
    updatedRecords = [...records, ...newRecords];
    if (uid) {
      await Promise.all(newRecords.map((r) => setDoc(doc(fundsCol(uid), r.id), r)));
      _fundsCache.set(uid, updatedRecords);
      AsyncStorage.setItem(FUNDS_UID_PREFIX + uid, JSON.stringify(updatedRecords));
    } else {
      await AsyncStorage.setItem(FUNDS_KEY, JSON.stringify(updatedRecords));
    }
  }

  if (settings.fundsLastChecked === todayStr) {
    return { records: updatedRecords, settings };
  }
  return { records: updatedRecords, settings: { ...settings, fundsLastChecked: todayStr } };
}

export async function loadSettings(uid?: string | null): Promise<BudgetSettings | null> {
  if (uid) {
    const snap = await getDoc(settingsDoc(uid));
    const settings = snap.exists() ? (snap.data() as BudgetSettings) : null;
    _settingsCache.set(uid, settings);
    AsyncStorage.setItem(SETTINGS_UID_PREFIX + uid, JSON.stringify(settings)); // fire-and-forget
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

// Call this after loading entries+settings each day.
// Computes end-of-day carry through `throughDate` (usually yesterday) and caches it.
// Returns updated settings — same object reference if nothing changed.
export function refreshCarry(
  entries: SpendingEntry[],
  settings: BudgetSettings,
  throughDate: string,
): BudgetSettings {
  const { dailyBudget, startDate, carry } = settings;
  if (throughDate < startDate) return settings;
  if (carry && carry.date >= throughDate) return settings;

  let amount = carry?.amount ?? 0;
  let cursor = carry ? addDay(carry.date) : startDate;

  while (cursor <= throughDate) {
    amount = dailyBudget + amount - getDaySpent(entries, cursor);
    cursor = addDay(cursor);
  }

  return { ...settings, carry: { date: throughDate, amount } };
}

export function getAvailableBudget(
  entries: SpendingEntry[],
  settings: BudgetSettings,
  forDate: string
): number {
  const { dailyBudget, startDate, carry } = settings;

  // Fast path: carry is cached through the day before forDate
  const prevDate = (() => {
    const [y, m, d] = forDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  })();
  if (carry?.date === prevDate) {
    return dailyBudget + carry.amount;
  }

  // Fallback: iterate from carry date (or startDate) forward
  let amount = carry?.amount ?? 0;
  let cursor = carry && carry.date >= startDate ? addDay(carry.date) : startDate;
  while (cursor < forDate) {
    amount = dailyBudget + amount - getDaySpent(entries, cursor);
    cursor = addDay(cursor);
  }

  return dailyBudget + amount;
}

export const CATEGORIES: Record<
  Category,
  { label: string; emoji: string; color: string }
> = {
  groceries: { label: 'Groceries', emoji: '🛒', color: '#C4856A' },
  delivery: { label: 'Delivery', emoji: '🛍️', color: '#3B82F6' },
  'fast-food': { label: 'Fast Food', emoji: '🍔', color: '#F97316' },
  restaurants: { label: 'Restaurants', emoji: '🍽️', color: '#8a7aaa' },
  snacks: { label: 'Snacks & Drinks', emoji: '🍿', color: '#FB923C' },
  drinks: { label: 'Snacks & Drinks', emoji: '🍿', color: '#FB923C' },
};
