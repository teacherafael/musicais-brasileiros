// src/pages/ProdutorCarteira.jsx
// Carteira do jogador no jogo "Eu Quero Ser Produtor": patrimônio, saldo,
// ações por musical e histórico de operações. Só leitura.
// A moldura escura e a carteira vêm do LayoutJogo (useJogo).

import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import LayoutJogo, { useJogo } from "../components/LayoutJogo"
import { carregarTemporada, bravos, pct, corVariacao, paraData, cartao, tituloCartao, cinza, rotulo, botaoOuro, TEMA } from "../jogo/publico"
import { carregarOperacoes, carteiraVazia, patrimonio } from "../jogo/carteira"

const celula = { padding: "8px", borderBottom: `1px solid ${TEMA.borda}`, textAlign: "right", whiteSpace: "nowrap" }
const celulaEsq = { ...celula, textAlign: "left", whiteSpace: "normal" }
const cabecalho = { color: TEMA.textoFraco, fontWeight: 600 }

// Como cada tipo de operação aparece no histórico
const TIPO_OPERACAO = {
  compra: { nome: "Compra", cor: TEMA.ouro },
  venda: { nome: "Venda", cor: TEMA.alta },
  liquidacao: { nome: "Liquidação", cor: "#ff9b6a", nota: "O musical fechou: as ações foram vendidas automaticamente por 30% do último preço, sem taxa." },
  encerramento: { nome: "Fim da temporada", cor: "#b9a7ff", nota: "A temporada terminou: as ações foram vendidas automaticamente pelo preço final, sem taxa." },
}

const dataCurta = (d) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

