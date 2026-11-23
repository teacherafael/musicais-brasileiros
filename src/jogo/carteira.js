// src/jogo/carteira.js
// Carteira do jogador no jogo "Eu Quero Ser Produtor".
// O navegador só LÊ a carteira (as regras do Firestore bloqueiam gravação).
// Comprar e vender passa pela função do servidor /api/jogo-operar.

import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore"
import { auth, db } from "../firebase"

const r2 = (n) => Math.round(n * 100) / 100

// Usuário logado (undefined enquanto o Firebase ainda está conferindo)
export function useUsuario() {
  const [usuario, setUsuario] = useState(auth.currentUser || undefined)
  useEffect(() => onAuthStateChanged(auth, (u) => setUsuario(u || null)), [])
  return usuario
}

export async function carregarCarteira(temporadaId, uid) {
  const snap = await getDoc(doc(db, "jogoCarteiras", `${temporadaId}_${uid}`))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function carregarOperacoes(temporadaId, uid, maximo = 50) {
  const q = query(
    collection(db, "jogoCarteiras", `${temporadaId}_${uid}`, "operacoes"),
    orderBy("criadaEm", "desc"),
    limit(maximo)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function operar({ temporadaId, musicalId, tipo, quantidade }) {
  const u = auth.currentUser
  if (!u) throw new Error("Entre na sua conta para investir.")
  const token = await u.getIdToken()
  const resposta = await fetch("/api/jogo-operar", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ temporadaId, musicalId, tipo, quantidade }),
  })
  const dados = await resposta.json().catch(() => ({}))
  if (!resposta.ok || !dados.ok) {
    throw new Error(dados.erro || "Não foi possível concluir a operação. Tente de novo.")
  }
  return dados
}

// Carteira de quem ainda não operou: só o saldo inicial
export function carteiraVazia(t) {
  return { saldo: t.regras?.saldoInicial || 0, acoes: {}, custo: {} }
}

// Mesmas contas do servidor (api/_jogo.js)
export function patrimonio(carteira, musicais) {
  const preco = Object.fromEntries((musicais || []).map((m) => [m.id, m.fechado ? 0 : m.precoAtual]))
  const acoes = carteira?.acoes || {}
  return r2((carteira?.saldo || 0) + Object.keys(acoes).reduce((s, id) => s + (acoes[id] || 0) * (preco[id] || 0), 0))
}

export function custoDaCompra(quantidade, preco, taxa) {
  const valor = r2(quantidade * preco)
  const tx = r2(valor * taxa)
  return { valor, taxa: tx, total: r2(valor + tx) }
}

export function valorDaVenda(quantidade, preco, taxa) {
  const valor = r2(quantidade * preco)
  const tx = r2(valor * taxa)
  return { valor, taxa: tx, total: r2(valor - tx) }
}

// Quantas ações dá para comprar agora: o menor entre o que o saldo paga
// e o que o limite de 50% do patrimônio permite.
export function maximoCompra(carteira, m, t) {
  const regras = t.regras || {}
  const preco = m.precoAtual
  if (!preco || m.fechado) return 0
  let pelaGrana = Math.floor(carteira.saldo / (preco * (1 + regras.taxa)))
  while (pelaGrana > 0 && custoDaCompra(pelaGrana, preco, regras.taxa).total > carteira.saldo) pelaGrana--
  while (custoDaCompra(pelaGrana + 1, preco, regras.taxa).total <= carteira.saldo) pelaGrana++
  const tenho = carteira.acoes?.[m.id] || 0
  const limite = regras.limitePorMusical * patrimonio(carteira, t.musicais)
  const peloLimite = Math.max(0, Math.floor((limite + 1e-9) / preco) - tenho)
  return Math.max(0, Math.min(pelaGrana, peloLimite))
}
