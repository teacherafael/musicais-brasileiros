import { initializeApp } from "firebase/app"
import { initializeFirestore } from "firebase/firestore"
import { getAuth, GoogleAuthProvider } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyADT9WkCY6E-G2pUpV5ueb3RS_Cs8G3Ob4",
  authDomain: "mcdb.musicalcast.com.br",
  projectId: "musicais-br-database",
  storageBucket: "musicais-br-database.firebasestorage.app",
  messagingSenderId: "956563854948",
  appId: "1:956563854948:web:b85bf4258e83ff6e32f171"
}

const app = initializeApp(firebaseConfig)

// Detecta automaticamente quando a rede do usuário precisa do modo de conexão
// alternativo (long-polling). Resolve o "Carregando..." infinito em redes/aparelhos
// onde a conexão padrão trava (Wi-Fi de empresa, VPN, alguns Safari/operadoras).
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
})

export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()