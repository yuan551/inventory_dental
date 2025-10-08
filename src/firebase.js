// Hardcoded Firebase config (restored per request).
// WARNING: This file contains real Firebase configuration. Exposing these
// values in a public repo is a security risk. Consider using env vars later.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBkgP19hsgeLqXUQOA0-iMZnLNfG5Ay6M0',
  authDomain: 'inventory-fab7a.firebaseapp.com',
  projectId: 'inventory-fab7a',
  storageBucket: 'inventory-fab7a.firebasestorage.app',
  messagingSenderId: '154313508995',
  appId: '1:154313508995:web:3b91e7b216832a952b73b6',
  measurementId: 'G-W5E0FQ5PCL',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

