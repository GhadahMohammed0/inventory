import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCv8blqLv3NaB7BFaeNZgQrNpkSVgrOM1w",
  authDomain: "inventory-417bf.firebaseapp.com",
  projectId: "inventory-417bf",
  storageBucket: "inventory-417bf.firebasestorage.app",
  messagingSenderId: "560389172767",
  appId: "1:560389172767:web:3d09e8b9fd2fde54e66f2a",
  measurementId: "G-GBFXFNRTSK",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
