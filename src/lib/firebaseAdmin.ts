import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getEncryptedEnv } from './secretsEncryption.js';

// HANYA dipakai di server (api/*.ts). Jangan pernah import file ini dari kode client,
// karena berisi kredensial service account.
let adminApp: App;

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // Private key ini adalah salah satu credential paling sensitif di seluruh
  // aplikasi (akses admin penuh ke project Firebase) — dibaca lewat lapisan
  // enkripsi kedua. Disimpan di env var dengan \n literal (baik versi
  // terenkripsi maupun plaintext lama), perlu di-decode setelah didapat.
  const rawPrivateKey = getEncryptedEnv('FIREBASE_ADMIN_PRIVATE_KEY_ENC', 'FIREBASE_ADMIN_PRIVATE_KEY');
  const privateKey = rawPrivateKey?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin env vars belum diset: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY'
    );
  }

  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return adminApp;
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
