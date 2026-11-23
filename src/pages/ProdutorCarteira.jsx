// src/pages/ProdutorCarteira.jsx
// Carteira do jogador no jogo "Eu Quero Ser Produtor": saldo, patrimônio,
// ações por musical e histórico de operações. Só leitura.

import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { carregarTemporada, bravos, pct, corVariacao, paraData, cartao, tituloCartao, cinza } from "../jogo/publico"
import { useUsuario, carregarCarteira, carregarOperacoes, carteiraVazia, patrimonio } from "../jogo/carteira"

const celula = { padding: "8px", borderBottom: "1px solid #eee", textAlign: "right", whiteSpace: "nowrap" }
const celulaEsq = { ...celula, textAlign: "left", whiteSpace: "normal" }

const dataCurta = (d) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })

export default function ProdutorCarteira() {
  const [params] = useSearchParams()
  const idPedido = params.get("temporada")
  const sufixo = idPedido ? `?temporada=${encodeURIComponent(idPedido)}` : ""
  const usuario = useUsuario()
  const [t, setT] = useState(null)
  const [carteira, setCarteira] = useState(null)
  const [operacoes, setOperacoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    if (usuario === undefined) return
    let ativo = true
    setCarregando(true)
    ;(async () => {
      try {
        const temporada = await carregarTemporada(idPedido)
        if (!ativo) return
        setT(temporada)
        if (temporada && usuario) {
          const [c, ops] = await Promise.all([
            carregarCarteira(temporada.id, usuario.uid),
            carregarOperacoes(temporada.id, usuario.uid),
          ])
          if (!ativo) return
          setCarteira(c)
          setOperacoes(ops)
        }
      } catch (e) {
        console.error("Erro ao carregar a carteira:", e)
        if (ativo) setErro("Não foi possível carregar a carteira agora.")
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => { ativo = false }
  }, [idPedido, usuario])

  const voltar = <Link to={`/produtor${sufixo}`} style={{ fontSize: "14px", color: "#666", textDecoration: "none" }}>← Voltar ao cartaz</Link>

  if (carregando || usuario === undefined) return <main><p style={cinza}>Carregando…</p></main>
  if (erro) return <main>{voltar}<p style={{ ...cinza, marginTop: "16px" }}>{erro}</p></main>
  if (!t) return <main>{voltar}<p style={{ ...cinza, marginTop: "16px" }}>Nenhuma temporada no ar no momento.</p></main>

  if (!usuario) {
    return (
      <main>
        {voltar}
        <h1 className="page-title" style={{ marginTop: "16px" }}>Minha carteira</h1>
        <p style={{ ...cinza, marginTop: "12px" }}>Entre na sua conta pelo menu do site para ver a sua carteira.</p>
      </main>
    )
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
    <main>
      {voltar}
      <h1 className="page-title" style={{ marginTop: "16px" }}>Minha carteira</h1>
      <p style={{ ...cinza, marginTop: "8px", marginBottom: "20px" }}>{t.nome}{t.modoTeste ? " · teste" : ""}</p>

      <div style={{ ...cartao, background: "#0a2c59", border: "none", color: "#fff" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "28px" }}>
          <div>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.8 }}>Patrimônio</p>
            <p style={{ margin: "4px 0 0", fontSize: "28px", fontWeight: 700, color: "#F5C518" }}>{bravos(total)}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.8 }}>Saldo livre</p>
            <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 600 }}>{bravos(c.saldo)}</p>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.8 }}>Desde o início</p>
            <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 600, color: lucro > 0 ? "#7ee2a0" : lucro < 0 ? "#ff9b9b" : "#fff" }}>
              {carteira ? pct(lucro) : "-"}
            </p>
          </div>
        </div>
      </div>

      <div style={cartao}>
        <h2 style={tituloCartao}>Minhas ações</h2>
        {posicoes.length === 0 ? (
          <p style={cinza}>
            Você ainda não tem ações. <Link to={`/produtor${sufixo}`} style={{ color: "inherit" }}>Escolha um musical no cartaz</Link> e invista.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: "14px", width: "100%" }}>
              <thead>
                <tr>
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
                      <Link to={`/produtor/musical/${m.id}${sufixo}`} style={{ color: "inherit", fontWeight: 600 }}>{m.titulo}</Link>
                    </td>
                    <td style={celula}>{qtd}</td>
                    <td style={celula}>{bravos(m.precoAtual)}</td>
                    <td style={celula}>{bravos(valor)}</td>
                    <td style={{ ...celula, fontWeight: 600, color: corVariacao(resultado) }}>{resultado == null ? "-" : pct(resultado)}</td>
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
                <tr>
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
                    <td style={{ ...celulaEsq, whiteSpace: "nowrap", color: "#666" }}>{op.criadaEm ? dataCurta(paraData(op.criadaEm)) : ""}</td>
                    <td style={celulaEsq}>
                      <strong style={{ color: op.tipo === "compra" ? "#0a2c59" : "#8a5a00" }}>{op.tipo === "compra" ? "Compra" : "Venda"}</strong>
                      {" "}de {op.quantidade} · {op.titulo}
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
    </main>
  )
}
