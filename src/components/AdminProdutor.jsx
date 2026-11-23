// src/components/AdminProdutor.jsx
// Aba "Produtor" do /admin: cadastro, prévia e publicação das temporadas
// do jogo "Eu Quero Ser Produtor". Só aparece para o dono do jogo (ver
// ehDonoDoJogo em src/admins.js), e as regras do Firestore também só
// deixam o dono ler e gravar o jogoSecreto.

import { useEffect, useMemo, useState } from "react"
import { collection, getDocs, getDoc, setDoc, doc, serverTimestamp } from "firebase/firestore"
import { db } from "../firebase"
import {
  validarRoteiro,
  calcularPrecos,
  mediaDoMercado,
  simularEstrategias,
  conferirFontes,
  calendario,
  montarPublico,
} from "../jogo/motor"

const cartao = { background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "20px" }
const titulo = { fontFamily: "var(--fonte-titulo)", fontSize: "18px", margin: "0 0 12px" }
const celula = { padding: "6px 10px", borderBottom: "1px solid #eee", textAlign: "right", whiteSpace: "nowrap" }
const celulaEsq = { ...celula, textAlign: "left" }

const bravos = (n) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (x) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1).replace(".", ",")}%`
const dataHora = (d) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })

function AdminProdutor() {
  const [temporadas, setTemporadas] = useState([])
  const [texto, setTexto] = useState("")
  const [resultado, setResultado] = useState(null)
  const [status, setStatus] = useState("")
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    carregarLista()
  }, [])

  async function carregarLista() {
    try {
      const [secretos, publicos] = await Promise.all([
        getDocs(collection(db, "jogoSecreto")),
        getDocs(collection(db, "jogoPublico")),
      ])
      const publicadas = new Set(publicos.docs.map((d) => d.id))
      setTemporadas(
        secretos.docs.map((d) => ({
          id: d.id,
          nome: d.data().roteiro?.nome || d.id,
          modoTeste: d.data().roteiro?.modoTeste === true,
          publicada: publicadas.has(d.id),
        }))
      )
    } catch (e) {
      setStatus("Erro ao carregar as temporadas: " + e.message)
    }
  }

  async function abrirTemporada(id) {
    try {
      const snap = await getDoc(doc(db, "jogoSecreto", id))
      if (!snap.exists()) return
      const dados = snap.data()
      setTexto(dados.texto || JSON.stringify(dados.roteiro, null, 2))
      setResultado(null)
      setStatus(`Roteiro "${id}" carregado. Clique em "Validar e ver prévia" antes de salvar ou publicar.`)
    } catch (e) {
      setStatus("Erro ao abrir o roteiro: " + e.message)
    }
  }

  function validar() {
    let roteiro
    try {
      roteiro = JSON.parse(texto)
    } catch (e) {
      setResultado({ roteiro: null, erros: ["O texto não é um JSON válido. Detalhe: " + e.message], avisos: [] })
      return
    }
    const { erros, avisos } = validarRoteiro(roteiro)
    setResultado({ roteiro, erros, avisos })
    setStatus("")
  }

  const valido = resultado && resultado.roteiro && resultado.erros.length === 0

  const previa = useMemo(() => {
    if (!valido) return null
    const r = resultado.roteiro
    const precos = calcularPrecos(r)
    return {
      precos,
      media: mediaDoMercado(precos),
      estrategias: simularEstrategias(r, precos),
      fontes: conferirFontes(r),
      eventos: calendario(r),
    }
  }, [valido, resultado])

  async function salvar() {
    if (!valido) return
    const r = resultado.roteiro
    setOcupado(true)
    try {
      await setDoc(doc(db, "jogoSecreto", r.id), { roteiro: r, texto, atualizadoEm: serverTimestamp() })
      setStatus(`Roteiro "${r.id}" salvo. Ainda não está publicado.`)
      await carregarLista()
    } catch (e) {
      setStatus("Erro ao salvar: " + e.message)
    }
    setOcupado(false)
  }

  async function publicar() {
    if (!valido) return
    const r = resultado.roteiro
    setOcupado(true)
    try {
      const existente = await getDoc(doc(db, "jogoPublico", r.id))
      const aviso = existente.exists()
        ? `A temporada "${r.id}" JÁ ESTÁ PUBLICADA.\n\nPublicar de novo apaga o cartaz atual (preços, críticas e manchetes já liberadas) e volta tudo para antes da estreia.\n\nContinuar?`
        : `Publicar a temporada "${r.id}" (${r.nome})?\n\nO cartaz público vai ao ar com as fichas e os preços iniciais, e o mercado abre em ${dataHora(new Date(Date.parse(r.aberturaMercado)))}.`
      if (!window.confirm(aviso)) {
        setOcupado(false)
        return
      }
      await setDoc(doc(db, "jogoSecreto", r.id), { roteiro: r, texto, atualizadoEm: serverTimestamp() })
      await setDoc(doc(db, "jogoPublico", r.id), { ...montarPublico(r), publicadoEm: serverTimestamp() })
      setStatus(`Temporada "${r.id}" publicada.`)
      await carregarLista()
    } catch (e) {
      setStatus("Erro ao publicar: " + e.message)
    }
    setOcupado(false)
  }

  return (
    <div>
      <div style={cartao}>
        <h2 style={titulo}>Eu Quero Ser Produtor</h2>
        <p style={{ fontSize: "14px", color: "#666", margin: "0 0 12px", lineHeight: 1.5 }}>
          Só você vê esta aba. Cole o roteiro da temporada, valide, confira a prévia e depois salve ou publique.
          Salvar guarda o roteiro em segredo. Publicar também coloca o cartaz no ar.
        </p>
        {temporadas.length > 0 ? (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {temporadas.map((t) => (
              <button key={t.id} className="btn-sair" onClick={() => abrirTemporada(t.id)}>
                {t.nome} ({t.id}){t.modoTeste ? " · teste" : ""}{t.publicada ? " · publicada" : " · rascunho"}
              </button>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Nenhuma temporada salva ainda.</p>
        )}
      </div>

      <div style={cartao}>
        <h2 style={titulo}>Roteiro</h2>
        <textarea
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setResultado(null) }}
          placeholder="Cole aqui o roteiro da temporada (texto que começa com { e termina com })"
          spellCheck={false}
          style={{ width: "100%", minHeight: "320px", fontFamily: "monospace", fontSize: "12px", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
          <button className="btn-comentar" onClick={validar} disabled={!texto.trim() || ocupado}>Validar e ver prévia</button>
          <button className="btn-sair" onClick={salvar} disabled={!valido || ocupado}>Salvar roteiro (sem publicar)</button>
          <button className="btn-sair" onClick={publicar} disabled={!valido || ocupado}>Publicar temporada</button>
        </div>
        {status && <p style={{ fontSize: "13px", fontWeight: 600, margin: "12px 0 0" }}>{status}</p>}
      </div>

      {resultado && resultado.erros.length > 0 && (
        <div style={{ ...cartao, borderColor: "#cc0000" }}>
          <h2 style={{ ...titulo, color: "#cc0000" }}>Erros ({resultado.erros.length})</h2>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", lineHeight: 1.6 }}>
            {resultado.erros.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      )}

      {resultado && resultado.avisos.length > 0 && (
        <div style={{ ...cartao, borderColor: "#F5C518", background: "#fffbe6" }}>
          <h2 style={titulo}>Avisos ({resultado.avisos.length})</h2>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "14px", lineHeight: 1.6 }}>
            {resultado.avisos.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      )}

      {previa && (
        <>
          <div style={cartao}>
            <h2 style={titulo}>Preços semana a semana (Bravos)</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: "13px", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={celulaEsq}>Musical</th>
                    <th style={celula}>Início</th>
                    {Array.from({ length: resultado.roteiro.semanas }, (_, i) => <th key={i} style={celula}>S{i + 1}</th>)}
                    <th style={celula}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {previa.precos.map((p) => (
                    <tr key={p.id}>
                      <td style={celulaEsq}>{p.titulo}</td>
                      {Array.from({ length: resultado.roteiro.semanas + 1 }, (_, w) => (
                        <td key={w} style={{ ...celula, color: (p.fechouNaSemana > 0 && p.fechouNaSemana === w) ? "#cc0000" : undefined }}>
                          {w < p.precos.length ? bravos(p.precos[w]) : ""}
                          {(p.fechouNaSemana > 0 && p.fechouNaSemana === w)? " (fecha)" : ""}
                        </td>
                      ))}
                      <td style={{ ...celula, fontWeight: 700, color: p.variacaoFinal >= 0 ? "#1a7f37" : "#cc0000" }}>{pct(p.variacaoFinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: "14px", margin: "12px 0 0" }}>
              <strong>Média do mercado no fim: {pct(previa.media)}</strong>
              {previa.media <= 0 && <span style={{ color: "#cc0000" }}> · Atenção: com média negativa, não investir rende mais que dividir igual.</span>}
            </p>
          </div>

          <div style={cartao}>
            <h2 style={titulo}>Teste de estratégias (patrimônio final)</h2>
            <table style={{ borderCollapse: "collapse", fontSize: "14px" }}>
              <tbody>
                <tr><td style={celulaEsq}>Não investir nada</td><td style={celula}>{bravos(previa.estrategias.naoInvestir)}</td></tr>
                <tr><td style={celulaEsq}>Dividir igual entre todos na abertura e não mexer</td><td style={celula}>{bravos(previa.estrategias.dividirIgual)}</td></tr>
                <tr><td style={celulaEsq}>Referência: trocar toda semana para os 2 que mais vão subir</td><td style={celula}>{bravos(previa.estrategias.teto)}</td></tr>
              </tbody>
            </table>
            {previa.estrategias.dividirIgual < previa.estrategias.naoInvestir && (
              <p style={{ fontSize: "13px", color: "#cc0000", margin: "12px 0 0" }}>
                Furo: dividir igual rende menos do que não investir. Ajuste as ocupações para a média ficar positiva.
              </p>
            )}
          </div>

          <div style={cartao}>
            <h2 style={titulo}>Fontes das manchetes</h2>
            <table style={{ borderCollapse: "collapse", fontSize: "14px" }}>
              <tbody>
                {previa.fontes.map((f) => (
                  <tr key={f.id}>
                    <td style={celulaEsq}>{f.nome}</td>
                    <td style={celula}>{f.verdadeiras} verdadeiras de {f.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={cartao}>
            <h2 style={titulo}>Calendário</h2>
            <table style={{ borderCollapse: "collapse", fontSize: "13px" }}>
              <tbody>
                {previa.eventos.map((ev, i) => (
                  <tr key={i}>
                    <td style={celulaEsq}>{dataHora(ev.quando)}</td>
                    <td style={celulaEsq}>{ev.texto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminProdutor
