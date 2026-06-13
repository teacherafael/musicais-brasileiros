import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyADT9WkCY6E-G2pUpV5ueb3RS_Cs8G3Ob4",
  authDomain: "musicais-br-database.firebaseapp.com",
  projectId: "musicais-br-database",
  storageBucket: "musicais-br-database.firebasestorage.app",
  messagingSenderId: "956563854948",
  appId: "1:956563854948:web:b85bf4258e83ff6e32f171"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()