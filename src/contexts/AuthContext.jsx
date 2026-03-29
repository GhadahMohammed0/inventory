import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch user role from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          } else {
            setUserData({ role: 'engineer', name: firebaseUser.email });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData({ role: 'engineer', name: firebaseUser.email });
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result;
  };

  const register = async (email, password, name, phone) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Save user data to Firestore
    await setDoc(doc(db, 'users', result.user.uid), {
      name,
      email,
      phone,
      role: 'engineer',
      createdAt: new Date().toISOString(),
    });
    return result;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const isAdmin = userData?.role === 'admin';

  const value = {
    user,
    userData,
    loading,
    login,
    register,
    logout,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
