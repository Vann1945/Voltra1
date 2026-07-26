import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { User } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Check if user exists, if not create
        const userSnap = await getDoc(userRef);
        const isAdmin = firebaseUser.email === 'unknownfeed76@gmail.com';
        
        if (!userSnap.exists()) {
          const newUser: User = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Unknown User',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || undefined,
            role: isAdmin ? 'admin' : 'user',
            createdAt: new Date().toISOString(),
          };
          await setDoc(userRef, newUser);
        } else {
          const userData = userSnap.data() as User;
          if (isAdmin && userData.role !== 'admin') {
            await setDoc(userRef, { role: 'admin' }, { merge: true });
          }
        }

        // Listen to user document changes
        unsubscribeSnapshot = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser(docSnap.data() as User);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return { user, loading, login, logout };
}
