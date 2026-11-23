// src/pages/ProdutorMusical.jsx
// Ficha de um musical do jogo "Eu Quero Ser Produtor".
// No celular: pôster pequeno ao lado do título e do preço, e o painel
// Investir logo em seguida. No computador: pôster grande com a ficha ao lado.
// A moldura escura vem do LayoutJogo.

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import LayoutJogo from "../components/LayoutJogo"
import PainelOperacao from "../components/PainelOperacao"
import {
  carregarTemporada, variacaoDaSemana, variacaoTotal, bravos, pct, corVariacao,
  TAMANHO, estrelas, critico, cartao, tituloCartao, cinza, rotulo, estiloPoster, TEMA,
} from "../jogo/publico"

function GraficoPreco({ m }) {
  const pontos = [{ semana: 0, preco: m.precoInicial }, ...(m.historico || [])]
  if (pontos.length < 2) return null
  const L = 600, A = 160, M = 24
  const precos = pontos.map((p) => p.preco)
  const min = Math.min(...precos), max = Math.max(...precos)
  const faixa = max - min || 1
  const x = (i) => M + (i * (L - 2 * M)) / (pontos.length - 1)
  const y = (p) => A - M - ((p - min) * (A - 2 * M)) / faixa
  const linha = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.preco).toFixed(1)}`).join(" ")
  const cor = pontos[pontos.length - 1].preco >= m.precoInicial ? TEMA.alta : TEMA.queda
  return (
    <svg viewBox={`0 0 ${L} ${A}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Gráfico do preço por semana">
      <line x1={M} x2={L - M} y1={y(m.precoInicial)} y2={y(m.precoInicial)} stroke={TEMA.bordaForte} strokeDasharray="4 4" />
      <path d={linha} fill="none" stroke={cor} strokeWidth="3" strokeLinejoin="round" />
      {pontos.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.preco)} r="4" fill={cor} />
          <text x={x(i)} y={A - 4} textAnchor="middle" fontSize="12" fill={TEMA.textoFraco}>{i === 0 ? "Início" : `S${p.semana}`}</text>
        </g>
      ))}
    </svg>
  )
}

function Pessoa({ titulo, nome, descricao }) {
  return (
    <div style={{ marginBottom: "12px" }}>
      {titulo && <p style={rotulo}>{titulo}</p>}
      <p style={{ fontSize: "15px", fontWeight: 700, margin: 0, lineHeight: 1.3, color: TEMA.texto }}>{nome}</p>
      {descricao && <p style={{ ...cinza, fontSize: "13px", marginTop: "1px" }}>{descricao}</p>}
    </div>
  )
}

