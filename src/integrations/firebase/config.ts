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

export type FirebaseHealthStatus = 'unconfigured' | 'connecting' | 'connected' | 'api_disabled' | 'error';

export interface FirebaseHealthState {
  status: FirebaseHealthStatus;
  message?: string;
  projectId?: string;
  activationUrl?: string;
}

let currentHealth: FirebaseHealthState = !isFirebaseConfigured() 
  ? { status: 'unconfigured' }
  : { 
      status: 'connecting', 
      projectId: activeConfig?.projectId,
      activationUrl: `https://console.firebase.google.com/project/${activeConfig?.projectId || 'pasteldojoel-e3992'}/firestore`
    };

export const getFirebaseHealth = (): FirebaseHealthState => currentHealth;

export const setFirebaseHealth = (newHealth: FirebaseHealthState) => {
  currentHealth = newHealth;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firebase-health-changed', { detail: newHealth }));
  }
};

// Check connection on boot
if (typeof window !== 'undefined' && isFirebaseConfigured() && db) {
  setTimeout(async () => {
    try {
      const { doc, getDocFromServer } = await import('firebase/firestore');
      await getDocFromServer(doc(db, '_connection_test', 'ping'));
      setFirebaseHealth({
        status: 'connected',
        projectId: activeConfig?.projectId,
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (
        msg.includes('Cloud Firestore API has not been used') || 
        msg.includes('it is disabled') ||
        (err?.code === 'permission-denied' && msg.includes('overview?project='))
      ) {
        setFirebaseHealth({
          status: 'api_disabled',
          message: 'O Cloud Firestore não foi ativado no Firebase Console deste projeto.',
          projectId: activeConfig?.projectId,
          activationUrl: `https://console.firebase.google.com/project/${activeConfig?.projectId || 'pasteldojoel-e3992'}/firestore`
        });
      } else if (err?.code === 'permission-denied') {
        // Rules might require auth or are working, connection reached Firestore
        setFirebaseHealth({
          status: 'connected',
          projectId: activeConfig?.projectId
        });
      } else {
        setFirebaseHealth({
          status: 'error',
          message: msg,
          projectId: activeConfig?.projectId
        });
      }
    }
  }, 1000);
}

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
        setFirebaseHealth({
          status: 'connected',
          projectId: activeConfig?.projectId
        });
        const docs = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
        onUpdate(docs);
      },
      (error: any) => {
        const msg = error?.message || String(error);
        if (
          msg.includes('Cloud Firestore API has not been used') || 
          msg.includes('it is disabled') ||
          (error?.code === 'permission-denied' && msg.includes('overview?project='))
        ) {
          setFirebaseHealth({
            status: 'api_disabled',
            message: 'O Cloud Firestore não foi ativado no Firebase Console.',
            projectId: activeConfig?.projectId,
            activationUrl: `https://console.firebase.google.com/project/${activeConfig?.projectId || 'pasteldojoel-e3992'}/firestore`
          });
        }
        console.warn(`[Firebase Realtime] Aviso na coleção ${collectionName}:`, error);
      }
    );
  } catch (err) {
    console.warn(`[Firebase Realtime] Erro ao subscrever ${collectionName}:`, err);
    return () => {};
  }
};
