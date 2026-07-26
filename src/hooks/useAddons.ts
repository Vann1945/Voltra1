import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query, doc, writeBatch, increment, where, or } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Addon, Like } from '../types';
import { useAuth } from './useAuth';

export function useAddons() {
  const { user } = useAuth();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q;
    
    if (user?.role === 'admin') {
      q = query(collection(db, 'addons'));
    } else {
      q = query(
        collection(db, 'addons'),
        where('status', '==', 'approved')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedAddons = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Addon[];
      
      fetchedAddons.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setAddons(fetchedAddons);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching addons:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(collection(db, 'likes'), where('userId', '==', user.uid));
        const unsubscribeLikes = onSnapshot(q, (snapshot) => {
          const likes = new Set<string>();
          snapshot.docs.forEach((doc) => {
            likes.add(doc.data().addonId);
          });
          setUserLikes(likes);
        });
        return () => unsubscribeLikes();
      } else {
        setUserLikes(new Set());
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const toggleLike = useCallback(async (addonId: string, isLiked: boolean) => {
    if (!auth.currentUser) return;
    
    const userId = auth.currentUser.uid;
    const likeId = `${userId}_${addonId}`;
    const likeRef = doc(db, 'likes', likeId);
    const addonRef = doc(db, 'addons', addonId);
    
    const batch = writeBatch(db);
    
    if (isLiked) {
      batch.delete(likeRef);
      batch.update(addonRef, { likesCount: increment(-1) });
    } else {
      batch.set(likeRef, {
        userId,
        addonId,
        createdAt: new Date().toISOString()
      });
      batch.update(addonRef, { likesCount: increment(1) });
    }
    
    try {
      await batch.commit();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }, []);

  return { addons, loading, userLikes, toggleLike };
}
