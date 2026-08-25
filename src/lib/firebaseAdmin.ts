import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getEncryptedEnv } from './secretsEncryption';

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const rawPrivateKey = getEncryptedEnv('FIREBASE_ADMIN_PRIVATE_KEY_ENC', 'FIREBASE_ADMIN_PRIVATE_KEY');
  const privateKey = rawPrivateKey?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error('[firebaseAdmin] Missing env vars. projectId:', !!projectId, 'clientEmail:', !!clientEmail, 'privateKey:', !!privateKey);
    throw new Error(
      'Firebase Admin env vars belum diset: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY'
    );
  }

  try {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return adminApp;
  } catch (error) {
    console.error('[firebaseAdmin] Failed to initializeApp:', error);
    throw error;
  }
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
