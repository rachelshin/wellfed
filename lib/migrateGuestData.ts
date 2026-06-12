import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, limit, query, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Guest mode stores everything in AsyncStorage; signed-in users read Firestore.
// Without this, a guest who creates an account "loses" all their local data.
// Runs once per uid (flagged), copies each local store into the user's empty
// Firestore collections, then clears the local copy.

const MIGRATED_FLAG_PREFIX = '@guest_migrated_';
const SETTINGS_KEY = '@budget_settings';

const COLLECTIONS: { storageKey: string; collectionName: string }[] = [
  { storageKey: '@budget_entries', collectionName: 'entries' },
  { storageKey: '@budget_funds', collectionName: 'funds' },
  { storageKey: '@pantry_items', collectionName: 'pantry' },
  { storageKey: '@price_entries', collectionName: 'prices' },
  { storageKey: '@price_categories', collectionName: 'priceCategories' },
  { storageKey: '@saved_recipes', collectionName: 'savedRecipes' },
  { storageKey: '@saved_meal_plans', collectionName: 'savedMealPlans' },
];

export async function migrateGuestData(uid: string): Promise<void> {
  const flagKey = MIGRATED_FLAG_PREFIX + uid;
  if (await AsyncStorage.getItem(flagKey)) return;

  for (const { storageKey, collectionName } of COLLECTIONS) {
    try {
      const json = await AsyncStorage.getItem(storageKey);
      const items: { id: string }[] = json ? JSON.parse(json) : [];
      if (items.length === 0) continue;

      // If the account already has data (signing into an existing account),
      // leave both sides untouched rather than mixing guest data in.
      const col = collection(db, 'users', uid, collectionName);
      const existing = await getDocs(query(col, limit(1)));
      if (!existing.empty) continue;

      await Promise.all(items.map((item) => setDoc(doc(col, item.id), item)));
      await AsyncStorage.removeItem(storageKey);
    } catch (e) {
      console.warn(`Guest migration failed for ${collectionName}:`, e);
    }
  }

  try {
    const json = await AsyncStorage.getItem(SETTINGS_KEY);
    if (json) {
      const settingsDoc = doc(db, 'users', uid, 'settings', 'main');
      const snap = await getDoc(settingsDoc);
      if (!snap.exists()) {
        await setDoc(settingsDoc, JSON.parse(json));
        await AsyncStorage.removeItem(SETTINGS_KEY);
      }
    }
  } catch (e) {
    console.warn('Guest migration failed for settings:', e);
  }

  await AsyncStorage.setItem(flagKey, 'true');
}
