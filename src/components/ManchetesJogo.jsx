// src/components/ManchetesJogo.jsx
// Manchetes do jogo "Eu Quero Ser Produtor", como uma banca de jornal:
// cada tipo de fonte tem um visual bem diferente (jornal, coluna de fofoca,
// influencer), o plantão aparece como notícia urgente, e só a
// semana mais recente fica aberta. As anteriores ficam recolhidas.

import { useEffect, useState } from "react"
import { cartao, tituloCartao, cinza, TEMA } from "../jogo/publico"

const SERIFA = "'Playfair Display', Georgia, 'Times New Roman', serif"

function useFonteJornal() {
  useEffect(() => {
    if (document.getElementById("fonte-jogo-playfair")) return
    const link = document.createElement("link")
    link.id = "fonte-jogo-playfair"
    link.rel = "stylesheet"
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap"
    document.head.appendChild(link)
  }, [])
}

function estiloDaFonte(fonte) {
  const tipo = `${fonte?.tipo || ""} ${fonte?.nome || ""}`
  if (/jornal|folha|revista/i.test(tipo)) return "jornal"
  if (/fofoca|coluna/i.test(tipo)) return "fofoca"
  if (/influ|rede|perfil|blog|spoiler/i.test(tipo)) return "influencer"
  return "geral"
}

// No roteiro, "segunda" = manchete que sai com o resultado; "quinta" = manchete do plantão
const quando = (n) => (n.semana === 0 ? "antes da estreia" : `semana ${n.semana} · ${n.dia === "quinta" ? "plantão" : "resultado"}`)

const arroba = (nome) =>
  "@" + (nome || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "")

