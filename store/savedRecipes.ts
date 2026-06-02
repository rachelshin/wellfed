import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface SavedIngredient {
  name: string;
  amount: string;
}

export interface SavedRecipe {
  id: string;
  title: string;
  ingredients: SavedIngredient[];
  steps: string[];
  savedAt: string;
}

const KEY = '@saved_recipes';

function col(uid: string) {
  return collection(db, 'users', uid, 'savedRecipes');
}

export async function loadSavedRecipes(uid?: string | null): Promise<SavedRecipe[]> {
  if (uid) {
    const snap = await getDocs(col(uid));
    return snap.docs.map((d) => d.data() as SavedRecipe);
  }
  const json = await AsyncStorage.getItem(KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveRecipe(
  recipes: SavedRecipe[],
  recipe: Omit<SavedRecipe, 'id'>,
  uid?: string | null,
): Promise<SavedRecipe[]> {
  const newRecipe: SavedRecipe = { ...recipe, id: `${Date.now()}-${Math.random()}` };
  if (uid) {
    await setDoc(doc(col(uid), newRecipe.id), newRecipe);
  } else {
    await AsyncStorage.setItem(KEY, JSON.stringify([...recipes, newRecipe]));
  }
  return [...recipes, newRecipe];
}

export async function updateSavedRecipe(
  recipes: SavedRecipe[],
  id: string,
  updates: Partial<Omit<SavedRecipe, 'id'>>,
  uid?: string | null,
): Promise<SavedRecipe[]> {
  const updated = recipes.map((r) => r.id === id ? { ...r, ...updates } : r);
  const entry = updated.find((r) => r.id === id)!;
  if (uid) {
    await setDoc(doc(col(uid), id), entry);
  } else {
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function deleteSavedRecipe(
  recipes: SavedRecipe[],
  id: string,
  uid?: string | null,
): Promise<SavedRecipe[]> {
  const updated = recipes.filter((r) => r.id !== id);
  if (uid) {
    await deleteDoc(doc(col(uid), id));
  } else {
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }
  return updated;
}
