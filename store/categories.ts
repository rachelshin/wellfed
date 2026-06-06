import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, getDocsFromCache, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Unit } from './prices';

export interface PriceCategory {
  id: string;
  name: string;      // display label, e.g. "Eggs"
  category: string;  // lowercase key, e.g. "eggs" — always equals name.toLowerCase().trim()
  displayUnit?: Unit;
}

const KEY = '@price_categories';

let _memCategories: PriceCategory[] | null = null;
export function getCategoriesSync(): PriceCategory[] | null { return _memCategories; }

const DEFAULTS: Omit<PriceCategory, 'id'>[] = [
  { name: 'Uncategorized', category: 'uncategorized' },
];

export async function seedDefaultCategories(
  categories: PriceCategory[],
  uid?: string | null,
): Promise<PriceCategory[]> {
  let current = categories;
  for (const def of DEFAULTS) {
    current = await saveCategory(current, def, uid);
  }
  return current;
}

function col(uid: string) {
  return collection(db, 'users', uid, 'priceCategories');
}

export async function loadCategoriesFromCache(uid?: string | null): Promise<PriceCategory[]> {
  if (!uid) return [];
  try {
    const snap = await getDocsFromCache(col(uid));
    const result = snap.docs.map((d) => d.data() as PriceCategory);
    if (result.length > 0) _memCategories = result;
    return result;
  } catch {
    return [];
  }
}

export async function loadCategories(uid?: string | null): Promise<PriceCategory[]> {
  if (uid) {
    const snap = await getDocs(col(uid));
    const result = snap.docs.map((d) => d.data() as PriceCategory);
    _memCategories = result;
    return result;
  }
  const json = await AsyncStorage.getItem(KEY);
  const result = json ? JSON.parse(json) : [];
  _memCategories = result;
  return result;
}

export async function saveCategory(
  categories: PriceCategory[],
  cat: Omit<PriceCategory, 'id'>,
  uid?: string | null,
): Promise<PriceCategory[]> {
  if (categories.some((c) => c.category === cat.category)) return categories;
  const newCat: PriceCategory = { ...cat, id: `${Date.now()}-${Math.random()}` };
  if (uid) {
    await setDoc(doc(col(uid), newCat.id), newCat);
  } else {
    await AsyncStorage.setItem(KEY, JSON.stringify([...categories, newCat]));
  }
  return [...categories, newCat];
}

export async function updateCategory(
  categories: PriceCategory[],
  id: string,
  name: string,
  uid?: string | null,
): Promise<PriceCategory[]> {
  const updated = categories.map((c) => (c.id === id ? { ...c, name } : c));
  const target = updated.find((c) => c.id === id)!;
  if (uid) {
    await setDoc(doc(col(uid), id), target);
  } else {
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function saveNewCategories(
  newCats: PriceCategory[],
  allCats: PriceCategory[],
  uid?: string | null,
): Promise<void> {
  if (!newCats.length) return;
  if (uid) {
    await Promise.all(newCats.map((c) => setDoc(doc(col(uid), c.id), c)));
  } else {
    await AsyncStorage.setItem(KEY, JSON.stringify(allCats));
  }
}

export async function setCategoryDisplayUnit(
  categories: PriceCategory[],
  id: string,
  displayUnit: Unit | undefined,
  uid?: string | null,
): Promise<PriceCategory[]> {
  const updated = categories.map((c) => c.id === id ? { ...c, displayUnit } : c);
  const target = updated.find((c) => c.id === id)!;
  if (uid) {
    await setDoc(doc(col(uid), id), target);
  } else {
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function deleteCategory(
  categories: PriceCategory[],
  id: string,
  uid?: string | null,
): Promise<PriceCategory[]> {
  const updated = categories.filter((c) => c.id !== id);
  if (uid) {
    await deleteDoc(doc(col(uid), id));
  } else {
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }
  return updated;
}
