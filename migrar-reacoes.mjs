import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyADT9WkCY6E-G2pUpV5ueb3RS_Cs8G3Ob4",
  authDomain: "mcdb.musicalcast.com.br",
  projectId: "musicais-br-database",
  storageBucket: "musicais-br-database.firebasestorage.app",
  messagingSenderId: "956563854948",
  appId: "1:956563854948:web:b85bf4258e83ff6e32f171"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const musicaisSnap = await getDocs(collection(db, "musicais"))

for (const musicalDoc of musicaisSnap.docs) {
  const reacoesSnap = await getDocs(collection(db, "musicais", musicalDoc.id, "reacoes"))
  let likes = 0, dislikes = 0
  reacoesSnap.docs.forEach(d => {
    if (d.data().reacao === "gostei") likes++
    else if (d.data().reacao === "nao_gostei") dislikes++
  })
  if (likes > 0 || dislikes > 0) {
    await updateDoc(doc(db, "musicais", musicalDoc.id), { totalLikes: likes, totalDislikes: dislikes })
    console.log(`${musicalDoc.data().titulo}: 👍 ${likes} 👎 ${dislikes}`)
  }
}

console.log("Migração concluída.")
process.exit(0)