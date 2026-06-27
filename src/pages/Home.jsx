import { useEffect, useState, useRef, useCallback } from "react"
import { collection, getDocs, getDoc, doc, setDoc, deleteDoc, addDoc, serverTimestamp, updateDoc, increment } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useNavigate, useSearchParams } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import CardMusical from "../components/CardMusical"

const normalizar = (texto) =>
  texto?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ?? ""


function Home() {
  const [musicais, setMusicais] = useState([])
  const [destaques, setDestaques] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()
  const [buscaInput, setBuscaInput] = useState(searchParams.get("q") || "")
  const [busca, setBusca] = useState(searchParams.get("q") || "")
  const [ordenacao, setOrdenacao] = useState(searchParams.get("ordem") || "az")
  const [filtroAno, setFiltroAno] = useState(searchParams.get("ano") || "")
  const [ocultarVistos, setOcultarVistos] = useState(false)
  const [usuario, setUsuario] = useState(null)
  const [queroVerSet, setQueroVerSet] = useState(new Set())
  const [jaViSet, setJaViSet] = useState(new Set())
  const [visiveis, setVisiveis] = useState(24)
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)

  const [listas, setListas] = useState([])
  const [musicaisNasListas, setMusicaisNasListas] = useState({})
  const [dropdownListasAberto, setDropdownListasAberto] = useState(null)

  const carrosselRef = useRef(null)
const [podePrev, setPodePrev] = useState(false)
const [podeNext, setPodeNext] = useState(true)

const carrosselDestaquesRef = useRef(null)
const [podeDestPrev, setPodeDestPrev] = useState(false)
const [podeDestNext, setPodeDestNext] = useState(true)

  const [contatoMensagem, setContatoMensagem] = useState("")
  const [contatoEnviando, setContatoEnviando] = useState(false)
  const [contatoEnviado, setContatoEnviado] = useState(false)

  function mostrarToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function atualizarBotoes() {
    const el = carrosselRef.current
    if (!el) return
    setPodePrev(el.scrollLeft > 4)
    setPodeNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }
function atualizarBotoesDestaques() {
  const el = carrosselDestaquesRef.current
  if (!el) return
  setPodeDestPrev(el.scrollLeft > 4)
  setPodeDestNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
}

