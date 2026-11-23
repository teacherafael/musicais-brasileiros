// src/components/PainelOperacao.jsx
// Painel de compra e venda na ficha do musical (jogo "Eu Quero Ser Produtor").
// Mostra a prévia do custo com a taxa e o limite de 50% antes de enviar.
// Quem grava é o servidor (/api/jogo-operar); aqui só lemos a carteira.

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  useUsuario, carregarCarteira, carteiraVazia, operar,
  custoDaCompra, valorDaVenda, maximoCompra, patrimonio,
} from "../jogo/carteira"
import { momentoDoMercado, bravos, cartao, tituloCartao, cinza } from "../jogo/publico"

const FECHADO = {
  antes: "O mercado ainda não abriu. As operações começam na abertura da temporada.",
  fechado: "O mercado está fechado até o resultado de segunda. Dá para operar de novo assim que ele sair.",
  aguardando: "O resultado da semana está saindo. Atualize a página em instantes.",
  encerrada: "A temporada terminou.",
}

export default function PainelOperacao({ t, m, linkCarteira }) {
  const usuario = useUsuario()
  const [carteira, setCarteira] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [tipo, setTipo] = useState("compra")
  const [qtdTexto, setQtdTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    let ativo = true
    if (usuario === undefined) return
    if (!usuario) { setCarregando(false); return }
    setCarregando(true)
    carregarCarteira(t.id, usuario.uid)
      .then((c) => { if (ativo) setCarteira(c) })
      .catch((e) => console.error("Erro ao carregar a carteira:", e))
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [usuario, t.id])

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
      const nova = await carregarCarteira(t.id, usuario.uid)
      setCarteira(nova)
      setQtdTexto("")
      setMensagem({
        ok: true,
        texto: `${tipo === "compra" ? "Compra" : "Venda"} de ${qtd} ${qtd === 1 ? "ação" : "ações"} concluída.`,
      })
    } catch (e) {
      setMensagem({ ok: false, texto: e.message })
    }
    setEnviando(false)
  }

  const aba = (valor, rotulo) => (
    <button
      type="button"
      onClick={() => { setTipo(valor); setQtdTexto(""); setMensagem(null) }}
      className={tipo === valor ? "btn-comentar" : "btn-sair"}
      style={{ flex: 1 }}
    >
      {rotulo}
    </button>
  )

  return (
    <div style={cartao}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
        <h2 style={{ ...tituloCartao, margin: 0 }}>Investir</h2>
        {usuario && (
          <Link to={linkCarteira} className="btn-comentar" style={{ textDecoration: "none", display: "inline-block" }}>
            Minha carteira
          </Link>
        )}
      </div>

      {m.fechado ? (
        <p style={cinza}>Este musical fechou. Não é mais possível comprar nem vender.</p>
      ) : usuario === undefined || carregando ? (
        <p style={cinza}>Carregando…</p>
      ) : !usuario ? (
        <p style={cinza}>Entre na sua conta pelo menu do site para investir. Todo mundo começa com {bravos(t.regras?.saldoInicial || 0)} Bravos.</p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "16px" }}>
            <div>
              <p style={{ ...cinza, fontSize: "12px" }}>Seu saldo</p>
              <p style={{ fontSize: "17px", fontWeight: 600, margin: 0 }}>{bravos(c.saldo)}</p>
            </div>
            <div>
              <p style={{ ...cinza, fontSize: "12px" }}>Suas ações deste musical</p>
              <p style={{ fontSize: "17px", fontWeight: 600, margin: 0 }}>{tenho}</p>
            </div>
            <div>
              <p style={{ ...cinza, fontSize: "12px" }}>Patrimônio</p>
              <p style={{ fontSize: "17px", fontWeight: 600, margin: 0 }}>{bravos(patrimonio(c, t.musicais))}</p>
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
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max={maximo}
                      step="1"
                      value={qtdTexto}
                      onChange={(e) => { setQtdTexto(e.target.value.replace(/[^0-9]/g, "")); setMensagem(null) }}
                      placeholder="Quantidade"
                      style={{ width: "140px", padding: "8px 10px", fontSize: "15px", border: "1px solid #ccc", borderRadius: "8px" }}
                    />
                    <button type="button" className="btn-sair" onClick={() => setQtdTexto(String(maximo))}>
                      Máximo ({maximo})
                    </button>
                  </div>

                  {conta && (
                    <div style={{ fontSize: "14px", marginTop: "12px", lineHeight: 1.7 }}>
                      <div>{qtd} × {bravos(m.precoAtual)} = {bravos(conta.valor)}</div>
                      <div style={{ color: "#666" }}>Taxa de {String(taxa * 100).replace(".", ",")}%: {bravos(conta.taxa)}</div>
                      <div style={{ fontWeight: 700 }}>
                        {tipo === "compra" ? "Total a pagar" : "Você recebe"}: {bravos(conta.total)} Bravos
                      </div>
                      {qtd > maximo && (
                        <div style={{ color: "#cc0000" }}>
                          {tipo === "compra"
                            ? `O máximo que dá para comprar agora é ${maximo}.`
                            : `Você só tem ${tenho} ${tenho === 1 ? "ação" : "ações"}.`}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-comentar"
                    onClick={confirmar}
                    disabled={!qtdValida || enviando}
                    style={{ marginTop: "14px", opacity: !qtdValida || enviando ? 0.4 : 1, cursor: !qtdValida || enviando ? "not-allowed" : "pointer" }}
                  >
                    {enviando ? "Enviando…" : tipo === "compra" ? "Confirmar compra" : "Confirmar venda"}
                  </button>
                </>
              )}
            </>
          )}

          {mensagem && (
            <p style={{ fontSize: "14px", fontWeight: 600, margin: "12px 0 0", color: mensagem.ok ? "#1a7f37" : "#cc0000" }}>
              {mensagem.texto}
            </p>
          )}

        </>
      )}
    </div>
  )
}
