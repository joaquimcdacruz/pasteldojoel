import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  Unsubscribe, 
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import firebaseAppletConfig from '../../../firebase-applet-config.json';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

const LOCAL_STORAGE_KEY = 'pastelaria_firebase_config';

export const getStoredFirebaseConfig = (): FirebaseConfig | null => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.projectId && parsed?.apiKey && parsed.projectId !== 'gen-lang-client-0415141841') {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler configuração local do Firebase:', e);
  }

  // Use configured applet project config or env variables
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain || (projectId ? `${projectId}.firebaseapp.com` : '');
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket || (projectId ? `${projectId}.firebasestorage.app` : '');
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId || '';
  const appId = import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId || '';
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId || '';
  const firestoreDatabaseId = firebaseAppletConfig.firestoreDatabaseId || '(default)';

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId,
      firestoreDatabaseId,
    };
  }

  return null;
};

export const saveFirebaseConfig = (config: FirebaseConfig) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
};

export const clearFirebaseConfig = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  window.location.reload();
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let analytics: Analytics | null = null;

const activeConfig = getStoredFirebaseConfig();

if (activeConfig && activeConfig.apiKey && activeConfig.projectId) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(activeConfig);
    } else {
      app = getApp();
    }
    if (activeConfig.firestoreDatabaseId && activeConfig.firestoreDatabaseId !== '(default)') {
      db = getFirestore(app, activeConfig.firestoreDatabaseId);
    } else {
      db = getFirestore(app);
    }
    auth = getAuth(app);

    if (typeof window !== 'undefined' && activeConfig.measurementId) {
      isSupported().then((supported) => {
        if (supported && app) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {
        // Analytics not supported in this environment
      });
    }
  } catch (err) {
    console.error('Falha ao inicializar Firebase:', err);
  }
}

export const isFirebaseConfigured = (): boolean => {
  return !!db && !!auth && !!activeConfig?.projectId;
};

export { app, db, auth, analytics };

/**
 * Helper para escutar alterações em tempo real de uma coleção do Firestore
 */
export const subscribeToCollection = (
  collectionName: string,
  onUpdate: (data: DocumentData[]) => void,
  constraints: QueryConstraint[] = []
): Unsubscribe => {
  if (!db) {
    return () => {};
  }
  try {
    const colRef = collection(db, collectionName);
    const q = query(colRef, ...constraints);
    return onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
        onUpdate(docs);
      },
      (error) => {
        console.warn(`[Firebase Realtime] Aviso na coleção ${collectionName}:`, error);
      }
    );
  } catch (err) {
    console.warn(`[Firebase Realtime] Erro ao subscrever ${collectionName}:`, err);
    return () => {};
  }
};