function Ficha({ m }) {
  return (
    <>
      <p style={{ fontSize: "15px", lineHeight: 1.6, margin: 0, color: TEMA.textoMedio }}>{m.sinopse}</p>
      {m.destaques && <p style={{ fontSize: "14px", lineHeight: 1.5, margin: "8px 0 0", color: TEMA.textoMedio }}><strong style={{ color: TEMA.texto }}>Destaque:</strong> {m.destaques}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", columnGap: "24px", marginTop: "18px" }}>
        <Pessoa
          titulo="Teatro"
          nome={m.teatro?.nome}
          descricao={[TAMANHO[m.teatro?.tamanho], m.teatro?.capacidade ? `${m.teatro.capacidade.toLocaleString("pt-BR")} lugares` : ""].filter(Boolean).join(" · ")}
        />
        {m.produtora && <Pessoa titulo="Produtora" nome={m.produtora} descricao={m.produtoraDescricao} />}
        {m.direcao?.nome && <Pessoa titulo="Direção" nome={m.direcao.nome} descricao={m.direcao.descricao} />}
        {(m.equipe || []).map((p, i) => <Pessoa key={`e${i}`} titulo={p.funcao} nome={p.nome} descricao={p.descricao} />)}
        {(m.elenco || []).map((p, i) => <Pessoa key={`c${i}`} titulo="Elenco" nome={p.nome} descricao={p.descricao} />)}
      </div>
    </>
  )
}

export default function ProdutorMusical() {
  const { id } = useParams()
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
      .catch((e) => { console.error("Erro ao carregar o musical:", e); if (ativo) setErro("Não foi possível carregar agora.") })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [idPedido])

  const m = t?.musicais?.find((x) => x.id === id)

  if (carregando || erro || !t || !m) {
    return (
      <LayoutJogo t={t} aba="musical" sufixo={sufixo}>
        <p style={{ ...cinza, textAlign: "center", padding: "24px 0" }}>
          {carregando ? "Carregando…" : erro || (!t ? "Nenhuma temporada no ar no momento." : "Musical não encontrado nesta temporada.")}
        </p>
      </LayoutJogo>
    )
  }

  const vSemana = variacaoDaSemana(m)
  const vTotal = variacaoTotal(m)
  const historico = m.historico || []
  const criticas = (t.criticas || []).filter((c) => c.musical === m.id).sort((a, b) => b.semana - a.semana)

  return (
    <LayoutJogo t={t} aba="musical" sufixo={sufixo}>
      {/* Pôster + título + preço (e a ficha completa, no computador) */}
      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", marginBottom: "18px" }}>
        {m.poster && (
          <div className="jogo-poster-ficha" style={estiloPoster({ width: "240px", flexShrink: 0, filter: m.fechado ? "grayscale(1)" : "none" })}>
            <img src={m.poster} alt={m.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="jogo-titulo-ficha" style={{ fontFamily: "var(--fonte-titulo)", fontSize: "34px", lineHeight: 1.1, margin: 0, color: TEMA.texto }}>{m.titulo}</h1>
          <p style={{ ...cinza, fontSize: "13px", marginTop: "4px" }}>{m.teatro?.nome} · {TAMANHO[m.teatro?.tamanho] || ""}</p>
          {m.fechado && (
            <p style={{ color: TEMA.queda, fontWeight: 700, fontSize: "14px", margin: "8px 0 0" }}>
              Fechou{m.fechouNaSemana ? ` na semana ${m.fechouNaSemana}` : ""}. As ações foram vendidas automaticamente.
            </p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 14px", marginTop: "10px" }}>
            <span className="jogo-preco-grande" style={{ fontSize: "30px", fontWeight: 700, color: TEMA.ouro }}>{bravos(m.precoAtual)}</span>
            {historico.length > 0 ? (
              <span style={{ fontSize: "14px", fontWeight: 700, color: corVariacao(vSemana) }}>{pct(vSemana)} na semana</span>
            ) : (
              <span style={{ fontSize: "13px", color: TEMA.textoFraco }}>preço de estreia</span>
            )}
          </div>
          <p style={{ ...cinza, fontSize: "12px" }}>Bravos por ação</p>
          <div className="jogo-so-desktop" style={{ marginTop: "18px" }}>
            <Ficha m={m} />
          </div>
        </div>
      </div>

      {/* Compra e venda */}
      <PainelOperacao t={t} m={m} linkCarteira={`/produtor/carteira${sufixo}`} />

      {/* Ficha completa, no celular */}
      <div className="jogo-so-mobile" style={cartao}>
        <Ficha m={m} />
      </div>

      {/* Desempenho */}
      {historico.length > 0 && (
        <div style={cartao}>
          <h2 style={tituloCartao}>Desempenho</h2>
          <p style={{ ...cinza, marginBottom: "12px" }}>
            Desde a estreia: <strong style={{ color: corVariacao(vTotal) }}>{pct(vTotal)}</strong>
          </p>
          <div style={{ maxWidth: "640px" }}><GraficoPreco m={m} /></div>
          <table style={{ borderCollapse: "collapse", fontSize: "14px", width: "100%", marginTop: "14px" }}>
            <thead>
              <tr style={{ color: TEMA.textoFraco }}>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${TEMA.borda}`, fontWeight: 600 }}>Semana</th>
                <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: `1px solid ${TEMA.borda}`, fontWeight: 600 }}>Ocupação</th>
                <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: `1px solid ${TEMA.borda}`, fontWeight: 600 }}>Preço</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.semana}>
                  <td style={{ padding: "6px 8px", borderBottom: `1px solid ${TEMA.borda}` }}>Semana {h.semana}</td>
                  <td style={{ padding: "6px 8px", borderBottom: `1px solid ${TEMA.borda}`, textAlign: "right" }}>{h.ocupacao != null ? `${h.ocupacao}%` : "-"}</td>
                  <td style={{ padding: "6px 8px", borderBottom: `1px solid ${TEMA.borda}`, textAlign: "right" }}>{bravos(h.preco)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Críticas */}
      <div style={cartao}>
        <h2 style={tituloCartao}>Críticas</h2>
        {criticas.length === 0 ? (
          <p style={cinza}>Nenhuma crítica publicada ainda.</p>
        ) : (
          criticas.map((c, i) => {
            const quem = critico(t, c.critico)
            return (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < criticas.length - 1 ? `1px solid ${TEMA.borda}` : "none" }}>
                <p style={{ margin: 0, fontSize: "18px", color: TEMA.ouro, letterSpacing: "2px" }}>{estrelas(c.nota)}</p>
                {c.frase && <p style={{ fontSize: "15px", fontStyle: "italic", margin: "4px 0 0", lineHeight: 1.5, color: TEMA.texto }}>"{c.frase}"</p>}
                <p style={{ ...cinza, fontSize: "13px", marginTop: "4px" }}>
                  {quem.nome}{quem.veiculo ? `, ${quem.veiculo}` : ""} · semana {c.semana}
                </p>
              </div>
            )
          })
        )}
      </div>
    </LayoutJogo>
  )
}
