// src/components/PainelOperacao.jsx
// Painel "Investir" na ficha do musical (jogo "Eu Quero Ser Produtor").
// Mostra a prévia do custo com a taxa e o limite de 50% antes de enviar.
// Quem grava é o servidor (/api/jogo-operar). A carteira vem do LayoutJogo
// (useJogo), e depois de cada operação é recarregada lá, o que também
// atualiza o patrimônio na marquise.

import { useState } from "react"
import { Link } from "react-router-dom"
import { useJogo } from "./LayoutJogo"
import { operar, carteiraVazia, custoDaCompra, valorDaVenda, maximoCompra, patrimonio } from "../jogo/carteira"
import { momentoDoMercado, bravos, cartao, tituloCartao, cinza, rotulo, botaoOuro, botaoContorno, TEMA } from "../jogo/publico"

const FECHADO = {
  antes: "O mercado ainda não abriu. As operações começam na abertura da temporada.",
  fechado: "O mercado está fechado até o próximo resultado. Dá para operar de novo assim que ele sair.",
  aguardando: "O resultado da semana está saindo. Atualize a página em instantes.",
  encerrada: "A temporada terminou.",
}

export default function PainelOperacao({ t, m, linkCarteira }) {
  const { usuario, carteira, recarregarCarteira } = useJogo()
  const [tipo, setTipo] = useState("compra")
  const [qtdTexto, setQtdTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  const momento = momentoDoMercado(t)
  const aberto = momento.fase === "aberto" && !m.fechado
  const c = carteira || carteiraVazia(t)
  const tenho = c.acoes?.[m.id] || 0
  const taxa = t.regras?.taxa || 0
  const maxCompra = maximoCompra(c, m, t)
  const maximo = tipo === "compra" ? maxCompra : tenho
  const qtd = Number(qtdTexto)
  const qtdValida = Number.isInteger(qtd) && qtd >= 1 && qtd <= maximo
  const conta = qtd > 0 && Number.isInteger(qtd)
    ? (tipo === "compra" ? custoDaCompra(qtd, m.precoAtual, taxa) : valorDaVenda(qtd, m.precoAtual, taxa))
    : null

  async function confirmar() {
    if (!qtdValida || enviando) return
    setEnviando(true)
    setMensagem(null)
    try {
      await operar({ temporadaId: t.id, musicalId: m.id, tipo, quantidade: qtd })
      await recarregarCarteira()
      setQtdTexto("")
      setMensagem({ ok: true, texto: `${tipo === "compra" ? "Compra" : "Venda"} de ${qtd} ${qtd === 1 ? "ação" : "ações"} concluída.` })
    } catch (e) {
      setMensagem({ ok: false, texto: e.message })
    }
    setEnviando(false)
  }

  const aba = (valor, texto) => (
    <button
      type="button"
      onClick={() => { setTipo(valor); setQtdTexto(""); setMensagem(null) }}
      style={{ ...(tipo === valor ? botaoOuro : botaoContorno), flex: 1 }}
    >
      {texto}
    </button>
  )

  const carregando = usuario === undefined || (usuario && carteira === undefined)

  return (
    <div style={{ ...cartao, borderColor: TEMA.ouro }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
        <h2 style={{ ...tituloCartao, margin: 0, color: TEMA.ouro }}>Investir</h2>
        {usuario && (
          <Link to={linkCarteira} style={{ ...botaoContorno, padding: "6px 14px", fontSize: "13px" }}>Minha carteira</Link>
        )}
      </div>

      {m.fechado ? (
        <p style={cinza}>Este musical fechou. Não é mais possível comprar nem vender.</p>
      ) : carregando ? (
        <p style={cinza}>Carregando…</p>
      ) : !usuario ? (
        <p style={cinza}>Entre na sua conta pelo menu do site para investir. Todo mundo começa com {bravos(t.regras?.saldoInicial || 0)} Bravos.</p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "14px" }}>
            <div>
              <p style={rotulo}>Saldo livre</p>
              <p style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>{bravos(c.saldo)}</p>
            </div>
            <div>
              <p style={rotulo}>Suas ações</p>
              <p style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>{tenho}</p>
            </div>
            <div>
              <p style={rotulo}>Patrimônio</p>
              <p style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>{bravos(patrimonio(c, t.musicais))}</p>
            </div>
          </div>

          {!aberto ? (
            <p style={cinza}>{FECHADO[momento.fase] || "O mercado está fechado agora."}</p>
          ) : (
            <>
              <div style={{ display: "flex", gap: "8px", marginBottom: "14px", maxWidth: "360px" }}>
                {aba("compra", "Comprar")}
                {aba("venda", "Vender")}
              </div>

              {maximo === 0 ? (
                <p style={cinza}>
                  {tipo === "venda"
                    ? "Você não tem ações deste musical para vender."
                    : "Você não pode comprar mais ações deste musical agora: o saldo ou o limite de 50% do patrimônio já foi atingido."}
                </p>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={qtdTexto}
                      onChange={(e) => { setQtdTexto(e.target.value.replace(/[^0-9]/g, "")); setMensagem(null) }}
                      placeholder="Quantidade"
                      aria-label="Quantidade de ações"
                      style={{ width: "130px", padding: "10px 12px", fontSize: "15px", background: TEMA.fundo, color: TEMA.texto, border: `1px solid ${TEMA.bordaForte}`, borderRadius: "8px", fontFamily: "inherit" }}
                    />
                    <button type="button" style={{ ...botaoContorno, padding: "9px 14px" }} onClick={() => setQtdTexto(String(maximo))}>
                      Máximo ({maximo})
                    </button>
                  </div>

                  {conta && (
                    <div style={{ fontSize: "14px", marginTop: "12px", lineHeight: 1.7, color: TEMA.textoMedio }}>
                      <div>{qtd} × {bravos(m.precoAtual)} = {bravos(conta.valor)}</div>
                      <div style={{ color: TEMA.textoFraco }}>Taxa de {String(taxa * 100).replace(".", ",")}%: {bravos(conta.taxa)}</div>
                      <div style={{ fontWeight: 700, color: TEMA.texto }}>
                        {tipo === "compra" ? "Total a pagar" : "Você recebe"}: {bravos(conta.total)} Bravos
                      </div>
                      {qtd > maximo && (
                        <div style={{ color: TEMA.queda }}>
                          {tipo === "compra" ? `O máximo que dá para comprar agora é ${maximo}.` : `Você só tem ${tenho} ${tenho === 1 ? "ação" : "ações"}.`}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={confirmar}
                    disabled={!qtdValida || enviando}
                    style={{ ...botaoOuro, marginTop: "14px", opacity: !qtdValida || enviando ? 0.35 : 1, cursor: !qtdValida || enviando ? "not-allowed" : "pointer" }}
                  >
                    {enviando ? "Enviando…" : tipo === "compra" ? "Confirmar compra" : "Confirmar venda"}
                  </button>
                </>
              )}
            </>
          )}

          {mensagem && (
            <p style={{ fontSize: "14px", fontWeight: 700, margin: "12px 0 0", color: mensagem.ok ? TEMA.alta : TEMA.queda }}>
              {mensagem.texto}
            </p>
          )}
        </>
      )}
    </div>
  )
}
