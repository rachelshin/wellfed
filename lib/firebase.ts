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
