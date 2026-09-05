import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  projectId: "pasteldojoel-e3992",
  appId: "1:248948484008:web:02f243042df4017dc0df9d",
  apiKey: "AIzaSyC4QkKz-EJnTSVSSYSHE5hz54zBcMMPxPw",
  authDomain: "pasteldojoel-e3992.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "pasteldojoel-e3992.firebasestorage.app",
  messagingSenderId: "248948484008",
  measurementId: "G-C3Z5LYXQ5T",
};

const LOCAL_STORAGE_KEY = 'pastelaria_firebase_config';

export const getStoredFirebaseConfig = (): FirebaseConfig => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure that if localStorage has an old, incorrect, or mismatched projectId,
      // it is purged so all devices and browsers use the official database!
      if (
        parsed?.projectId && 
        parsed?.apiKey && 
        parsed.projectId === DEFAULT_FIREBASE_CONFIG.projectId
      ) {
        return {
          ...DEFAULT_FIREBASE_CONFIG,
          ...parsed,
          projectId: DEFAULT_FIREBASE_CONFIG.projectId
        };
      } else {
        console.warn(`[Firebase] Configuração desatualizada ou divergente removida (${parsed?.projectId}). Conectando ao projeto oficial ${DEFAULT_FIREBASE_CONFIG.projectId}.`);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
    }
  } catch (e) {
    console.error('Erro ao ler configuração local do Firebase:', e);
  }

  // Use configured applet project config or env variables, fallback to official DEFAULT_FIREBASE_CONFIG
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || (firebaseAppletConfig as any)?.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || (firebaseAppletConfig as any)?.projectId || DEFAULT_FIREBASE_CONFIG.projectId;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (firebaseAppletConfig as any)?.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (firebaseAppletConfig as any)?.storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (firebaseAppletConfig as any)?.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID || (firebaseAppletConfig as any)?.appId || DEFAULT_FIREBASE_CONFIG.appId;
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || (firebaseAppletConfig as any)?.measurementId || DEFAULT_FIREBASE_CONFIG.measurementId;
  const firestoreDatabaseId = (firebaseAppletConfig as any)?.firestoreDatabaseId || DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId;

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
};

export const saveFirebaseConfig = (config: FirebaseConfig) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
};

export const clearFirebaseConfig = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  window.location.reload();
};

export const resetToOfficialFirebaseConfig = () => {
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

    // Try multi-tab persistent cache to sync between multiple browser tabs/windows seamlessly
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (cacheErr) {
      if (activeConfig.firestoreDatabaseId && activeConfig.firestoreDatabaseId !== '(default)') {
        db = getFirestore(app, activeConfig.firestoreDatabaseId);
      } else {
        db = getFirestore(app);
      }
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
      const { doc, getDoc } = await import('firebase/firestore');
      const pingDoc = doc(db, '_connection_test', 'ping');
      const fetchPing = getDoc(pingDoc);
      const timeoutPing = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout_connection')), 4000)
      );
      await Promise.race([fetchPing, timeoutPing]);
      
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
      } else if (msg === 'timeout_connection') {
        if (currentHealth.status === 'connecting') {
          // If listeners already connected or pending, set to connected so UI is not locked
          setFirebaseHealth({
            status: 'connected',
            projectId: activeConfig?.projectId
          });
        }
      } else {
        setFirebaseHealth({
          status: 'connected',
          projectId: activeConfig?.projectId
        });
      }
    }
  }, 300);
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
        } else {
          setFirebaseHealth({
            status: 'error',
            message: `Falha na sincronização: ${error?.code || error?.message || 'Erro de conexão'}`,
            projectId: activeConfig?.projectId
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
