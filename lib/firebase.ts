import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDszF8NIdDUL3uUF4Q-VxejvrsNsqTfMAM',
  authDomain: 'well-fed-66136.firebaseapp.com',
  projectId: 'well-fed-66136',
  storageBucket: 'well-fed-66136.firebasestorage.app',
  messagingSenderId: '579457800510',
  appId: '1:579457800510:web:6eb46b1a20df33704c346f',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Bearer token for the Cloud Functions, which verify it server-side.
// Every user has one — guests are anonymous Firebase users.
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
