"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/integrations/firebase/config';
import { UserProfile, UserRole } from '@/types';
import { StorageService } from '@/services/storageService';

const LOCAL_SESSION_KEY = 'pastelaria_local_session';

export interface AppUserSession {
  id: string;
  email?: string | null;
  user: {
    id: string;
    email?: string | null;
  };
}

interface AuthContextType {
  session: AppUserSession | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  loginAsLocalUser: (role?: UserRole, name?: string) => void;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  loginAsLocalUser: () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AppUserSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(StorageService.getUserProfile());
  const [loading, setLoading] = useState(true);

  const loginAsLocalUser = (role: UserRole = 'admin', name: string = 'Joel') => {
    const mockSession: AppUserSession = {
      id: `local-${role}`,
      email: `${role}@pastelariadojoel.local`,
      user: {
        id: `local-${role}`,
        email: `${role}@pastelariadojoel.local`
      }
    };
    const localProfile: UserProfile = {
      id: `local-${role}`,
      name: name,
      role: role,
    };
    setSession(mockSession);
    setProfile(localProfile);
    StorageService.setUserProfile(localProfile);
    StorageService.setSessionUnlocked(true);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ session: mockSession, profile: localProfile }));
  };

  const fetchProfile = async (userId: string, defaultEmail?: string | null) => {
    if (!db) {
      setLoading(false);
      return;
    }

    try {
      const docRef = doc(db, 'profiles', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userProfile = docSnap.data() as UserProfile;
        setProfile(userProfile);
        StorageService.setUserProfile(userProfile);
      } else {
        // Se ainda não existir perfil no Firestore, inicializa perfil padrão de Administrador para o primeiro usuário
        const fallbackProfile: UserProfile = {
          id: userId,
          name: defaultEmail?.split('@')[0] || 'Joel (Admin)',
          role: 'admin',
        };
        await setDoc(docRef, fallbackProfile, { merge: true });
        setProfile(fallbackProfile);
        StorageService.setUserProfile(fallbackProfile);
      }
    } catch (e) {
      console.warn("Aviso ao buscar perfil no Firestore:", e);
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase Auth não está inicializado.");
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const u = userCredential.user;
    const s: AppUserSession = {
      id: u.uid,
      email: u.email,
      user: { id: u.uid, email: u.email }
    };
    setSession(s);
    await fetchProfile(u.uid, u.email);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, role: UserRole) => {
    if (!auth) throw new Error("Firebase Auth não está inicializado.");
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const u = userCredential.user;
    const newProfile: UserProfile = {
      id: u.uid,
      name: name,
      role: role,
    };
    if (db) {
      await setDoc(doc(db, 'profiles', u.uid), newProfile);
    }
    const s: AppUserSession = {
      id: u.uid,
      email: u.email,
      user: { id: u.uid, email: u.email }
    };
    setSession(s);
    setProfile(newProfile);
    StorageService.setUserProfile(newProfile);
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.warn("SignOut Firebase error:", e);
      }
    }
    setSession(null);
    setProfile(null);
    StorageService.setUserProfile(null);
  };

  useEffect(() => {
    // 1. Check local session
    const savedLocal = localStorage.getItem(LOCAL_SESSION_KEY);
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (parsed?.session && parsed?.profile) {
          setSession(parsed.session);
          setProfile(parsed.profile);
          StorageService.setUserProfile(parsed.profile);
          setLoading(false);
          return;
        }
      } catch (e) {}
    }

    // 2. Firebase Auth Listener
    if (isFirebaseConfigured() && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
        if (user) {
          const appSession: AppUserSession = {
            id: user.uid,
            email: user.email,
            user: { id: user.uid, email: user.email }
          };
          setSession(appSession);
          await fetchProfile(user.uid, user.email);
          StorageService.syncGlobalSettings().catch(() => {});
        } else {
          const localSaved = localStorage.getItem(LOCAL_SESSION_KEY);
          if (!localSaved) {
            setSession(null);
            setProfile(null);
          }
          setLoading(false);
        }
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      session, 
      profile, 
      loading, 
      signOut, 
      loginAsLocalUser, 
      signInWithEmail, 
      signUpWithEmail 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