function ConteudoCarteira({ t, sufixo }) {
  const { usuario, carteira } = useJogo()
  const [operacoes, setOperacoes] = useState([])

  useEffect(() => {
    if (!usuario) return
    let ativo = true
    carregarOperacoes(t.id, usuario.uid)
      .then((ops) => { if (ativo) setOperacoes(ops) })
      .catch((e) => console.error("Erro ao carregar o histórico:", e))
    return () => { ativo = false }
  }, [t.id, usuario])

  if (usuario === undefined || (usuario && carteira === undefined)) {
    return <p style={{ ...cinza, textAlign: "center", padding: "24px 0" }}>Carregando…</p>
  }
  if (!usuario) {
    return <p style={{ ...cinza, textAlign: "center", padding: "24px 0" }}>Entre na sua conta pelo menu do site para ver a sua carteira.</p>
  }

  const c = carteira || carteiraVazia(t)
  const inicial = t.regras?.saldoInicial || 0
  const total = patrimonio(c, t.musicais)
  const lucro = inicial ? total / inicial - 1 : 0
  const posicoes = (t.musicais || [])
    .filter((m) => (c.acoes?.[m.id] || 0) > 0)
    .map((m) => {
      const qtd = c.acoes[m.id]
      const valor = Math.round(qtd * (m.fechado ? 0 : m.precoAtual) * 100) / 100
      const custo = c.custo?.[m.id] || 0
      return { m, qtd, valor, resultado: custo ? valor / custo - 1 : null }
    })

  return (
    <>
      <div style={{ ...cartao, borderColor: TEMA.ouro }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 28px" }}>
          <div>
            <p style={rotulo}>Patrimônio</p>
            <p style={{ margin: 0, fontSize: "30px", fontWeight: 700, color: TEMA.ouro }}>{bravos(total)}</p>
          </div>
          <div>
            <p style={rotulo}>Saldo livre</p>
            <p style={{ margin: "6px 0 0", fontSize: "20px", fontWeight: 700 }}>{bravos(c.saldo)}</p>
          </div>
          <div>
            <p style={rotulo}>Desde o início</p>
            <p style={{ margin: "6px 0 0", fontSize: "20px", fontWeight: 700, color: carteira ? corVariacao(lucro) : TEMA.textoFraco }}>
              {carteira ? pct(lucro) : "-"}
            </p>
          </div>
        </div>
      </div>

      <div style={cartao}>
        <h2 style={tituloCartao}>Minhas ações</h2>
        {posicoes.length === 0 ? (
          <>
            <p style={{ ...cinza, marginBottom: "12px" }}>Você ainda não tem ações. Escolha um musical no cartaz e faça o primeiro investimento.</p>
            <Link to={`/produtor${sufixo}`} style={botaoOuro}>Ver o cartaz</Link>
          </>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: "14px", width: "100%" }}>
              <thead>
                <tr style={cabecalho}>
                  <th style={celulaEsq}>Musical</th>
                  <th style={celula}>Ações</th>
                  <th style={celula}>Preço</th>
                  <th style={celula}>Valor</th>
                  <th style={celula}>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {posicoes.map(({ m, qtd, valor, resultado }) => (
                  <tr key={m.id}>
                    <td style={celulaEsq}>
                      <Link to={`/produtor/musical/${m.id}${sufixo}`} style={{ color: TEMA.texto, fontWeight: 700 }}>{m.titulo}</Link>
                    </td>
                    <td style={celula}>{qtd}</td>
                    <td style={celula}>{bravos(m.precoAtual)}</td>
                    <td style={celula}>{bravos(valor)}</td>
                    <td style={{ ...celula, fontWeight: 700, color: corVariacao(resultado) }}>{resultado == null ? "-" : pct(resultado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ ...cinza, fontSize: "12px", marginTop: "8px" }}>O resultado compara o valor de hoje com o que você pagou, já contando a taxa.</p>
          </div>
        )}
      </div>

      <div style={cartao}>
        <h2 style={tituloCartao}>Histórico</h2>
        {operacoes.length === 0 ? (
          <p style={cinza}>Nenhuma operação ainda.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: "14px", width: "100%" }}>
              <thead>
                <tr style={cabecalho}>
                  <th style={celulaEsq}>Quando</th>
                  <th style={celulaEsq}>Operação</th>
                  <th style={celula}>Preço</th>
                  <th style={celula}>Taxa</th>
                  <th style={celula}>Total</th>
                </tr>
              </thead>
              <tbody>
                {operacoes.map((op) => (
                  <tr key={op.id}>
                    <td style={{ ...celulaEsq, whiteSpace: "nowrap", color: TEMA.textoFraco }}>{op.criadaEm ? dataCurta(paraData(op.criadaEm)) : ""}</td>
                    <td style={celulaEsq}>
                      <strong style={{ color: (TIPO_OPERACAO[op.tipo] || TIPO_OPERACAO.venda).cor }}>{(TIPO_OPERACAO[op.tipo] || TIPO_OPERACAO.venda).nome}</strong>
                      {" "}de {op.quantidade} · {op.titulo}
                      {TIPO_OPERACAO[op.tipo]?.nota && (
                        <div style={{ fontSize: "12px", color: TEMA.textoFraco, marginTop: "2px" }}>{TIPO_OPERACAO[op.tipo].nota}</div>
                      )}
                    </td>
                    <td style={celula}>{bravos(op.preco)}</td>
                    <td style={celula}>{bravos(op.taxa)}</td>
                    <td style={celula}>{op.tipo === "compra" ? "-" : "+"}{bravos(op.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

export default function ProdutorCarteira() {
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
      .catch((e) => { console.error("Erro ao carregar a carteira:", e); if (ativo) setErro("Não foi possível carregar a carteira agora.") })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [idPedido])

  return (
    <LayoutJogo t={t} aba="carteira" sufixo={sufixo}>
      {carregando || erro || !t ? (
        <p style={{ ...cinza, textAlign: "center", padding: "24px 0" }}>
          {carregando ? "Carregando…" : erro || "Nenhuma temporada no ar no momento."}
        </p>
      ) : (
        <ConteudoCarteira t={t} sufixo={sufixo} />
      )}
    </LayoutJogo>
  )
}
