// src/pages/Produtor.jsx
// Cartaz do jogo "Eu Quero Ser Produtor": semana atual, contagem regressiva,
// os musicais com preço e variação, manchetes e desafio da semana.
// Só leitura. Compra e venda entram na etapa 4.

import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import {
  carregarTemporada, momentoDoMercado, contagem, dataHora,
  variacaoDaSemana, bravos, pct, corVariacao, TAMANHO,
  textoMeta, nomeDaFonte, cartao, tituloCartao, cinza, miniatura, estiloPoster,
} from "../jogo/publico"

const ORDEM_DIA = { segunda: 0, quinta: 1 }

export default function Produtor() {
  const [params] = useSearchParams()
  const idPedido = params.get("temporada")
  const [t, setT] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")
  const [agora, setAgora] = useState(new Date())

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    carregarTemporada(idPedido)
      .then((dados) => { if (ativo) setT(dados) })
      .catch((e) => { console.error("Erro ao carregar o jogo:", e); if (ativo) setErro("Não foi possível carregar o jogo agora.") })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [idPedido])

  // Atualiza a contagem regressiva a cada 30 segundos
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  if (carregando) return <main><p style={cinza}>Carregando…</p></main>
  if (erro) return <main><p style={cinza}>{erro}</p></main>
  if (!t) {
    return (
      <main>
        <h1 className="page-title">Eu Quero Ser Produtor</h1>
        <p style={{ ...cinza, marginTop: "12px" }}>Nenhuma temporada no ar no momento. Volte em breve.</p>
      </main>
    )
  }

  const momento = momentoDoMercado(t, agora)
  const sufixo = idPedido ? `?temporada=${encodeURIComponent(idPedido)}` : ""
  const manchetes = [...(t.manchetes || [])].sort(
    (a, b) => b.semana - a.semana || (ORDEM_DIA[b.dia] ?? 0) - (ORDEM_DIA[a.dia] ?? 0)
  )
  const semana = t.estado?.semanaAtual || 0
  const desafio = t.desafioAtual
  const bonus = t.regras?.bonusDesafio || {}

  return (
    <main>
      <p style={{ fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", color: "#888", margin: "0 0 6px" }}>
        {t.nome}{t.modoTeste ? " · teste" : ""}
      </p>
      <h1 className="page-title">Eu Quero Ser Produtor</h1>
      <p style={{ ...cinza, marginTop: "10px", marginBottom: "24px" }}>
        Invista Bravos nos musicais da temporada. Os resultados saem toda segunda.
      </p>

      {/* Situação do mercado */}
      <div style={{ ...cartao, background: "#0a2c59", border: "none", color: "#fff" }}>
        <p style={{ margin: 0, fontSize: "13px", opacity: 0.8 }}>
          {semana === 0 ? "Antes da estreia" : `Semana ${semana} de ${t.semanas}`}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 600 }}>
          {momento.texto}
          {momento.alvo && <span style={{ color: "#F5C518" }}> {contagem(momento.alvo, agora)}</span>}
        </p>
        {momento.fase === "aberto" && (
          <p style={{ margin: "6px 0 0", fontSize: "13px", opacity: 0.8 }}>
            Últimas operações até {dataHora(momento.fechaVisivel)}.
          </p>
        )}
        {momento.fase === "antes" && (
          <p style={{ margin: "6px 0 0", fontSize: "13px", opacity: 0.8 }}>{dataHora(momento.alvo)}</p>
        )}
      </div>

      {/* Musicais */}
      <h2 style={{ ...tituloCartao, marginTop: "8px" }}>Em cartaz</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        {(t.musicais || []).map((m) => {
          const v = variacaoDaSemana(m)
          return (
            <Link key={m.id} to={`/produtor/musical/${m.id}${sufixo}`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ ...cartao, padding: "12px", marginBottom: 0, height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", opacity: m.fechado ? 0.6 : 1 }}>
                <div style={estiloPoster({ marginBottom: "12px", filter: m.fechado ? "grayscale(1)" : "none" })}>
                  {m.poster ? (
                    <img src={miniatura(m.poster)} alt={m.titulo} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "12px", color: "#F5C518", opacity: 0.8 }}>pôster em breve</span>
                  )}
                </div>
                <p style={{ fontFamily: "var(--fonte-titulo)", fontSize: "18px", margin: "0 0 4px", lineHeight: 1.2 }}>{m.titulo}</p>
                <p style={{ ...cinza, fontSize: "13px" }}>{m.teatro?.nome} · {TAMANHO[m.teatro?.tamanho] || ""}</p>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "auto", paddingTop: "12px" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700 }}>{bravos(m.precoAtual)}</span>
                  {m.fechado ? (
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#cc0000" }}>Fechou</span>
                  ) : v != null ? (
                    <span style={{ fontSize: "14px", fontWeight: 600, color: corVariacao(v) }}>{pct(v)}</span>
                  ) : (
                    <span style={{ fontSize: "13px", color: "#888" }}>estreia</span>
                  )}
                </div>
                <p style={{ ...cinza, fontSize: "12px", marginTop: "2px" }}>Bravos por ação</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Desafio da semana */}
      {desafio && (
        <div style={{ ...cartao, borderColor: "#F5C518" }}>
          <p style={{ fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase", color: "#888", margin: "0 0 4px" }}>
            Desafio da semana {desafio.semana}
          </p>
          <h2 style={tituloCartao}>{desafio.titulo}</h2>
          <p style={{ fontSize: "15px", margin: "0 0 12px", lineHeight: 1.5 }}>{desafio.descricao}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "14px" }}>
            {["ouro", "prata", "bronze"].map((nivel) =>
              desafio.metas?.[nivel] != null ? (
                <span key={nivel}>
                  <strong style={{ textTransform: "capitalize" }}>{nivel}</strong>
                  {": "}{textoMeta(desafio.tipo, desafio.metas[nivel], nivel)}
                  {bonus[nivel] ? <span style={{ color: "#888" }}> (+{bonus[nivel]} Bravos)</span> : null}
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
              <div key={i} style={{ padding: "12px 0", borderBottom: i < manchetes.length - 1 ? "1px solid #eee" : "none" }}>
                <p style={{ fontSize: "12px", color: "#888", margin: "0 0 4px" }}>
                  {n.dia === "quinta" && <strong style={{ color: "#cc0000" }}>PLANTÃO · </strong>}
                  {nomeDaFonte(t, n.fonte)} · {n.semana === 0 ? "antes da estreia" : `semana ${n.semana}, ${n.dia}`}
                </p>
                <p style={{ fontSize: "15px", margin: 0, lineHeight: 1.4 }}>{n.texto}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ ...cartao, background: "transparent", borderStyle: "dashed" }}>
        <p style={cinza}>Compra e venda chegam em breve. Por enquanto, conheça os musicais e acompanhe as manchetes.</p>
      </div>
    </main>
  )
}
