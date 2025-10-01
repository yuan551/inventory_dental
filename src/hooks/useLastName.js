import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

// Fetches the user's last_name from accounts/{uid} and caches it in sessionStorage to minimize reads.
export function useLastName() {
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    let unsub = () => {};

    async function loadForUid(uid) {
      // Use per-uid key so different users don't collide
      const KEY = `last_name:${uid}`;
      try {
        const cached = sessionStorage.getItem(KEY);
        if (cached) {
          setLastName(cached);
          return;
        }
      } catch {}

      try {
        const snap = await getDoc(doc(db, "accounts", uid));
        const ln = (snap.exists() && (snap.data().last_name || "")) || "";
        setLastName(ln);
        try { sessionStorage.setItem(KEY, ln); } catch {}
      } catch (e) {
        console.warn("Failed to load last_name", e);
      }
    }

    // If auth is already ready, avoid setting a listener
    const u = auth.currentUser;
    if (u?.uid) {
      loadForUid(u.uid);
    } else {
      unsub = onAuthStateChanged(auth, (user) => {
        if (user?.uid) loadForUid(user.uid);
      });
    }

    return () => { try { unsub(); } catch {} };
  }, []);

  return lastName;
}
