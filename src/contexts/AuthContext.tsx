import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup } from 'firebase/auth';
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
            // Auto-create user profile as student by default, or admin if it's the specific email
            const isFirstAdmin = fUser.email === 'vitorperucci327@gmail.com';
            const newUser: AppUser = {
              uid: fUser.uid,
              email: fUser.email || '',
              name: fUser.displayName || 'New User',
              role: isFirstAdmin ? 'admin' : 'student',
              status: 'active',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userRef, newUser);
            setUser(newUser);
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
