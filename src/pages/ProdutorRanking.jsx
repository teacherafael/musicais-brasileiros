// src/pages/ProdutorRanking.jsx
// Ranking da temporada do jogo "Eu Quero Ser Produtor".
// O servidor monta o ranking a cada resultado de segunda (jogoRanking/{temporada}),
// então a página custa 1 leitura a mais que o cartaz.

import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../firebase"
import LayoutJogo, { useJogo } from "../components/LayoutJogo"
import { carregarTemporada, bravos, pct, corVariacao, cartao, tituloCartao, cinza, rotulo, TEMA } from "../jogo/publico"

const COR_SELO = { ouro: "#F5C518", prata: "#C9CDD3", bronze: "#D08A4A" }
const MOSTRAR = 100

function Selos({ selos }) {
  const itens = ["ouro", "prata", "bronze"].filter((n) => selos?.[n] > 0)
  if (!itens.length) return null
  return (
    <span style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
      {itens.map((n) => (
        <span key={n} title={`${selos[n]} ${n}`} style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "12px", color: TEMA.textoMedio }}>
          <span aria-hidden="true" style={{ width: "10px", height: "10px", borderRadius: "50%", background: COR_SELO[n] }} />
          {selos[n]}
        </span>
      ))}
    </span>
  )
}

function Avatar({ foto, nome }) {
  if (foto) {
    return <img src={foto} alt="" referrerPolicy="no-referrer" style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  }
  return (
    <span aria-hidden="true" style={{ width: "34px", height: "34px", borderRadius: "50%", background: TEMA.posterVazio, color: TEMA.ouro, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>
      {(nome || "?").charAt(0).toUpperCase()}
    </span>
  )
}

function Linha({ j, eu }) {
  const podio = j.posicao <= 3 ? ["#F5C518", "#C9CDD3", "#D08A4A"][j.posicao - 1] : null
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", borderRadius: "10px", background: eu ? "#2a2410" : "transparent", border: eu ? `1px solid ${TEMA.ouro}` : "1px solid transparent" }}>
      <span style={{ width: "30px", textAlign: "center", fontWeight: 800, fontSize: podio ? "18px" : "15px", color: podio || TEMA.textoFraco, flexShrink: 0 }}>{j.posicao}</span>
      <Avatar foto={j.foto} nome={j.nome} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {j.nome}{eu ? " (você)" : ""}
        </div>
        <Selos selos={j.selos} />
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "15px" }}>{bravos(j.patrimonio)}</div>
        <div style={{ fontSize: "12px", fontWeight: 700, color: corVariacao(j.variacaoSemana) }}>{pct(j.variacaoSemana)} na semana</div>
      </div>
    </div>
  )
}

function ConteudoRanking({ t }) {
  const { usuario } = useJogo()
  const [ranking, setRanking] = useState(undefined)

  useEffect(() => {
    let ativo = true
    getDoc(doc(db, "jogoRanking", t.id))
      .then((snap) => { if (ativo) setRanking(snap.exists() ? snap.data() : null) })
      .catch((e) => { console.error("Erro ao carregar o ranking:", e); if (ativo) setRanking(null) })
    return () => { ativo = false }
  }, [t.id])

  if (ranking === undefined) return <p style={{ ...cinza, textAlign: "center", padding: "24px 0" }}>Carregando…</p>
  if (!ranking || !ranking.jogadores?.length) {
    return (
      <div style={cartao}>
        <h2 style={tituloCartao}>Ranking</h2>
        <p style={cinza}>O ranking sai junto com o primeiro resultado de segunda. Invista antes disso para aparecer nele.</p>
      </div>
    )
  }

  const eu = usuario ? ranking.jogadores.find((j) => j.uid === usuario.uid) : null
  const lista = ranking.jogadores.slice(0, MOSTRAR)

  return (
    <>
      {eu && (
        <div style={{ ...cartao, borderColor: TEMA.ouro, display: "flex", flexWrap: "wrap", gap: "16px 28px", alignItems: "center" }}>
          <div>
            <p style={rotulo}>Sua posição</p>
            <p style={{ margin: 0, fontSize: "30px", fontWeight: 800, color: TEMA.ouro }}>{eu.posicao}º <span style={{ fontSize: "14px", color: TEMA.textoFraco, fontWeight: 400 }}>de {ranking.total}</span></p>
          </div>
          <div>
            <p style={rotulo}>Lucro na temporada</p>
            <p style={{ margin: "6px 0 0", fontSize: "20px", fontWeight: 700, color: corVariacao(eu.lucro) }}>{pct(eu.lucro)}</p>
          </div>
        </div>
      )}

      <div style={cartao}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "8px" }}>
          <h2 style={{ ...tituloCartao, margin: 0 }}>{ranking.final ? "Ranking final" : "Ranking da temporada"}</h2>
          <span style={{ ...cinza, fontSize: "13px" }}>após a semana {ranking.semana}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {lista.map((j) => <Linha key={j.uid} j={j} eu={usuario && j.uid === usuario.uid} />)}
        </div>
        {eu && eu.posicao > MOSTRAR && (
          <>
            <p style={{ ...cinza, textAlign: "center", margin: "6px 0" }}>…</p>
            <Linha j={eu} eu />
          </>
        )}
        <p style={{ ...cinza, fontSize: "12px", marginTop: "12px" }}>
          Atualizado a cada resultado de segunda. Quem começou a investir depois do último resultado aparece no próximo.
        </p>
      </div>
    </>
  )
}

export default function ProdutorRanking() {
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
      .catch((e) => { console.error("Erro ao carregar o jogo:", e); if (ativo) setErro("Não foi possível carregar o ranking agora.") })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [idPedido])

  return (
    <LayoutJogo t={t} aba="ranking" sufixo={sufixo}>
      {carregando || erro || !t ? (
        <p style={{ ...cinza, textAlign: "center", padding: "24px 0" }}>
          {carregando ? "Carregando…" : erro || "Nenhuma temporada no ar no momento."}
        </p>
      ) : (
        <ConteudoRanking t={t} />
      )}
    </LayoutJogo>
  )
}
