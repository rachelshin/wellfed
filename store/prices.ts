import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, getDocsFromCache, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type Unit = 'oz' | 'lb' | 'g' | 'kg' | 'ml' | 'L' | 'fl oz' | 'count';

export interface PriceEntry {
  id: string;
  itemName: string;   // display name, e.g. "Large Eggs"
  category: string;   // lowercase grouping key, e.g. "eggs"
  store: string;
  price: number;
  size: number;
  unit: Unit;
  dateAdded: string;  // YYYY-MM-DD
  scannedName?: string;
}

const PRICES_KEY = '@price_entries';

export const UNITS: Unit[] = ['oz', 'lb', 'g', 'kg', 'ml', 'L', 'fl oz', 'count'];

function pricesCol(uid: string) {
  return collection(db, 'users', uid, 'prices');
}

export async function loadPricesFromCache(uid?: string | null): Promise<PriceEntry[]> {
  if (!uid) return [];
  try {
    const snap = await getDocsFromCache(pricesCol(uid));
    return snap.docs.map((d) => d.data() as PriceEntry);
  } catch {
    return [];
  }
}

export async function loadPrices(uid?: string | null): Promise<PriceEntry[]> {
  if (uid) {
    const snap = await getDocs(pricesCol(uid));
    return snap.docs.map((d) => d.data() as PriceEntry);
  }
  const json = await AsyncStorage.getItem(PRICES_KEY);
  return json ? JSON.parse(json) : [];
}

export async function addPrice(
  prices: PriceEntry[],
  price: Omit<PriceEntry, 'id'>,
  uid?: string | null,
): Promise<PriceEntry[]> {
  if (price.scannedName) {
    const isDuplicate = prices.some(
      (p) =>
        p.scannedName === price.scannedName &&
        Math.abs(p.price - price.price) < 0.001 &&
        p.store.toLowerCase() === price.store.toLowerCase(),
    );
    if (isDuplicate) return prices;
  }
  const newPrice: PriceEntry = { ...price, id: `${Date.now()}-${Math.random()}` };
  if (uid) {
    await setDoc(doc(pricesCol(uid), newPrice.id), newPrice);
  } else {
    await AsyncStorage.setItem(PRICES_KEY, JSON.stringify([...prices, newPrice]));
  }
  return [...prices, newPrice];
}

export async function updatePrice(
  prices: PriceEntry[],
  id: string,
  updates: Partial<Omit<PriceEntry, 'id'>>,
  uid?: string | null,
): Promise<PriceEntry[]> {
  const updated = prices.map((p) => p.id === id ? { ...p, ...updates } : p);
  const entry = updated.find((p) => p.id === id)!;
  if (uid) {
    await setDoc(doc(pricesCol(uid), id), entry);
  } else {
    await AsyncStorage.setItem(PRICES_KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function deletePrice(
  prices: PriceEntry[],
  id: string,
  uid?: string | null,
): Promise<PriceEntry[]> {
  const updated = prices.filter((p) => p.id !== id);
  if (uid) {
    await deleteDoc(doc(pricesCol(uid), id));
  } else {
    await AsyncStorage.setItem(PRICES_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function pricePerUnit(entry: PriceEntry): number {
  return entry.size > 0 ? entry.price / entry.size : entry.price;
}

export function formatPricePerUnit(entry: PriceEntry): string {
  const ppu = pricePerUnit(entry);
  return `$${ppu.toFixed(3)}/${entry.unit}`;
}

export function groupByItem(prices: PriceEntry[]): Map<string, PriceEntry[]> {
  const map = new Map<string, PriceEntry[]>();
  for (const p of prices) {
    if (!map.has(p.category)) map.set(p.category, []);
    map.get(p.category)!.push(p);
  }
  return map;
}

export function bestPrice(entries: PriceEntry[]): PriceEntry | null {
  if (!entries.length) return null;
  return entries.reduce((best, e) => pricePerUnit(e) < pricePerUnit(best) ? e : best);
}
