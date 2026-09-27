import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { db } from "../firebase"
import { lerMusicas } from "../musicalSchema"

// ============================================================================
// PainelPendencias.jsx
// Aba "Pendências" do Admin: mostra quais musicais estão sem curiosidades,
// músicas, álbum, vídeos ou fotos, para facilitar o preenchimento.
//
// Custo: lê a coleção `musicais` inteira UMA vez, só quando o admin clica em
// "Carregar pendências". Não usa nem altera o indices/home.
//
// "Dispensar" grava o item no array `pendenciasDispensadas` do documento do
// musical. Serve para tirar da lista o que nunca vai existir (ex.: álbum de
// montagem que não foi gravada). Não muda nada na página pública.
// ============================================================================

// Fotos só contam como pendência em musicais até este ano.
const ANO_CORTE_FOTOS = 2005

const ITENS = [
  { chave: "curiosidades", rotulo: "Curiosidades" },
  { chave: "musicas", rotulo: "Músicas" },
  { chave: "album", rotulo: "Álbum" },
  { chave: "videos", rotulo: "Vídeos" },
  { chave: "fotos", rotulo: "Fotos" },
]

function normalizar(texto) {
  return (texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

// O `ano` é texto livre. Pega o primeiro número de 4 dígitos ("2003", "2003-2005").
function anoDoMusical(ano) {
  const achado = String(ano || "").match(/\d{4}/)
  return achado ? Number(achado[0]) : null
}

function temConteudo(m, chave) {
  switch (chave) {
    case "curiosidades":
      return Array.isArray(m.curiosidades) && m.curiosidades.some(c => typeof c === "string" && c.trim())
    case "musicas":
      return lerMusicas(m.musicas).length > 0
    case "album":
      return String(m.linkAlbum || "").trim() !== ""
    case "videos":
      return Array.isArray(m.videos) && m.videos.some(v => v && (typeof v === "string" ? v.trim() : v.id))
    case "fotos":
      return Array.isArray(m.galeria) && m.galeria.some(f => f && (typeof f === "string" ? f.trim() : f.url))
    default:
      return true
  }
}

// "ok" | "falta" | "na" (não se aplica). O "dispensado" é calculado depois.
function situacaoBase(m, chave) {
  if (chave === "fotos") {
    const ano = anoDoMusical(m.ano)
    if (ano !== null && ano > ANO_CORTE_FOTOS) return "na"
  }
  return temConteudo(m, chave) ? "ok" : "falta"
}

function statusDe(m, chave) {
  const base = m.base[chave]
  if (base === "falta" && m.dispensadas.includes(chave)) return "dispensado"
  return base
}

const ESTILO_CHIP = {
  ok: { background: "#eef7ee", color: "#2e7d32", border: "1px solid #cfe8cf" },
  falta: { background: "#fdecec", color: "#b3261e", border: "1px solid #f3c7c4" },
  dispensado: { background: "#f4f4f4", color: "#999", border: "1px solid #e8e8e4" },
  na: { background: "#fafafa", color: "#bbb", border: "1px solid #f0f0f0" },
}

const TEXTO_STATUS = { ok: "ok", falta: "falta", dispensado: "dispensado", na: "não se aplica" }

const estiloBotaoPequeno = {
  background: "transparent", border: "none", padding: 0, marginLeft: "8px",
  fontFamily: "var(--fonte-corpo)", fontSize: "11px", fontWeight: "600",
  color: "#555", textDecoration: "underline", cursor: "pointer",
}

function estiloFiltro(ativo) {
  return {
    background: ativo ? "#1a1a1a" : "#fff",
    color: ativo ? "#F5C518" : "#444",
    border: "1px solid " + (ativo ? "#1a1a1a" : "#e8e8e4"),
    borderRadius: "20px", padding: "6px 14px",
    fontFamily: "var(--fonte-corpo)", fontSize: "13px", fontWeight: "600", cursor: "pointer",
  }
}

export default function PainelPendencias() {
  const [musicais, setMusicais] = useState([])
  const [carregado, setCarregado] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [filtroItem, setFiltroItem] = useState("todos")
  const [busca, setBusca] = useState("")
  const [ordem, setOrdem] = useState("pendencias")
  const [mostrarDispensados, setMostrarDispensados] = useState(false)
  const [incluirArquivados, setIncluirArquivados] = useState(false)
  const [salvando, setSalvando] = useState(new Set())
  const [statusLote, setStatusLote] = useState("")

  async function carregar() {
    setCarregando(true)
    try {
      const snap = await getDocs(collection(db, "musicais"))
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(m => m.status !== "rascunho")
        .map(m => ({
          id: m.id,
          titulo: m.titulo || m.id,
          ano: m.ano || "",
          arquivado: m.arquivado === true,
          dispensadas: Array.isArray(m.pendenciasDispensadas) ? m.pendenciasDispensadas : [],
          base: Object.fromEntries(ITENS.map(i => [i.chave, situacaoBase(m, i.chave)])),
        }))
      setMusicais(lista)
      setCarregado(true)
    } catch (e) {
      console.error("Erro ao carregar pendências:", e)
      alert("Erro ao carregar os musicais. Tente novamente.")
    }
    setCarregando(false)
  }

  function aplicarDispensa(ids, chave, dispensar) {
    const conjunto = new Set(ids)
    setMusicais(prev => prev.map(m => {
      if (!conjunto.has(m.id)) return m
      const semChave = m.dispensadas.filter(c => c !== chave)
      return { ...m, dispensadas: dispensar ? [...semChave, chave] : semChave }
    }))
  }

  async function alternarDispensa(id, chave, dispensar) {
    const marca = id + "|" + chave
    setSalvando(prev => new Set(prev).add(marca))
    try {
      await updateDoc(doc(db, "musicais", id), {
        pendenciasDispensadas: dispensar ? arrayUnion(chave) : arrayRemove(chave),
      })
      aplicarDispensa([id], chave, dispensar)
    } catch (e) {
      console.error("Erro ao dispensar:", e)
      alert("Erro ao salvar. Tente novamente.")
    }
    setSalvando(prev => { const novo = new Set(prev); novo.delete(marca); return novo })
  }

  const base = useMemo(
    () => musicais.filter(m => incluirArquivados || !m.arquivado),
    [musicais, incluirArquivados]
  )

  const totais = useMemo(() => {
    const t = { todos: base.filter(m => ITENS.some(i => statusDe(m, i.chave) === "falta")).length }
    ITENS.forEach(i => { t[i.chave] = base.filter(m => statusDe(m, i.chave) === "falta").length })
    return t
  }, [base])

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    const chaves = filtroItem === "todos" ? ITENS.map(i => i.chave) : [filtroItem]
    const qtdFaltando = m => ITENS.filter(i => statusDe(m, i.chave) === "falta").length

    const lista = base
      .filter(m => !termo || normalizar(m.titulo).includes(termo))
      .filter(m => chaves.some(c => {
        const s = statusDe(m, c)
        return s === "falta" || (mostrarDispensados && s === "dispensado")
      }))

    lista.sort((a, b) =>
      ordem === "pendencias"
        ? (qtdFaltando(b) - qtdFaltando(a)) || a.titulo.localeCompare(b.titulo, "pt-BR")
        : a.titulo.localeCompare(b.titulo, "pt-BR")
    )
    return lista
  }, [base, busca, filtroItem, mostrarDispensados, ordem])

  const alvosLote = filtroItem === "todos" ? [] : visiveis.filter(m => statusDe(m, filtroItem) === "falta")

  async function dispensarEmLote() {
    if (alvosLote.length === 0) return
    const rotulo = ITENS.find(i => i.chave === filtroItem).rotulo
    if (!window.confirm(`Dispensar "${rotulo}" de ${alvosLote.length} musicais listados? Dá para desfazer um por um depois, marcando "mostrar dispensados".`)) return

    const chave = filtroItem
    const feitos = []
    let erros = 0
    for (let i = 0; i < alvosLote.length; i += 20) {
      const bloco = alvosLote.slice(i, i + 20)
      setStatusLote(`Dispensando... ${i} de ${alvosLote.length}`)
      const resultados = await Promise.allSettled(
        bloco.map(m => updateDoc(doc(db, "musicais", m.id), { pendenciasDispensadas: arrayUnion(chave) }))
      )
      resultados.forEach((r, idx) => {
        if (r.status === "fulfilled") feitos.push(bloco[idx].id)
        else erros++
      })
    }
    aplicarDispensa(feitos, chave, true)
    setStatusLote(erros ? `${feitos.length} dispensados, ${erros} com erro. Tente de novo.` : `${feitos.length} dispensados.`)
    setTimeout(() => setStatusLote(""), 5000)
  }

  return (
    <div>
      <div style={{ background: "#fffbe6", border: "1px solid #F5C518", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "220px" }}>
          <p style={{ fontSize: "14px", fontWeight: "700", margin: "0 0 2px" }}>Pendências de conteúdo</p>
          <p style={{ fontSize: "13px", color: "#666", margin: 0, lineHeight: "1.4" }}>
            Musicais sem curiosidades, músicas, álbum, vídeos ou fotos. Fotos só contam para musicais até {ANO_CORTE_FOTOS}.
            O título abre em nova aba; depois de preencher, clique em Recarregar para atualizar a lista.
          </p>
        </div>
        <button className="btn-comentar" onClick={carregar} disabled={carregando}>
          {carregando ? "Carregando..." : carregado ? "Recarregar" : "Carregar pendências"}
        </button>
      </div>

      {carregado && (
        <>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <button onClick={() => setFiltroItem("todos")} style={estiloFiltro(filtroItem === "todos")}>
              Todos ({totais.todos})
            </button>
            {ITENS.map(i => (
              <button key={i.chave} onClick={() => setFiltroItem(i.chave)} style={estiloFiltro(filtroItem === i.chave)}>
                Sem {i.rotulo.toLowerCase()} ({totais[i.chave]})
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" }}>
            <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar musical..."
              style={{ flex: 1, minWidth: "180px", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "var(--fonte-corpo)", fontSize: "14px", outline: "none" }} />
            <select value={ordem} onChange={e => setOrdem(e.target.value)}
              style={{ padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "var(--fonte-corpo)", fontSize: "14px", background: "#fff" }}>
              <option value="pendencias">Mais pendências primeiro</option>
              <option value="alfabetica">Ordem alfabética</option>
            </select>
            <label style={{ fontSize: "13px", color: "#555", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" checked={mostrarDispensados} onChange={e => setMostrarDispensados(e.target.checked)} />
              Mostrar dispensados
            </label>
            <label style={{ fontSize: "13px", color: "#555", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="checkbox" checked={incluirArquivados} onChange={e => setIncluirArquivados(e.target.checked)} />
              Incluir arquivados
            </label>
          </div>

          {alvosLote.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <button className="btn-sair" onClick={dispensarEmLote}>
                Dispensar {ITENS.find(i => i.chave === filtroItem).rotulo.toLowerCase()} dos {alvosLote.length} listados
              </button>
            </div>
          )}
          {statusLote && <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>{statusLote}</p>}

          <p style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>
            {visiveis.length} {visiveis.length === 1 ? "musical listado" : "musicais listados"}
          </p>

          {visiveis.length === 0 ? (
            <p style={{ color: "#888" }}>Nada pendente com esse filtro.</p>
          ) : (
            visiveis.map(m => (
              <div key={m.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "14px 16px", marginBottom: "10px" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                  <Link to={`/musical/${m.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: "var(--fonte-titulo)", fontSize: "16px", fontWeight: "700", color: "#1a1a1a", textDecoration: "none" }}>
                    {m.titulo}
                  </Link>
                  {m.ano && <span style={{ fontSize: "13px", color: "#888" }}>{m.ano}</span>}
                  {m.arquivado && (
                    <span style={{ fontSize: "11px", fontWeight: "600", color: "#cc7a00", background: "#fff3e0", borderRadius: "4px", padding: "2px 6px" }}>arquivado</span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {ITENS.map(i => {
                    const s = statusDe(m, i.chave)
                    const ocupado = salvando.has(m.id + "|" + i.chave)
                    return (
                      <span key={i.chave} style={{ ...ESTILO_CHIP[s], borderRadius: "20px", padding: "4px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center" }}>
                        <span style={s === "dispensado" ? { textDecoration: "line-through" } : undefined}>
                          {i.rotulo}: {TEXTO_STATUS[s]}
                        </span>
                        {s === "falta" && (
                          <button disabled={ocupado} onClick={() => alternarDispensa(m.id, i.chave, true)} style={estiloBotaoPequeno}>
                            {ocupado ? "..." : "dispensar"}
                          </button>
                        )}
                        {s === "dispensado" && (
                          <button disabled={ocupado} onClick={() => alternarDispensa(m.id, i.chave, false)} style={estiloBotaoPequeno}>
                            {ocupado ? "..." : "desfazer"}
                          </button>
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}