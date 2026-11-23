// src/pages/ProdutorMusical.jsx
// Ficha de um musical do jogo "Eu Quero Ser Produtor".
// Só leitura. O painel de compra e venda entra na etapa 4.

import { useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import {
  carregarTemporada, variacaoDaSemana, variacaoTotal, bravos, pct, corVariacao,
  TAMANHO, estrelas, critico, cartao, tituloCartao, cinza, estiloPoster,
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
  const cor = pontos[pontos.length - 1].preco >= m.precoInicial ? "#1a7f37" : "#cc0000"
  return (
    <svg viewBox={`0 0 ${L} ${A}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Gráfico do preço por semana">
      <line x1={M} x2={L - M} y1={y(m.precoInicial)} y2={y(m.precoInicial)} stroke="#ddd" strokeDasharray="4 4" />
      <path d={linha} fill="none" stroke={cor} strokeWidth="3" strokeLinejoin="round" />
      {pontos.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.preco)} r="4" fill={cor} />
          <text x={x(i)} y={A - 4} textAnchor="middle" fontSize="12" fill="#888">{i === 0 ? "Início" : `S${p.semana}`}</text>
        </g>
      ))}
    </svg>
  )
}

function Pessoa({ rotulo, nome, descricao }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
      {rotulo && <p style={{ fontSize: "12px", color: "#888", margin: "0 0 2px" }}>{rotulo}</p>}
      <p style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>{nome}</p>
      {descricao && <p style={{ ...cinza, marginTop: "2px" }}>{descricao}</p>}
    </div>
  )
}

export default function ProdutorMusical() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const idPedido = params.get("temporada")
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

  const voltar = `/produtor${idPedido ? `?temporada=${encodeURIComponent(idPedido)}` : ""}`

  if (carregando) return <main><p style={cinza}>Carregando…</p></main>
  if (erro) return <main><p style={cinza}>{erro}</p></main>

  const m = t?.musicais?.find((x) => x.id === id)
  if (!m) {
    return (
      <main>
        <Link to={voltar} style={{ fontSize: "14px", color: "#666" }}>← Voltar ao cartaz</Link>
        <p style={{ ...cinza, marginTop: "16px" }}>Musical não encontrado nesta temporada.</p>
      </main>
    )
  }

  const vSemana = variacaoDaSemana(m)
  const vTotal = variacaoTotal(m)
  const historico = m.historico || []
  const criticas = (t.criticas || []).filter((c) => c.musical === m.id).sort((a, b) => b.semana - a.semana)

  return (
    <main>
      <Link to={voltar} style={{ fontSize: "14px", color: "#666", textDecoration: "none" }}>← Voltar ao cartaz</Link>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-end", marginTop: "16px" }}>
        {m.poster && (
          <div style={estiloPoster({ width: "200px", flexShrink: 0, filter: m.fechado ? "grayscale(1)" : "none" })}>
            <img src={m.poster} alt={m.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ flex: "1 1 240px" }}>
          <h1 className="page-title" style={{ margin: 0 }}>{m.titulo}</h1>
          <p style={{ ...cinza, marginTop: "6px" }}>{m.teatro?.nome} · {TAMANHO[m.teatro?.tamanho] || ""}</p>
          {m.fechado && (
            <p style={{ color: "#cc0000", fontWeight: 600, margin: "10px 0 0" }}>
              Este musical fechou{m.fechouNaSemana ? ` na semana ${m.fechouNaSemana}` : ""}. As ações foram vendidas automaticamente.
            </p>
          )}
        </div>
      </div>

      {/* Preço */}
      <div style={{ ...cartao, marginTop: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", alignItems: "flex-end" }}>
          <div>
            <p style={{ ...cinza, fontSize: "12px" }}>Preço por ação</p>
            <p style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>{bravos(m.precoAtual)} <span style={{ fontSize: "14px", fontWeight: 400, color: "#666" }}>Bravos</span></p>
          </div>
          <div>
            <p style={{ ...cinza, fontSize: "12px" }}>Na semana</p>
            <p style={{ fontSize: "18px", fontWeight: 600, margin: 0, color: corVariacao(vSemana) }}>{vSemana == null ? "-" : pct(vSemana)}</p>
          </div>
          <div>
            <p style={{ ...cinza, fontSize: "12px" }}>Desde a estreia</p>
            <p style={{ fontSize: "18px", fontWeight: 600, margin: 0, color: corVariacao(historico.length ? vTotal : null) }}>{historico.length ? pct(vTotal) : "-"}</p>
          </div>
        </div>
        {historico.length > 0 ? (
          <div style={{ marginTop: "16px" }}><GraficoPreco m={m} /></div>
        ) : (
          <p style={{ ...cinza, marginTop: "12px" }}>Preço de estreia. O primeiro resultado sai na segunda depois da estreia.</p>
        )}
      </div>

      {/* Bilheteria */}
      {historico.length > 0 && (
        <div style={cartao}>
          <h2 style={tituloCartao}>Bilheteria</h2>
          <table style={{ borderCollapse: "collapse", fontSize: "14px", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #eee" }}>Semana</th>
                <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #eee" }}>Ocupação</th>
                <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #eee" }}>Preço</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.semana}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee" }}>Semana {h.semana}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee", textAlign: "right" }}>{h.ocupacao != null ? `${h.ocupacao}%` : "-"}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #eee", textAlign: "right" }}>{bravos(h.preco)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Compra e venda (etapa 4) */}
      <div style={{ ...cartao, background: "transparent", borderStyle: "dashed" }}>
        <p style={cinza}>Compra e venda chegam em breve.</p>
      </div>

      {/* Ficha */}
      <div style={cartao}>
        <h2 style={tituloCartao}>Sinopse</h2>
        <p style={{ fontSize: "15px", lineHeight: 1.6, margin: 0 }}>{m.sinopse}</p>
        {m.destaques && <p style={{ fontSize: "15px", lineHeight: 1.6, margin: "12px 0 0" }}><strong>Destaque:</strong> {m.destaques}</p>}
      </div>

      <div style={cartao}>
        <h2 style={tituloCartao}>Ficha</h2>
        <Pessoa
          rotulo="Teatro"
          nome={m.teatro?.nome}
          descricao={[TAMANHO[m.teatro?.tamanho], m.teatro?.capacidade ? `${m.teatro.capacidade.toLocaleString("pt-BR")} lugares` : ""].filter(Boolean).join(" · ")}
        />
        {m.produtora && <Pessoa rotulo="Produtora" nome={m.produtora} descricao={m.produtoraDescricao} />}
        {m.direcao?.nome && <Pessoa rotulo="Direção" nome={m.direcao.nome} descricao={m.direcao.descricao} />}
        {(m.equipe || []).map((p, i) => <Pessoa key={`e${i}`} rotulo={p.funcao} nome={p.nome} descricao={p.descricao} />)}
        {(m.elenco || []).map((p, i) => <Pessoa key={`c${i}`} rotulo={i === 0 ? "Elenco" : ""} nome={p.nome} descricao={p.descricao} />)}
      </div>

      {/* Críticas */}
      <div style={cartao}>
        <h2 style={tituloCartao}>Críticas</h2>
        {criticas.length === 0 ? (
          <p style={cinza}>Nenhuma crítica publicada ainda.</p>
        ) : (
          criticas.map((c, i) => {
            const quem = critico(t, c.critico)
            return (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < criticas.length - 1 ? "1px solid #eee" : "none" }}>
                <p style={{ margin: 0, fontSize: "18px", color: "#F5C518", letterSpacing: "2px" }}>{estrelas(c.nota)}</p>
                {c.frase && <p style={{ fontSize: "15px", fontStyle: "italic", margin: "4px 0 0", lineHeight: 1.5 }}>"{c.frase}"</p>}
                <p style={{ ...cinza, fontSize: "13px", marginTop: "4px" }}>
                  {quem.nome}{quem.veiculo ? `, ${quem.veiculo}` : ""} · semana {c.semana}
                </p>
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}