function Jornal({ n, fonte }) {
  return (
    <div style={{ background: "#efe9da", color: "#141414", borderRadius: "6px", padding: "12px 14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ flex: 1, borderTop: "1px solid #141414" }} />
        <span style={{ fontFamily: SERIFA, fontWeight: 900, fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase" }}>{fonte?.nome}</span>
        <span style={{ flex: 1, borderTop: "1px solid #141414" }} />
      </div>
      <div style={{ borderTop: "3px double #141414", margin: "6px 0 10px" }} />
      <p style={{ fontFamily: SERIFA, fontWeight: 900, fontSize: "21px", lineHeight: 1.2, margin: 0 }}>{n.texto}</p>
      <p style={{ fontFamily: SERIFA, fontStyle: "italic", fontSize: "12px", color: "#5a5446", margin: "8px 0 0" }}>{quando(n)}</p>
    </div>
  )
}

function Fofoca({ n, fonte }) {
  return (
    <div style={{ background: "#2b0b1f", border: "1px solid #ff4fa3", borderRadius: "14px", padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ background: "#ff4fa3", color: "#2b0b1f", fontSize: "11px", fontWeight: 800, letterSpacing: "1.5px", padding: "3px 9px", borderRadius: "999px" }}>
          FOFOCA
        </span>
        <span style={{ color: "#ff8cc6", fontStyle: "italic", fontWeight: 700, fontSize: "14px" }}>{fonte?.nome}</span>
      </div>
      <p style={{ color: "#ffe1f0", fontWeight: 800, fontStyle: "italic", fontSize: "18px", lineHeight: 1.3, margin: "10px 0 0" }}>
        <span style={{ color: "#ff4fa3", fontSize: "26px", lineHeight: 0, verticalAlign: "-6px", marginRight: "2px" }}>“</span>
        {n.texto}
        <span style={{ color: "#ff4fa3", fontSize: "26px", lineHeight: 0, verticalAlign: "-6px", marginLeft: "2px" }}>”</span>
      </p>
      <p style={{ color: "#c98aab", fontSize: "12px", margin: "8px 0 0" }}>{quando(n)}</p>
    </div>
  )
}

function Influencer({ n, fonte }) {
  const inicial = (fonte?.nome || "?").charAt(0).toUpperCase()
  return (
    <div style={{ background: "#17122a", border: "1px solid #6e4bd8", borderRadius: "16px", padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#8a63ff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "16px", flexShrink: 0 }}>
          {inicial}
        </span>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>{fonte?.nome}</div>
          <div style={{ color: "#a99bd6", fontSize: "12px" }}>{arroba(fonte?.nome)}</div>
        </div>
      </div>
      <p style={{ color: "#f1ecff", fontSize: "16px", lineHeight: 1.45, margin: "10px 0 0", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>{n.texto}</p>
      <p style={{ color: "#8f84b5", fontSize: "12px", margin: "8px 0 0" }}>{quando(n)}</p>
    </div>
  )
}

function Geral({ n, fonte }) {
  return (
    <div style={{ background: TEMA.cartao, border: `1px solid ${TEMA.bordaForte}`, borderRadius: "10px", padding: "12px 14px" }}>
      <p style={{ fontSize: "12px", color: TEMA.textoFraco, margin: "0 0 4px" }}>{fonte?.nome}</p>
      <p style={{ fontSize: "16px", lineHeight: 1.4, margin: 0, color: TEMA.texto }}>{n.texto}</p>
      <p style={{ fontSize: "12px", color: TEMA.textoFraco, margin: "6px 0 0" }}>{quando(n)}</p>
    </div>
  )
}

const VISUAL = { jornal: Jornal, fofoca: Fofoca, influencer: Influencer, geral: Geral }

function Manchete({ n, t }) {
  const fonte = (t.fontes || []).find((f) => f.id === n.fonte) || { nome: n.fonte }
  const Visual = VISUAL[estiloDaFonte(fonte)]
  if (n.dia !== "quinta") return <Visual n={n} fonte={fonte} />
  return (
    <div style={{ border: "2px solid #ff4d4d", borderRadius: "16px", padding: "8px", background: "#2a0f12" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "2px 4px 8px" }}>
        <span style={{ background: "#ff4d4d", color: "#fff", fontSize: "12px", fontWeight: 800, letterSpacing: "2px", padding: "3px 10px", borderRadius: "4px" }}>PLANTÃO</span>
        <span style={{ color: "#ff9b9b", fontSize: "12px" }}>notícia urgente</span>
      </div>
      <Visual n={n} fonte={fonte} />
    </div>
  )
}

export default function ManchetesJogo({ t }) {
  useFonteJornal()
  const [abertas, setAbertas] = useState(false)
  const todas = t.manchetes || []

  if (todas.length === 0) {
    return (
      <div style={cartao}>
        <h2 style={tituloCartao}>Manchetes</h2>
        <p style={cinza}>As primeiras manchetes saem no plantão antes da estreia. Fique de olho: nem toda fonte fala a verdade.</p>
      </div>
    )
  }

  // Plantão (quinta) antes das de segunda, dentro de cada semana
  const ordenar = (lista) => [...lista].sort((a, b) => (a.dia === "quinta" ? -1 : 0) - (b.dia === "quinta" ? -1 : 0))
  const semanas = [...new Set(todas.map((n) => n.semana))].sort((a, b) => b - a)
  const atual = semanas[0]
  const anteriores = semanas.slice(1)
  const totalAnteriores = todas.filter((n) => n.semana !== atual).length
  const titulo = (s) => (s === 0 ? "Antes da estreia" : `Semana ${s}`)

  const bloco = (s) => (
    <div key={s} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {ordenar(todas.filter((n) => n.semana === s)).map((n, i) => <Manchete key={`${s}-${i}`} n={n} t={t} />)}
    </div>
  )

  return (
    <div style={cartao}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "12px" }}>
        <h2 style={{ ...tituloCartao, margin: 0 }}>Manchetes</h2>
        <span style={{ ...cinza, fontSize: "13px" }}>{titulo(atual)}</span>
      </div>

      {bloco(atual)}

      {anteriores.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setAbertas((v) => !v)}
            style={{ width: "100%", marginTop: "14px", background: "transparent", border: "none", borderTop: `1px dashed ${TEMA.bordaForte}`, color: TEMA.textoMedio, padding: "12px 0 2px", fontSize: "14px", cursor: "pointer", fontFamily: "inherit" }}
          >
            {abertas ? "Esconder semanas anteriores" : `Ver semanas anteriores (${totalAnteriores} ${totalAnteriores === 1 ? "manchete" : "manchetes"})`}
          </button>
          {abertas && anteriores.map((s) => (
            <div key={s} style={{ marginTop: "16px" }}>
              <p style={{ fontSize: "12px", letterSpacing: "1.5px", textTransform: "uppercase", color: TEMA.textoFraco, margin: "0 0 8px" }}>{titulo(s)}</p>
              {bloco(s)}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
