import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingOverlay from '../components/LoadingOverlay';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Simple route guard: while we determine auth state show a loading overlay.
// If unauthenticated, redirect to the login (root) page.
const RequireAuth = ({ children }) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!auth) {
      // If firebase isn't initialized, redirect to login as a safe default.
      navigate('/');
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/');
      } else {
        // authenticated
      }
      setChecking(false);
    });
    return () => unsub();
  }, [navigate]);

  if (checking) return <LoadingOverlay open={true} text="Checking authentication..." />;

  return <>{children}</>;
};

export default RequireAuth;
