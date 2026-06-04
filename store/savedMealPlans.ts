import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MealPlan } from '../lib/ai';

export interface SavedMealPlan {
  id: string;
  title: string;
  plan: MealPlan;
  savedAt: string;
}

const KEY = '@saved_meal_plans';

function col(uid: string) {
  return collection(db, 'users', uid, 'savedMealPlans');
}

export async function loadSavedMealPlans(uid?: string | null): Promise<SavedMealPlan[]> {
  if (uid) {
    const snap = await getDocs(col(uid));
    return snap.docs.map((d) => d.data() as SavedMealPlan);
  }
  const json = await AsyncStorage.getItem(KEY);
  return json ? JSON.parse(json) : [];
}

export async function saveMealPlan(
  plans: SavedMealPlan[],
  plan: MealPlan,
  title: string,
  uid?: string | null,
): Promise<SavedMealPlan[]> {
  const newPlan: SavedMealPlan = {
    id: `${Date.now()}-${Math.random()}`,
    title,
    plan,
    savedAt: new Date().toISOString(),
  };
  const updated = [newPlan, ...plans];
  if (uid) {
    await setDoc(doc(col(uid), newPlan.id), newPlan);
  } else {
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }
  return updated;
}

export async function deleteSavedMealPlan(
  plans: SavedMealPlan[],
  id: string,
  uid?: string | null,
): Promise<SavedMealPlan[]> {
  const updated = plans.filter((p) => p.id !== id);
  if (uid) {
    await deleteDoc(doc(col(uid), id));
  } else {
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }
  return updated;
}
