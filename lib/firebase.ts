import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCM_SyOtzriuls1sHL7po7AfOpRuxvBdSo",
  authDomain: "almoco-betelitas.firebaseapp.com",
  projectId: "almoco-betelitas",
  storageBucket: "almoco-betelitas.firebasestorage.app",
  messagingSenderId: "22376028743",
  appId: "1:22376028743:web:6a1348569181d3921b6f62"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;