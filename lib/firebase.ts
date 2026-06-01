import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Go to https://console.firebase.google.com → your project → Project Settings → Web app
// and paste your config values here.
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
export const db = getFirestore(app);
