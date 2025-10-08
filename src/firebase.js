// Firebase stub for builds — reads config from Vite env vars (VITE_*).
// This file contains no hardcoded secrets. Set real values in Netlify
// environment variables (VITE_FIREBASE_API_KEY, etc.).
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const hasConfig = Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);

let app = null;
let auth = null;
let db = null;

if (hasConfig) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    // Initialization failed; leave exports null so build doesn't fail.
    app = null;
    auth = null;
    db = null;
  }
}

export { auth, db };
export default app;