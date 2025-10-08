import { initializeApp, getApps, getApp } from 'firebase/app';
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

// Initialize app defensively: if an app already exists use it.
let app;
try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} catch (e) {
  // Fallback: try initializeApp and if that fails, rethrow the error so we can
  // still see it during development. In production we avoid crashing by
  // letting auth/db be null-safe below.
  try {
    app = initializeApp(firebaseConfig);
  } catch (err) {
    console.error('Failed to initialize Firebase app:', err);
    app = null;
  }
}

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export default app;

