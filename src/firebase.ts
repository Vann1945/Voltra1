import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
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
