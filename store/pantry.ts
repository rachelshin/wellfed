import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PantryItem {
  id: string;
  displayName: string;
  itemName: string;    // lowercase for matching/dedup
  quantity: string;    // free text: "2 cups", "some", "1 bag"
  addedDate: string;   // YYYY-MM-DD
  source: 'manual' | 'receipt';
}

const PANTRY_KEY = '@pantry_items';

function pantryCol(uid: string) {
  return collection(db, 'users', uid, 'pantry');
}

export function todayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function loadPantry(uid?: string | null): Promise<PantryItem[]> {
  if (uid) {
    const snap = await getDocs(pantryCol(uid));
    return snap.docs.map((d) => d.data() as PantryItem);
  }
  const json = await AsyncStorage.getItem(PANTRY_KEY);
  return json ? JSON.parse(json) : [];
}

export async function addPantryItem(
  items: PantryItem[],
  item: Omit<PantryItem, 'id'>,
  uid?: string | null,
): Promise<PantryItem[]> {
  if (items.some((i) => i.itemName === item.itemName)) return items;
  const newItem: PantryItem = { ...item, id: `${Date.now()}-${Math.random()}` };
  if (uid) {
    await setDoc(doc(pantryCol(uid), newItem.id), newItem);
  } else {
    await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify([...items, newItem]));
  }
  return [...items, newItem];
}

export async function updatePantryItem(
  items: PantryItem[],
  id: string,
  patch: Partial<Pick<PantryItem, 'quantity' | 'displayName' | 'itemName'>>,
  uid?: string | null,
): Promise<PantryItem[]> {
  const updated = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
  if (uid) {
    const target = updated.find((i) => i.id === id);
    if (target) await setDoc(doc(pantryCol(uid), id), target);
  } else {
    await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function deletePantryItem(
  items: PantryItem[],
  id: string,
  uid?: string | null,
): Promise<PantryItem[]> {
  const updated = items.filter((i) => i.id !== id);
  if (uid) {
    await deleteDoc(doc(pantryCol(uid), id));
  } else {
    await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function addPantryItemsFromReceipt(
  items: PantryItem[],
  newItems: Omit<PantryItem, 'id'>[],
  uid?: string | null,
): Promise<PantryItem[]> {
  let current = items;
  const toWrite: PantryItem[] = [];
  for (const item of newItems) {
    if (!current.some((i) => i.itemName === item.itemName)) {
      const newItem = { ...item, id: `${Date.now()}-${Math.random()}` };
      current = [...current, newItem];
      toWrite.push(newItem);
    }
  }
  if (uid) {
    await Promise.all(toWrite.map((item) => setDoc(doc(pantryCol(uid), item.id), item)));
  } else {
    await AsyncStorage.setItem(PANTRY_KEY, JSON.stringify(current));
  }
  return current;
}