function scrollDestaques(direcao) {
  const el = carrosselDestaquesRef.current
  if (!el) return
  el.scrollBy({ left: direcao * 156 * 3, behavior: "smooth" })
  setTimeout(atualizarBotoesDestaques, 350)
}
  function scrollCarrossel(direcao) {
    const el = carrosselRef.current
    if (!el) return
    el.scrollBy({ left: direcao * 156 * 3, behavior: "smooth" })
    setTimeout(atualizarBotoes, 350)
  }

  useEffect(() => {
    const timer = setTimeout(() => { setBusca(buscaInput); setVisiveis(24) }, 300)
    return () => clearTimeout(timer)
  }, [buscaInput])

  useEffect(() => {
    const params = {}
    if (busca) params.q = busca
    if (ordenacao !== "az") params.ordem = ordenacao
    if (filtroAno) params.ano = filtroAno
    setSearchParams(params, { replace: true })
  }, [busca, ordenacao, filtroAno])

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      setUsuario(user)
      if (user) {
        buscarQueroVer(user.uid)
        buscarJaVi(user.uid)
        buscarListas(user.uid)
      } else {
        setQueroVerSet(new Set())
        setJaViSet(new Set())
        setOcultarVistos(false)
        setListas([])
        setMusicaisNasListas({})
      }
    })
  }, [])

  async function buscarQueroVer(uid) {
    const snap = await getDocs(collection(db, "usuarios", uid, "queroVer"))
    setQueroVerSet(new Set(snap.docs.map(d => d.id)))
  }

  async function buscarJaVi(uid) {
    const snap = await getDocs(collection(db, "usuarios", uid, "jaVi"))
    setJaViSet(new Set(snap.docs.map(d => d.id)))
  }

  async function buscarListas(uid) {
    const snap = await getDocs(collection(db, "usuarios", uid, "listas"))
    const listasDados = snap.docs.map(d => ({ id: d.id, nome: d.data().nome }))
    setListas(listasDados)
    const mapa = {}
    for (const lista of listasDados) {
      const itensSnap = await getDocs(collection(db, "usuarios", uid, "listas", lista.id, "itens"))
      itensSnap.docs.forEach(d => {
        if (!mapa[d.id]) mapa[d.id] = new Set()
        mapa[d.id].add(lista.id)
      })
    }
    setMusicaisNasListas(mapa)
  }

  useEffect(() => {
    async function buscarMusicais() {
      try {
        const indiceSnap = await getDoc(doc(db, "indices", "home"))
        if (indiceSnap.exists() && Array.isArray(indiceSnap.data().itens)) {
          const lista = indiceSnap.data().itens.map(m => ({ ...m, id: m.id, dataCriacao: m.dataCriacao || null }))
          setMusicais(lista)
          setDestaques(lista.filter(m => m.destaque === true).slice(0, 10))
          setCarregando(false)
          return
        }
      } catch (e) {}
      const snapshot = await getDocs(collection(db, "musicais"))
      const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setMusicais(lista)
      setDestaques(lista.filter(m => m.destaque === true).slice(0, 10))
      setCarregando(false)
    }
    buscarMusicais()
  }, [])

  useEffect(() => { atualizarBotoes(); atualizarBotoesDestaques() }, [musicais])

  // Fecha o dropdown se clicar fora — mas ignora cliques no botão "+ Listas"
  useEffect(() => {
    if (!dropdownListasAberto) return
    function handler(e) {
      if (e.target.closest("[data-listas-dropdown]")) return
      if (e.target.closest(`[data-btn-listas="${dropdownListasAberto}"]`)) return
      setDropdownListasAberto(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [dropdownListasAberto])

  const handleToggleQueroVer = useCallback(async (e, musical) => {
    e.preventDefault(); e.stopPropagation()
    if (!usuario) return mostrarToast("Faça login para usar esta função.")
    const refQueroVer = doc(db, "usuarios", usuario.uid, "queroVer", musical.id)
    const refJaVi = doc(db, "usuarios", usuario.uid, "jaVi", musical.id)
    const mRef = doc(db, "musicais", musical.id)
    if (queroVerSet.has(musical.id)) {
      await deleteDoc(refQueroVer)
      try { await updateDoc(mRef, { popularidade: increment(-1) }) } catch (err) { console.error("popularidade", err) }
      setQueroVerSet(prev => { const next = new Set(prev); next.delete(musical.id); return next })
    } else {
      const entrandoNaContagem = !jaViSet.has(musical.id)
      await setDoc(refQueroVer, { musicalId: musical.id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" })
      await deleteDoc(refJaVi)
      if (entrandoNaContagem) {
        try { await updateDoc(mRef, { popularidade: increment(1) }) } catch (err) { console.error("popularidade", err) }
      }
      setQueroVerSet(prev => new Set(prev).add(musical.id))
      setJaViSet(prev => { const next = new Set(prev); next.delete(musical.id); return next })
    }
  }, [usuario, queroVerSet, jaViSet])

  const handleToggleJaVi = useCallback(async (e, musical) => {
    e.preventDefault(); e.stopPropagation()
    if (!usuario) return mostrarToast("Faça login para usar esta função.")
    const refJaVi = doc(db, "usuarios", usuario.uid, "jaVi", musical.id)
    const refQueroVer = doc(db, "usuarios", usuario.uid, "queroVer", musical.id)
    const mRef = doc(db, "musicais", musical.id)
    if (jaViSet.has(musical.id)) {
      await deleteDoc(refJaVi)
      try { await updateDoc(mRef, { popularidade: increment(-1) }) } catch (err) { console.error("popularidade", err) }
      setJaViSet(prev => { const next = new Set(prev); next.delete(musical.id); return next })
    } else {
      const entrandoNaContagem = !queroVerSet.has(musical.id)
      await setDoc(refJaVi, { musicalId: musical.id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" })
      await deleteDoc(refQueroVer)
      if (entrandoNaContagem) {
        try { await updateDoc(mRef, { popularidade: increment(1) }) } catch (err) { console.error("popularidade", err) }
      }
      setJaViSet(prev => new Set(prev).add(musical.id))
      setQueroVerSet(prev => { const next = new Set(prev); next.delete(musical.id); return next })
    }
  }, [usuario, jaViSet, queroVerSet])

  const handleAbrirDropdown = useCallback((e, musicalId) => {
    e.preventDefault(); e.stopPropagation()
    if (!usuario) return mostrarToast("Faça login para usar listas.")
    setDropdownListasAberto(prev => prev === musicalId ? null : musicalId)
  }, [usuario])

  const handleToggleNaLista = useCallback(async (e, musical, listaId) => {
    e.preventDefault(); e.stopPropagation()
    const ref = doc(db, "usuarios", usuario.uid, "listas", listaId, "itens", musical.id)
    const jaEsta = musicaisNasListas[musical.id]?.has(listaId)
    if (jaEsta) {
      await deleteDoc(ref)
      setMusicaisNasListas(prev => {
        const novo = { ...prev }
        const set = new Set(novo[musical.id])
        set.delete(listaId)
        novo[musical.id] = set
        return novo
      })
    } else {
      await setDoc(ref, { musicalId: musical.id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "", adicionadoEm: serverTimestamp() })
      setMusicaisNasListas(prev => {
        const novo = { ...prev }
        const set = new Set(novo[musical.id] || [])
        set.add(listaId)
        novo[musical.id] = set
        return novo
      })
    }
  }, [usuario, musicaisNasListas])

  const handleCriarLista = useCallback(async (e, musical, nome, onDone) => {
    e.preventDefault(); e.stopPropagation()
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) return
    const listaRef = await addDoc(collection(db, "usuarios", usuario.uid, "listas"), { nome: nomeLimpo, criadaEm: serverTimestamp() })
    const listaId = listaRef.id
    await setDoc(doc(db, "usuarios", usuario.uid, "listas", listaId, "itens", musical.id), {
      musicalId: musical.id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "", adicionadoEm: serverTimestamp()
    })
    setListas(prev => [...prev, { id: listaId, nome: nomeLimpo }])
    setMusicaisNasListas(prev => {
      const novo = { ...prev }
      const set = new Set(novo[musical.id] || [])
      set.add(listaId)
      novo[musical.id] = set
      return novo
    })
    onDone()
    mostrarToast(`Adicionado a "${nomeLimpo}"`)
  }, [usuario])

  async function enviarContato(e) {
    e.preventDefault()
    if (!usuario || !contatoMensagem.trim()) return
    setContatoEnviando(true)
    try {
      await addDoc(collection(db, "mensagens"), { nome: usuario.displayName || "", email: usuario.email || "", mensagem: contatoMensagem.trim(), userId: usuario.uid, data: serverTimestamp(), lida: false })
      setContatoEnviado(true); setContatoMensagem("")
    } catch (err) { mostrarToast("Erro ao enviar mensagem. Tente novamente.") }
    setContatoEnviando(false)
  }

  const anos = [...new Set(musicais.map(m => m.ano).filter(Boolean))].sort((a, b) => b - a)
  const destaquesIds = new Set(destaques.map(m => m.id))
  const recentesIds = [...musicais].filter(m => !destaquesIds.has(m.id)).sort((a, b) => (b.dataCriacao?.seconds || 0) - (a.dataCriacao?.seconds || 0))
  const idsExcluidos = new Set([...destaquesIds])

  const musicaisFiltrados = musicais
    .filter(m => !idsExcluidos.has(m.id))
    .filter(musical => {
      const termo = normalizar(busca)
      const campos = [musical.titulo, musical.elenco, musical.elencoAdicional, musical.direcao, musical.direcaoMusical, musical.producao, musical.versionista, musical.textoOriginal, musical.musicaOriginal]
      const nomesEquipe = (musical.equipeCriativa || []).flatMap(item => item.nomes || [])
      const nomesMusicos = (musical.musicos || []).flatMap(item => item.nomes || [])
      return [...campos, ...nomesEquipe, ...nomesMusicos].some(c => normalizar(c).includes(termo)) && (filtroAno === "" || musical.ano === filtroAno)
    })
    .filter(musical => !ocultarVistos || !jaViSet.has(musical.id))
    .map(musical => ({ ...musical, media: musical.totalVotos > 0 ? musical.somaEstrelas / musical.totalVotos : 0 }))
    .sort((a, b) => {
      if (ordenacao === "melhor") return b.media - a.media
      if (ordenacao === "pior") return a.media - b.media
      if (ordenacao === "mais-votados") return b.totalVotos - a.totalVotos
      if (ordenacao === "menos-votados") return a.totalVotos - b.totalVotos
      if (ordenacao === "az") return a.titulo.localeCompare(b.titulo, "pt")
      if (ordenacao === "za") return b.titulo.localeCompare(a.titulo, "pt")
      if (ordenacao === "recentes") return (b.dataCriacao?.seconds || 0) - (a.dataCriacao?.seconds || 0)
      if (ordenacao === "antigos") return (a.dataCriacao?.seconds || 0) - (b.dataCriacao?.seconds || 0)
      return 0
    })

  const musicaisVisiveis = musicaisFiltrados.slice(0, visiveis)
  const temMais = visiveis < musicaisFiltrados.length

  const cardProps = { usuario, jaViSet, queroVerSet, listas, musicaisNasListas, onToggleJaVi: handleToggleJaVi, onToggleQueroVer: handleToggleQueroVer, onAbrirDropdown: handleAbrirDropdown, onToggleNaLista: handleToggleNaLista, onCriarLista: handleCriarLista }

  return (
    <main>
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#F5C518", padding: "12px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: "500", zIndex: 999, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}
      <p className="section-label">Musical Cast Database</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px", margin: "8px 0 4px" }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "64px", fontWeight: "700", color: "#F5C518", lineHeight: "1" }}>{musicais.length}</span>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: "700", margin: 0, lineHeight: "1.2" }}>musicais brasileiros<br />catalogados</h1>
      </div>
      <p style={{ fontSize: "15px", color: "#888", marginTop: "8px", marginBottom: "16px" }}>O maior arquivo digital colaborativo do teatro musical brasileiro.</p>
      <div style={{ marginBottom: "32px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button className="btn-comentar" onClick={() => navigate("/sugestao")}>+ Sugerir um musical</button>
        <button className="btn-comentar" onClick={() => navigate("/contribuir")} style={{ background: "transparent", color: "#1a1a1a", border: "2px solid #1a1a1a" }}>$ Contribuir</button>
      </div>

      {destaques.length > 0 && (
  <div style={{ marginBottom: "40px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
      <p style={{ fontSize: "14px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1.5px", margin: 0 }}>EM CARTAZ</p>
      <div style={{ display: "flex", gap: "6px" }}>
        <button onClick={() => scrollDestaques(-1)} disabled={!podeDestPrev} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #e8e8e4", background: podeDestPrev ? "#1a1a1a" : "#f5f5f5", color: podeDestPrev ? "#F5C518" : "#ccc", fontSize: "14px", fontWeight: "700", cursor: podeDestPrev ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }} aria-label="Anterior">‹</button>
        <button onClick={() => scrollDestaques(1)} disabled={!podeDestNext} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #e8e8e4", background: podeDestNext ? "#1a1a1a" : "#f5f5f5", color: podeDestNext ? "#F5C518" : "#ccc", fontSize: "14px", fontWeight: "700", cursor: podeDestNext ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }} aria-label="Próximo">›</button>
      </div>
    </div>
    <div ref={carrosselDestaquesRef} onScroll={atualizarBotoesDestaques} style={{ display: "flex", gap: "16px", overflowX: "auto", overflowY: "visible", paddingBottom: "8px", scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}>
      {destaques.map(m => <div key={m.id} style={{ scrollSnapAlign: "start", flexShrink: 0 }}><CardMusical musical={m} tamanho="pequeno" dropdownAberto={dropdownListasAberto === m.id} {...cardProps} /></div>)}
    </div>
  </div>
)}

      {recentesIds.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontSize: "14px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1.5px", margin: 0 }}>Recém adicionados</p>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => scrollCarrossel(-1)} disabled={!podePrev} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #e8e8e4", background: podePrev ? "#1a1a1a" : "#f5f5f5", color: podePrev ? "#F5C518" : "#ccc", fontSize: "14px", fontWeight: "700", cursor: podePrev ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }} aria-label="Anterior">‹</button>
              <button onClick={() => scrollCarrossel(1)} disabled={!podeNext} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #e8e8e4", background: podeNext ? "#1a1a1a" : "#f5f5f5", color: podeNext ? "#F5C518" : "#ccc", fontSize: "14px", fontWeight: "700", cursor: podeNext ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }} aria-label="Próximo">›</button>
            </div>
          </div>
          <div ref={carrosselRef} onScroll={atualizarBotoes} style={{ display: "flex", gap: "16px", overflowX: "auto", overflowY: "visible", paddingBottom: "8px", scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}>
            {recentesIds.map(m => <div key={m.id} style={{ scrollSnapAlign: "start", flexShrink: 0 }}><CardMusical musical={m} tamanho="pequeno" dropdownAberto={dropdownListasAberto === m.id} {...cardProps} /></div>)}
          </div>
        </div>
      )}

      <hr className="divider" />

      <div style={{ display: "flex", gap: "12px", margin: "24px 0", flexWrap: "wrap" }}>
        <input type="text" placeholder="Buscar musical ou pessoa..." value={buscaInput} onChange={e => setBuscaInput(e.target.value)}
          style={{ flex: 1, minWidth: "200px", padding: "12px 16px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "11px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>Organizar por</label>
          <select value={ordenacao} onChange={e => { setOrdenacao(e.target.value); setVisiveis(24) }} style={{ padding: "12px 16px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", background: "#fff", cursor: "pointer", outline: "none" }}>
            <option value="az">A → Z</option><option value="za">Z → A</option>
            <option value="recentes">Adicionados recentemente</option><option value="antigos">Adicionados anteriormente</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "11px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>Ano</label>
          <select value={filtroAno} onChange={e => { setFiltroAno(e.target.value); setVisiveis(24) }} style={{ padding: "12px 16px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", background: "#fff", cursor: "pointer", outline: "none" }}>
            <option value="">Todos os anos</option>
            {anos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
          </select>
        </div>
        {usuario && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>Vistos</label>
            <button onClick={() => { setOcultarVistos(v => !v); setVisiveis(24) }} style={{ padding: "12px 16px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", cursor: "pointer", background: ocultarVistos ? "#b8960a" : "#fff", color: ocultarVistos ? "#fff" : "#1a1a1a", fontWeight: ocultarVistos ? "600" : "400", whiteSpace: "nowrap", transition: "background 0.15s, color 0.15s" }}>
              {ocultarVistos ? "✓ Não vi ainda" : "Não vi ainda"}
            </button>
          </div>
        )}
      </div>

      <div className="grid-musicais" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
        {carregando ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ borderRadius: "12px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.2s infinite", aspectRatio: "2/3" }} />
          ))
        ) : musicaisVisiveis.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", padding: "40px 0", textAlign: "center" }}>
            <p style={{ fontSize: "32px", marginBottom: "8px" }}>🎭</p>
            <p style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>
              {ocultarVistos && busca === "" && filtroAno === "" ? "Você já viu todos os musicais!" : `Nenhum resultado para "${busca}"`}
            </p>
            <p style={{ fontSize: "14px", color: "#888" }}>
              {ocultarVistos && busca === "" && filtroAno === "" ? "Que tal explorar mais musicais ou sugerir um novo?" : "Tente outro nome, diretor ou membro do elenco."}
            </p>
          </div>
        ) : (
          musicaisVisiveis.map(m => <CardMusical key={m.id} musical={m} dropdownAberto={dropdownListasAberto === m.id} {...cardProps} />)
        )}
      </div>

      {temMais && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: "40px" }}>
          <button onClick={() => setVisiveis(v => v + 24)} style={{ padding: "12px 32px", border: "1px solid #e8e8e4", borderRadius: "8px", background: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", cursor: "pointer", color: "#1a1a1a", fontWeight: "500" }}>
            Carregar mais ({musicaisFiltrados.length - visiveis} restantes)
          </button>
        </div>
      )}

      <div style={{ marginTop: "64px", padding: "48px 0", borderTop: "1px solid #e8e8e4" }}>
        <p style={{ fontSize: "14px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px" }}>Fale com a gente</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: "700", margin: "0 0 8px" }}>Tem algo a dizer?</h2>
        <p style={{ fontSize: "15px", color: "#888", marginBottom: "32px" }}>Sugestões, correções, parcerias ou só um oi — a gente lê tudo.</p>
        {!usuario ? (
          <div style={{ background: "#f9f9f9", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "32px", textAlign: "center", maxWidth: "560px" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>🔒</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>Faça login para enviar uma mensagem</p>
            <p style={{ fontSize: "14px", color: "#888" }}>Isso ajuda a evitar spam e mensagens anônimas.</p>
          </div>
        ) : contatoEnviado ? (
          <div style={{ background: "#f9f9f9", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "32px", textAlign: "center", maxWidth: "560px" }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>✉️</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>Mensagem enviada!</p>
            <p style={{ fontSize: "14px", color: "#888", marginBottom: "20px" }}>Obrigado por entrar em contato. Retornaremos em breve.</p>
            <button onClick={() => setContatoEnviado(false)} style={{ padding: "10px 24px", border: "1px solid #e8e8e4", borderRadius: "8px", background: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer", color: "#1a1a1a" }}>Enviar outra mensagem</button>
          </div>
        ) : (
          <div style={{ maxWidth: "560px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: "1px" }}>Mensagem <span style={{ color: "#cc0000" }}>*</span></label>
              <textarea placeholder="Escreva sua mensagem..." value={contatoMensagem} onChange={e => setContatoMensagem(e.target.value)} rows={5}
                style={{ padding: "12px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none", resize: "vertical", lineHeight: "1.5" }} />
            </div>
            <div>
              <button onClick={enviarContato} disabled={contatoEnviando || !contatoMensagem.trim()}
                style={{ padding: "12px 28px", background: contatoEnviando || !contatoMensagem.trim() ? "#ccc" : "#1a1a1a", color: "#fff", border: "none", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: "600", cursor: contatoEnviando || !contatoMensagem.trim() ? "not-allowed" : "pointer", transition: "background 0.15s" }}>
                {contatoEnviando ? "Enviando..." : "Enviar mensagem"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default Home
