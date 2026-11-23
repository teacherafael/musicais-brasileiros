// src/jogo/publico.js
// Funções das páginas públicas do jogo "Eu Quero Ser Produtor".
// Só lê o jogoPublico (o cartaz). Nunca toca no jogoSecreto.

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import { db } from "../firebase"
import { FRACAO_FECHA_ANTES } from "./motor"

// ─────────────────────────────────────────────────────────────
// Carregar a temporada
// Sem parâmetro: a temporada real (modoTeste false) publicada mais recentemente.
// Com ?temporada=id na URL: aquela temporada (usado para testar).
// ─────────────────────────────────────────────────────────────
export async function carregarTemporada(idPedido) {
  if (idPedido) {
    const snap = await getDoc(doc(db, "jogoPublico", idPedido))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  }
  const q = query(collection(db, "jogoPublico"), where("modoTeste", "==", false))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  lista.sort((a, b) => paraData(b.publicadoEm) - paraData(a.publicadoEm))
  return lista[0]
}

// Timestamp do Firestore, Date ou texto -> Date
export function paraData(x) {
  if (!x) return new Date(0)
  if (typeof x.toDate === "function") return x.toDate()
  return new Date(x)
}

// ─────────────────────────────────────────────────────────────
// Momento do mercado
// estado.semanaAtual = quantas semanas já tiveram resultado liberado (0 antes da estreia).
// O relógio só serve para a contagem regressiva; quem libera resultado é o servidor.
// ─────────────────────────────────────────────────────────────
export function momentoDoMercado(t, agora = new Date()) {
  const t0 = paraData(t.aberturaMercado).getTime()
  const H = t.horasPorSemana * 3600 * 1000
  const w = t.estado?.semanaAtual || 0
  const fecha = t0 + (w + 1) * H - H * FRACAO_FECHA_ANTES
  const resultado = t0 + (w + 1) * H
  const ultimaSemana = w + 1 === t.semanas

  if (t.estado?.encerrada) {
    return { fase: "encerrada", texto: "Temporada encerrada", alvo: null }
  }
  if (agora.getTime() < t0) {
    return { fase: "antes", texto: "O mercado abre em", alvo: new Date(t0) }
  }
  if (agora.getTime() < fecha) {
    // Mostra 1 minuto antes do fechamento real (domingo 23:59 em vez de segunda 00:00)
    return { fase: "aberto", texto: "Mercado aberto. Fecha em", alvo: new Date(fecha), fechaVisivel: new Date(fecha - 60000) }
  }
  if (agora.getTime() < resultado) {
    return {
      fase: "fechado",
      texto: ultimaSemana ? "Mercado fechado. Resultado final em" : `Mercado fechado. Resultado da semana ${w + 1} em`,
      alvo: new Date(resultado),
    }
  }
  return { fase: "aguardando", texto: `Resultado da semana ${w + 1} saindo agora. Atualize a página em instantes.`, alvo: null }
}

export function contagem(alvo, agora = new Date()) {
  if (!alvo) return ""
  let s = Math.max(0, Math.floor((alvo.getTime() - agora.getTime()) / 1000))
  const d = Math.floor(s / 86400); s -= d * 86400
  const h = Math.floor(s / 3600); s -= h * 3600
  const m = Math.floor(s / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

// ─────────────────────────────────────────────────────────────
// Preços
// historico = [{ semana, ocupacao, preco }], um item por semana liberada.
// ─────────────────────────────────────────────────────────────
export function variacaoDaSemana(m) {
  const h = m.historico || []
  if (h.length === 0) return null
  const anterior = h.length > 1 ? h[h.length - 2].preco : m.precoInicial
  return anterior ? h[h.length - 1].preco / anterior - 1 : null
}

export function variacaoTotal(m) {
  return m.precoInicial ? m.precoAtual / m.precoInicial - 1 : null
}

// ─────────────────────────────────────────────────────────────
// Textos
// ─────────────────────────────────────────────────────────────
export const bravos = (n) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const pct = (x) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1).replace(".", ",")}%`
export const corVariacao = (x) => (x == null || x === 0 ? "#666" : x > 0 ? "#1a7f37" : "#cc0000")

export const dataHora = (d) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

export const TAMANHO = { grande: "Grande porte", medio: "Médio porte", pequeno: "Pequeno porte" }

export function estrelas(nota) {
  const cheias = Math.floor(nota)
  const meia = nota - cheias >= 0.5
  return "★".repeat(cheias) + (meia ? "½" : "") + "☆".repeat(5 - cheias - (meia ? 1 : 0))
}

// Metas do desafio em linguagem simples, conforme o tipo
export function textoMeta(tipo, valor, nivel) {
  switch (tipo) {
    case "grande-final":
      return `patrimônio de ${Number(valor).toLocaleString("pt-BR")} Bravos`
    case "bata-o-mercado":
      return valor > 0 ? `${valor} pontos acima da média` : "acima da média"
    case "sem-tombo":
    case "tudo-no-azul":
      if (nivel === "bronze") return "cumprir o desafio"
      return valor > 0 ? `cumprir com ${valor}% de lucro` : "cumprir com lucro"
    default:
      return valor > 0 ? `${valor}% de lucro` : "qualquer lucro"
  }
}

export function nomeDaFonte(t, id) {
  return (t.fontes || []).find((f) => f.id === id)?.nome || id
}

export function critico(t, id) {
  return (t.criticos || []).find((c) => c.id === id) || { nome: id, veiculo: "" }
}

// Miniatura -400 a partir da URL -800 do R2
export const miniatura = (url) => (url && url.includes("-800.webp") ? url.replace("-800.webp", "-400.webp") : url || "")

// Pôster 3:4; sem imagem, mostra o título em dourado sobre o azul do MCDb
export function estiloPoster(extra = {}) {
  return {
    aspectRatio: "3 / 4", borderRadius: "8px", overflow: "hidden", background: "#0a2c59",
    display: "flex", alignItems: "center", justifyContent: "center", ...extra,
  }
}

// Estilos comuns
export const cartao = { background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "20px" }
export const tituloCartao = { fontFamily: "var(--fonte-titulo)", fontSize: "20px", margin: "0 0 12px" }
export const cinza = { color: "#666", fontSize: "14px", margin: 0, lineHeight: 1.5 }
