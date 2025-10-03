import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration (hardcoded)
const firebaseConfig = {
  apiKey: "AIzaSyBkgP19hsgeLqXUQOA0-iMZnLNfG5Ay6M0",
  authDomain: "inventory-fab7a.firebaseapp.com",
  projectId: "inventory-fab7a",
  storageBucket: "inventory-fab7a.firebasestorage.app",
  messagingSenderId: "154313508995",
  appId: "1:154313508995:web:3b91e7b216832a952b73b6",
  measurementId: "G-W5E0FQ5PCL"
};

// Initialize Firebase
console.log("Firebase config loaded:", firebaseConfig);

const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;