// src/indiceHome.js
// Leitura única do índice da Home (indices/home).
//
// O índice pode estar dividido em partes, para nunca bater no limite de 1 MiB
// por documento do Firestore:
//   indices/home    -> primeira parte, com o campo "partes" (quantas existem)
//   indices/home-2  -> segunda parte
//   indices/home-3  -> terceira parte, e assim por diante
//
// Enquanto houver uma parte só, custa 1 leitura, como sempre custou.
// Todas as páginas devem ler o índice por aqui, nunca direto pelo getDoc.

import { doc, getDoc } from "firebase/firestore"
import { db } from "./firebase"

// Devolve { itens, total, atualizadoEm, partes } com todos os itens juntos,
// ou null se o índice não existir.
export async function lerIndiceHome() {
  const snap = await getDoc(doc(db, "indices", "home"))
  if (!snap.exists()) return null

  const dados = snap.data()
  if (!Array.isArray(dados.itens)) return null

  const partes = Number(dados.partes) || 1
  let itens = dados.itens

  if (partes > 1) {
    const extras = await Promise.all(
      Array.from({ length: partes - 1 }, (_, i) =>
        getDoc(doc(db, "indices", `home-${i + 2}`))
      )
    )
    extras.forEach((s, i) => {
      if (s.exists() && Array.isArray(s.data().itens)) {
        itens = itens.concat(s.data().itens)
      } else {
        console.error(`indices/home-${i + 2} não encontrado: o índice está incompleto.`)
      }
    })
  }

  return { ...dados, itens }
}