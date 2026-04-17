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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUser: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fUser) => {
      setFirebaseUser(fUser);
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
          });
        } catch (error) {
          console.error("Error fetching user data:", error);
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
    <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, signOut }}>
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
