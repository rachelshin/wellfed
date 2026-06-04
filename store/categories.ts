import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, getDocsFromCache, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface PriceCategory {
  id: string;
  name: string;      // display label, e.g. "Eggs"
  category: string;  // lowercase key, e.g. "eggs" — always equals name.toLowerCase().trim()
}

const KEY = '@price_categories';

function col(uid: string) {
  return collection(db, 'users', uid, 'priceCategories');
}

export async function loadCategoriesFromCache(uid?: string | null): Promise<PriceCategory[]> {
  if (!uid) return [];
  try {
    const snap = await getDocsFromCache(col(uid));
    return snap.docs.map((d) => d.data() as PriceCategory);
  } catch {
    return [];
  }
}

export async function loadCategories(uid?: string | null): Promise<PriceCategory[]> {
  if (uid) {
    const snap = await getDocs(col(uid));
    return snap.docs.map((d) => d.data() as PriceCategory);
  }
  const json = await AsyncStorage.getItem(KEY);
  return json ? JSON.parse(json) : [];
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
