import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'inactive';
  createdAt: string;
  customMonthlyFee?: number;
  chatContacts?: string[];
  age?: number;
}

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeUser: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
      setAuthError(null);
      if (fUser) {
        try {
          const userRef = doc(db, 'users', fUser.uid);
          const userDoc = await getDoc(userRef);
          
          if (!userDoc.exists()) {
            const isFirstAdmin = fUser.email === 'vitorperucci327@gmail.com';
            
            // Check if there's a pre-registered invite for this email
            let role: UserRole = isFirstAdmin ? 'admin' : 'student';
            let age = 0;
            let name = fUser.displayName || 'Novo Usuário';

            if (fUser.email) {
               const preRegRef = doc(db, 'pre_registered_users', fUser.email.toLowerCase());
               const preRegDoc = await getDoc(preRegRef);
               if (preRegDoc.exists()) {
                  const data = preRegDoc.data();
                  role = data.role || 'student';
                  age = data.age || 0;
                  if (data.name) name = data.name;
               }
            }

            const newUser: AppUser = {
              uid: fUser.uid,
              email: fUser.email || '',
              name: name,
              role: role,
              status: 'active',
              createdAt: new Date().toISOString(),
              age: age
            };
            await setDoc(userRef, newUser);
            setUser(newUser);
          } else {
             // We fallback to setting it in snapshot but this avoids blinking
             setUser(userDoc.data() as AppUser);
          }

            // Listen for real-time updates to the user document
            unsubscribeUser = onSnapshot(userRef, (docSnap) => {
              if (docSnap.exists()) {
                setUser(docSnap.data() as AppUser);
              }
            }, (error) => {
               console.error("Firestore snapshot error:", error);
               setAuthError("Erro de permissão no Banco de Dados (Firestore Rules).");
            });
          } catch (error: any) {
            console.error("Error fetching user data:", error);
            if (error.code === 'permission-denied' || error.message.includes('permission')) {
               setAuthError("O Firebase bloqueou o acesso. Você precisa atualizar as 'Regras' do Firestore no Firebase Console para permitir leitura e escrita.");
            } else {
               setAuthError("Erro ao conectar ao banco de dados Firestore. Verifique se você ativou o Firestore Database no projeto.");
            }
            // Sign out the user because the app is unusable without DB profile
            await auth.signOut();
          }
        } else {
          setUser(null);
          if (unsubscribeUser) unsubscribeUser();
        }
        setLoading(false);
      });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, ignore silently
        return;
      }
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const signOut = async () => {
    await auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, authError, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
