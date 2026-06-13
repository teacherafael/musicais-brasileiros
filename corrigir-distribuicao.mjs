import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyADT9WkCY6E-G2pUpV5ueb3RS_Cs8G3Ob4",
  authDomain: "musicais-br-database.firebaseapp.com",
  projectId: "musicais-br-database",
  storageBucket: "musicais-br-database.firebasestorage.app",
  messagingSenderId: "956563854948",
  appId: "1:956563854948:web:b85bf4258e83ff6e32f171"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function corrigir() {
  const musicaisSnap = await getDocs(collection(db, "musicais"))
  let corrigidos = 0

  for (const musicalDoc of musicaisSnap.docs) {
    const dados = musicalDoc.data()
    if (!dados.distribuicao) continue

    let precisaCorrigir = false
    const novaDistribuicao = {}

    for (const [chave, valor] of Object.entries(dados.distribuicao)) {
      if (typeof valor === "object" && valor !== null) {
        precisaCorrigir = true
        const soma = Object.values(valor).reduce((a, b) => a + b, 0)
        novaDistribuicao[chave] = soma
        console.log(`⚠️  ${dados.titulo} — chave "${chave}" era objeto, corrigido para ${soma}`)
      } else {
        novaDistribuicao[chave] = valor
      }
    }

    if (precisaCorrigir) {
      await updateDoc(doc(db, "musicais", musicalDoc.id), { distribuicao: novaDistribuicao })
      corrigidos++
    }
  }

  if (corrigidos === 0) {
    console.log("✓ Nenhum problema encontrado!")
  } else {
    console.log(`✓ ${corrigidos} musical(is) corrigido(s)!`)
  }
}

corrigir()