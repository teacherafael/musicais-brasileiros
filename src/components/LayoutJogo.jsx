// src/components/LayoutJogo.jsx
// Moldura escura de todas as páginas do jogo "Eu Quero Ser Produtor":
// marquise com o nome do jogo, patrimônio do jogador, faixa de status
// e o menu próprio do jogo. Também carrega a carteira uma vez só e
// entrega para as páginas pelo useJogo().

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useUsuario, carregarCarteira, carteiraVazia, patrimonio } from "../jogo/carteira"
import { momentoDoMercado, contagem, dataHora, bravos, TEMA } from "../jogo/publico"

const JogoContexto = createContext({ usuario: undefined, carteira: undefined, recarregarCarteira: async () => {} })
export const useJogo = () => useContext(JogoContexto)

const CSS = `
.jogo-palco { background: ${TEMA.fundo}; color: ${TEMA.texto}; border-radius: 16px; overflow: hidden; margin: 0 0 24px; }
.jogo-palco a { color: inherit; }
.jogo-conteudo { padding: 16px 20px 24px; }
.jogo-lampadas { display: flex; justify-content: center; gap: 10px; }
.jogo-lampadas span { width: 7px; height: 7px; border-radius: 50%; background: ${TEMA.ouro}; animation: jogoPisca 1.6s infinite; }
.jogo-lampadas span:nth-child(even) { animation-delay: 0.8s; }
@keyframes jogoPisca { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
@media (prefers-reduced-motion: reduce) { .jogo-lampadas span { animation: none; } }
.jogo-menu { display: flex; gap: 8px; flex-wrap: wrap; padding: 12px 20px 0; }
.jogo-menu a { font-size: 13px; padding: 6px 14px; border-radius: 999px; border: 1px solid ${TEMA.bordaForte}; color: ${TEMA.textoMedio}; text-decoration: none; }
.jogo-menu a.ativo { background: ${TEMA.ouro}; border-color: ${TEMA.ouro}; color: ${TEMA.fundo}; font-weight: 700; }
.jogo-so-mobile { display: none; }
@media (max-width: 640px) {
  .jogo-conteudo { padding: 14px 12px 20px; }
  .jogo-menu { padding: 12px 12px 0; }
  .jogo-so-desktop { display: none; }
  .jogo-so-mobile { display: block; }
  .jogo-poster-ficha { width: 104px !important; }
  .jogo-preco-grande { font-size: 24px !important; }
  .jogo-titulo-ficha { font-size: 24px !important; }
}
`

function Marquise({ t, grande, chip }) {
  if (grande) {
    return (
      <div style={{ textAlign: "center", padding: "18px 16px 14px", borderBottom: `1px solid ${TEMA.borda}` }}>
        <div className="jogo-lampadas" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => <span key={i} />)}
        </div>
        <div style={{ fontFamily: "var(--fonte-titulo)", color: TEMA.ouro, fontSize: "clamp(26px, 7vw, 40px)", letterSpacing: "2px", lineHeight: 1.05, margin: "10px 0 6px", textTransform: "uppercase" }}>
          Eu Quero Ser Produtor
        </div>
        <div style={{ color: TEMA.textoFraco, fontSize: "12px" }}>
          um jogo do MCDb{t ? ` · ${t.nome}${t.modoTeste && !/teste/i.test(t.nome) ? " (teste)" : ""}` : ""}
        </div>
        {chip && <div style={{ marginTop: "10px" }}>{chip}</div>}
      </div>
    )
  }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "12px 20px", borderBottom: `1px solid ${TEMA.borda}` }}>
      <span style={{ fontFamily: "var(--fonte-titulo)", color: TEMA.ouro, fontSize: "17px", letterSpacing: "1.5px", textTransform: "uppercase" }}>
        Eu Quero Ser Produtor
      </span>
      {chip}
    </div>
  )
}

function FaixaStatus({ t }) {
  const [agora, setAgora] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])
  const momento = momentoDoMercado(t, agora)
  const semana = t.estado?.semanaAtual || 0
  return (
    <div style={{ background: TEMA.faixa, padding: "9px 20px", fontSize: "13px", color: TEMA.textoMedio, display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
      <span style={{ color: TEMA.texto, fontWeight: 600 }}>{semana === 0 ? "Antes da estreia" : `Semana ${semana} de ${t.semanas}`}</span>
      <span>
        {momento.texto}
        {momento.alvo && <strong style={{ color: TEMA.ouro }}> {contagem(momento.alvo, agora)}</strong>}
      </span>
      {momento.fase === "aberto" && <span style={{ color: TEMA.textoFraco }}>até {dataHora(momento.fechaVisivel)}</span>}
    </div>
  )
}

export default function LayoutJogo({ t, aba, sufixo = "", children }) {
  const usuario = useUsuario()
  const [carteira, setCarteira] = useState(undefined)

  const recarregarCarteira = useCallback(async () => {
    if (!t || !usuario) return
    try {
      setCarteira(await carregarCarteira(t.id, usuario.uid))
    } catch (e) {
      console.error("Erro ao carregar a carteira:", e)
      setCarteira(null)
    }
  }, [t, usuario])

  useEffect(() => {
    if (!t || usuario === undefined) return
    if (!usuario) { setCarteira(null); return }
    recarregarCarteira()
  }, [t, usuario, recarregarCarteira])

  let chip = null
  if (t && usuario === null) {
    chip = <span style={{ fontSize: "12px", color: TEMA.textoFraco }}>Entre pelo menu do site para jogar</span>
  } else if (t && usuario && carteira !== undefined) {
    const total = patrimonio(carteira || carteiraVazia(t), t.musicais)
    chip = (
      <Link to={`/produtor/carteira${sufixo}`} style={{ textDecoration: "none", fontSize: "13px", color: TEMA.ouro, border: `1px solid ${TEMA.ouro}`, borderRadius: "999px", padding: "4px 12px", whiteSpace: "nowrap" }}>
        {bravos(total)} Bravos
      </Link>
    )
  }

  return (
    <main>
      <style>{CSS}</style>
      <div className="jogo-palco">
        <Marquise t={t} grande={aba === "cartaz"} chip={chip} />
        {t && <FaixaStatus t={t} />}
        {t && (
          <nav className="jogo-menu" aria-label="Menu do jogo">
            <Link to={`/produtor${sufixo}`} className={aba === "cartaz" ? "ativo" : ""}>Cartaz</Link>
            <Link to={`/produtor/carteira${sufixo}`} className={aba === "carteira" ? "ativo" : ""}>Minha carteira</Link>
          </nav>
        )}
        <div className="jogo-conteudo">
          <JogoContexto.Provider value={{ usuario, carteira, recarregarCarteira }}>
            {children}
          </JogoContexto.Provider>
        </div>
      </div>
    </main>
  )
}
