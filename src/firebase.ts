import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
);

export const firebaseConfigured = hasFirebaseConfig;

let app: FirebaseApp | null = null;
let authPromise: Promise<Auth | null> | null = null;

/**
 * Firebase is only a session bridge. Keep it out of the initial marketplace
 * payload and load it when an authenticated session actually contains a token.
 */
export function getFirebaseAuth(): Promise<Auth | null> {
  if (!hasFirebaseConfig) return Promise.resolve(null);
  if (authPromise) return authPromise;

  authPromise = Promise.all([import('firebase/app'), import('firebase/auth')])
    .then(([firebaseApp, firebaseAuth]) => {
      app = firebaseApp.getApps().length ? firebaseApp.getApp() : firebaseApp.initializeApp(firebaseConfig);
      return firebaseAuth.getAuth(app);
    })
    .catch((error) => {
      console.error('Failed to initialize Firebase Auth:', error);
      authPromise = null;
      return null;
    });

  return authPromise;
}

export default app;
