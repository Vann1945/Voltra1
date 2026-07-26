import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface CachedUser {
  photoURL?: string | null;
  profileBorder?: string | null;
  [key: string]: any;
}

const userCache = new Map<string, Promise<CachedUser | null>>();

export const fetchUserCached = (userId: string): Promise<CachedUser | null> => {
  if (!userCache.has(userId)) {
    const promise = getDoc(doc(db, 'users', userId)).then(snap => {
      if (snap.exists()) {
        return snap.data() as CachedUser;
      }
      return null;
    }).catch(e => {
      console.error("Failed to fetch user", e);
      return null;
    });
    userCache.set(userId, promise);
  }
  return userCache.get(userId)!;
};
