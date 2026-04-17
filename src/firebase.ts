import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfk-to1ftFpBWgThYxmYTMVd8O2Oto-Zk",
  authDomain: "academia-b58df.firebaseapp.com",
  projectId: "academia-b58df",
  storageBucket: "academia-b58df.firebasestorage.app",
  messagingSenderId: "193965613461",
  appId: "1:193965613461:web:6944233930376d4aa1d69c",
  measurementId: "G-0YN2XZFK2Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app); // removed databaseId override since using default standard database
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
