import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

let _db: Firestore | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
};

export function initFirebase(): void {
  console.log('[firebase] initFirebase() called');
  console.log('[firebase] config check — projectId:', firebaseConfig.projectId || '(MISSING)', '| apiKey:', firebaseConfig.apiKey ? '(present)' : '(MISSING)');
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    console.log('[firebase] app initialized, name:', app.name);
    _db = getFirestore(app, 'app-db');
    console.log('[firebase] getFirestore() success, _db set:', !!_db);
  } catch (err) {
    console.error('[firebase] initFirebase() THREW:', err);
  }
}

export function getDb(): Firestore {
  console.log('[firebase] getDb() called, _db is:', !!_db);
  if (!_db) throw new Error('Firebase not initialized — call initFirebase() first.');
  return _db;
}
