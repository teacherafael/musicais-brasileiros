// src/pages/Produtor.jsx
// Cartaz do jogo "Eu Quero Ser Produtor": os musicais com preço e variação,
// o desafio da semana e as manchetes. A moldura escura (marquise, status,
// menu e patrimônio) vem do LayoutJogo. Compra e venda ficam na ficha.

import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import LayoutJogo from "../components/LayoutJogo"
import {
  carregarTemporada, variacaoDaSemana, bravos, pct, corVariacao,
  textoMeta, nomeDaFonte, cartao, tituloCartao, cinza, miniatura, estiloPoster, TEMA,
} from "../jogo/publico"

const ORDEM_DIA = { segunda: 0, quinta: 1 }

export default function Produtor() {
  const [params] = useSearchParams()
  const idPedido = params.get("temporada")
  const sufixo = idPedido ? `?temporada=${encodeURIComponent(idPedido)}` : ""
  const [t, setT] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    carregarTemporada(idPedido)
      .then((dados) => { if (ativo) setT(dados) })
      .catch((e) => { console.error("Erro ao carregar o jogo:", e); if (ativo) setErro("Não foi possível carregar o jogo agora.") })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [idPedido])

  if (carregando || erro || !t) {
    return (
      <LayoutJogo t={null} aba="cartaz" sufixo={sufixo}>
        <p style={{ ...cinza, textAlign: "center", padding: "24px 0" }}>
          {carregando ? "Carregando…" : erro || "Nenhuma temporada no ar no momento. Volte em breve."}
        </p>
      </LayoutJogo>
    )
  }

  const manchetes = [...(t.manchetes || [])].sort(
    (a, b) => b.semana - a.semana || (ORDEM_DIA[b.dia] ?? 0) - (ORDEM_DIA[a.dia] ?? 0)
  )
  const desafio = t.desafioAtual
  const bonus = t.regras?.bonusDesafio || {}

  return (
    <LayoutJogo t={t} aba="cartaz" sufixo={sufixo}>
      {/* Musicais */}
      <h2 style={{ ...tituloCartao, margin: "4px 0 12px" }}>Em cartaz</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {(t.musicais || []).map((m) => {
          const v = variacaoDaSemana(m)
          return (
            <Link key={m.id} to={`/produtor/musical/${m.id}${sufixo}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ ...cartao, padding: "8px", marginBottom: 0, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", opacity: m.fechado ? 0.55 : 1 }}>
                <div style={estiloPoster({ marginBottom: "8px", filter: m.fechado ? "grayscale(1)" : "none" })}>
                  {m.poster ? (
                    <img src={miniatura(m.poster)} alt={m.titulo} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "12px", color: TEMA.ouro, opacity: 0.8 }}>pôster em breve</span>
                  )}
                </div>
                <p style={{ fontFamily: "var(--fonte-titulo)", fontSize: "16px", margin: "0 0 2px", lineHeight: 1.15, color: TEMA.texto }}>{m.titulo}</p>
                <p style={{ ...cinza, fontSize: "12px", lineHeight: 1.3 }}>{m.teatro?.nome}</p>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "auto", paddingTop: "8px" }}>
                  <span style={{ fontSize: "17px", fontWeight: 700, color: TEMA.texto }}>{bravos(m.precoAtual)}</span>
                  {m.fechado ? (
                    <span style={{ fontSize: "12px", fontWeight: 700, color: TEMA.queda }}>Fechou</span>
                  ) : v != null ? (
                    <span style={{ fontSize: "13px", fontWeight: 700, color: corVariacao(v) }}>{pct(v)}</span>
                  ) : (
                    <span style={{ fontSize: "12px", color: TEMA.textoFraco }}>estreia</span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Desafio da semana */}
      {desafio && (
        <div style={{ ...cartao, borderColor: TEMA.ouro }}>
          <p style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: TEMA.ouro, margin: "0 0 4px" }}>
            Desafio da semana {desafio.semana}
          </p>
          <h2 style={tituloCartao}>{desafio.titulo}</h2>
          <p style={{ fontSize: "15px", margin: "0 0 12px", lineHeight: 1.5, color: TEMA.textoMedio }}>{desafio.descricao}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "14px", color: TEMA.textoMedio }}>
            {["ouro", "prata", "bronze"].map((nivel) =>
              desafio.metas?.[nivel] != null ? (
                <span key={nivel}>
                  <strong style={{ textTransform: "capitalize", color: TEMA.texto }}>{nivel}</strong>
                  {": "}{textoMeta(desafio.tipo, desafio.metas[nivel], nivel)}
                  {bonus[nivel] ? <span style={{ color: TEMA.textoFraco }}> (+{bonus[nivel]} Bravos)</span> : null}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Manchetes */}
      <div style={cartao}>
        <h2 style={tituloCartao}>Manchetes</h2>
        {manchetes.length === 0 ? (
          <p style={cinza}>As primeiras manchetes saem na quinta antes da estreia. Fique de olho: nem toda fonte fala a verdade.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {manchetes.map((n, i) => (
              <div key={i} style={{ padding: "12px 0", borderBottom: i < manchetes.length - 1 ? `1px solid ${TEMA.borda}` : "none" }}>
                <p style={{ fontSize: "12px", color: TEMA.textoFraco, margin: "0 0 4px" }}>
                  {n.dia === "quinta" && <strong style={{ color: TEMA.queda }}>PLANTÃO · </strong>}
                  {nomeDaFonte(t, n.fonte)} · {n.semana === 0 ? "antes da estreia" : `semana ${n.semana}, ${n.dia}`}
                </p>
                <p style={{ fontSize: "15px", margin: 0, lineHeight: 1.4, color: TEMA.texto }}>{n.texto}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </LayoutJogo>
  )
}
