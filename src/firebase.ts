import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

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

// Catatan: Firestore (firebase/firestore) sengaja TIDAK diimpor di sini.
// Aplikasi ini sudah migrasi data utama ke TiDB (lihat MySQL/schema.sql,
// api/*.ts) — Firebase sekarang HANYA dipakai untuk Auth (signInWithCustomToken
// di useAuth.ts, menjembatani sesi Auth.js ke Firebase Auth). Firestore SDK
// itu sendiri berkontribusi signifikan ke ukuran bundle client tanpa dipakai
// sama sekali — menghapusnya memangkas bundle tanpa kehilangan fungsi apa pun.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
