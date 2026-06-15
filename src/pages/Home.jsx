import { useEffect, useState, useRef } from "react"
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useNavigate, useSearchParams } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"

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
  const [ultimosComentarios, setUltimosComentarios] = useState([])
  const navigate = useNavigate()
  const [toast, setToast] = useState(null)

  const carrosselRef = useRef(null)
  const [podePrev, setPodePrev] = useState(false)
  const [podeNext, setPodeNext] = useState(true)

  // Fale com a gente
  const [contatoNome, setContatoNome] = useState("")
  const [contatoEmail, setContatoEmail] = useState("")
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

  function scrollCarrossel(direcao) {
    const el = carrosselRef.current
    if (!el) return
    const larguraCard = 156
    el.scrollBy({ left: direcao * larguraCard * 3, behavior: "smooth" })
    setTimeout(atualizarBotoes, 350)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setBusca(buscaInput)
      setVisiveis(24)
    }, 300)
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
      } else {
        setQueroVerSet(new Set())
        setJaViSet(new Set())
        setOcultarVistos(false)
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

  useEffect(() => {
    async function buscarMusicais() {
      const snapshot = await getDocs(collection(db, "musicais"))
      const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setMusicais(lista)
      setDestaques(lista.filter(m => m.destaque === true).slice(0, 10))
      setCarregando(false)
    }
    buscarMusicais()
  }, [])

  useEffect(() => {
    async function buscarComentarios() {
      try {
        const q = query(collection(db, "comentarios"), orderBy("data", "desc"), limit(15))
        const snap = await getDocs(q)
        setUltimosComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {
        setUltimosComentarios([])
      }
    }
    buscarComentarios()
  }, [])

  useEffect(() => {
    atualizarBotoes()
  }, [musicais])

  async function toggleQueroVer(e, musical) {
    e.preventDefault()
    e.stopPropagation()
    if (!usuario) return mostrarToast("Faça login para usar esta função.")
    const ref = doc(db, "usuarios", usuario.uid, "queroVer", musical.id)
    if (queroVerSet.has(musical.id)) {
      await deleteDoc(ref)
      setQueroVerSet(prev => { const next = new Set(prev); next.delete(musical.id); return next })
    } else {
      await setDoc(ref, {
        musicalId: musical.id,
        titulo: musical.titulo,
        capa: musical.capa || null,
        direcao: musical.direcao || ""
      })
      setQueroVerSet(prev => new Set(prev).add(musical.id))
    }
  }

  async function toggleJaVi(e, musical) {
    e.preventDefault()
    e.stopPropagation()
    if (!usuario) return alert("Faça login para usar esta função.")
    const refJaVi = doc(db, "usuarios", usuario.uid, "jaVi", musical.id)
    const refQueroVer = doc(db, "usuarios", usuario.uid, "queroVer", musical.id)
    if (jaViSet.has(musical.id)) {
      await deleteDoc(refJaVi)
      setJaViSet(prev => { const next = new Set(prev); next.delete(musical.id); return next })
    } else {
      await setDoc(refJaVi, {
        musicalId: musical.id,
        titulo: musical.titulo,
        capa: musical.capa || null,
        direcao: musical.direcao || ""
      })
      await deleteDoc(refQueroVer)
      setJaViSet(prev => new Set(prev).add(musical.id))
      setQueroVerSet(prev => { const next = new Set(prev); next.delete(musical.id); return next })
    }
  }

  async function enviarContato(e) {
    e.preventDefault()
    if (!contatoNome.trim() || !contatoMensagem.trim()) return
    setContatoEnviando(true)
    try {
      await addDoc(collection(db, "mensagens"), {
        nome: contatoNome.trim(),
        email: contatoEmail.trim(),
        mensagem: contatoMensagem.trim(),
        userId: usuario?.uid || null,
        data: serverTimestamp(),
        lida: false
      })
      setContatoEnviado(true)
      setContatoNome("")
      setContatoEmail("")
      setContatoMensagem("")
    } catch (err) {
      mostrarToast("Erro ao enviar mensagem. Tente novamente.")
    }
    setContatoEnviando(false)
  }

  const anos = [...new Set(musicais.map(m => m.ano).filter(Boolean))].sort((a, b) => b - a)
  const destaquesIds = new Set(destaques.map(m => m.id))
  const recentesIds = [...musicais]
    .filter(m => !destaquesIds.has(m.id))
    .sort((a, b) => (b.dataCriacao?.seconds || 0) - (a.dataCriacao?.seconds || 0))
  const idsExcluidos = new Set([...destaquesIds])

  const musicaisFiltrados = musicais
    .filter(m => !idsExcluidos.has(m.id))
    .filter(musical => {
      const termo = normalizar(busca)
      const campos = [
        musical.titulo, musical.elenco, musical.elencoAdicional,
        musical.direcao, musical.direcaoMusical, musical.producao,
        musical.versionista, musical.textoOriginal, musical.musicaOriginal
      ]
      return (
        campos.some(c => normalizar(c).includes(termo)) &&
        (filtroAno === "" || musical.ano === filtroAno)
      )
    })
    .filter(musical => !ocultarVistos || !jaViSet.has(musical.id))
    .map(musical => ({
      ...musical,
      media: musical.totalVotos > 0 ? musical.somaEstrelas / musical.totalVotos : 0
    }))
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

  function CardMusical({ musical, tamanho = "normal" }) {
    const [hovered, setHovered] = useState(false)
    const media = musical.totalVotos > 0
      ? (musical.somaEstrelas / musical.totalVotos).toFixed(1)
      : "—"

    if (tamanho === "pequeno") {
      return (
        <a
          href={"/musical/" + musical.id}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "140px",
            flexShrink: 0
          }}
        >
          <div style={{ width: "140px", height: "200px", marginBottom: "10px", borderRadius: "6px", overflow: "hidden" }}>
            {musical.capa
              ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{musical.titulo}</div>
            }
          </div>
          <div style={{ width: "100%" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: "600", fontSize: "13px", margin: "0 0 4px", lineHeight: "1.3" }}>{musical.titulo}</p>
            <div className="rating-badge">★ {media}</div>
          </div>
        </a>
      )
    }

    return (
      <a
        href={"/musical/" + musical.id}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          background: "#fff",
          border: hovered ? "1px solid #F5C518" : "1px solid #e8e8e4",
          borderRadius: "12px",
          overflow: "hidden",
          transition: "border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.06)",
          position: "relative"
        }}
      >
        <div style={{ width: "100%", aspectRatio: "2/3", position: "relative", overflow: "hidden" }}>
          {musical.capa
            ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#F5C518", fontSize: "12px", padding: "12px", textAlign: "center" }}>{musical.titulo}</div>
          }

          {usuario && (
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
              padding: "24px 10px 10px",
              display: "flex", gap: "6px", justifyContent: "center",
              opacity: hovered ? 1 : 0,
              transition: "opacity 0.2s ease"
            }}>
              <button
                onClick={e => toggleJaVi(e, musical)}
                style={{
                  background: jaViSet.has(musical.id) ? "#F5C518" : "rgba(255,255,255,0.15)",
                  border: jaViSet.has(musical.id) ? "none" : "1px solid rgba(255,255,255,0.4)",
                  borderRadius: "20px",
                  padding: "5px 12px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: jaViSet.has(musical.id) ? "#1a1a1a" : "#fff",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)"
                }}
              >
                {jaViSet.has(musical.id) ? "✓ Já vi" : "Já vi"}
              </button>
              <button
                onClick={e => toggleQueroVer(e, musical)}
                style={{
                  background: queroVerSet.has(musical.id) ? "#F5C518" : "rgba(255,255,255,0.15)",
                  border: queroVerSet.has(musical.id) ? "none" : "1px solid rgba(255,255,255,0.4)",
                  borderRadius: "20px",
                  padding: "5px 12px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: queroVerSet.has(musical.id) ? "#1a1a1a" : "#fff",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)"
                }}
              >
                {queroVerSet.has(musical.id) ? "★ Quero ver" : "☆ Quero ver"}
              </button>
            </div>
          )}
        </div>

        <div style={{ padding: "10px 12px 12px" }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: "700", fontSize: "14px", margin: "0 0 3px", lineHeight: "1.3", color: "#1a1a1a" }}>{musical.titulo}</p>
          <p style={{ fontSize: "12px", color: "#888", margin: "0 0 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{musical.direcao || "—"}</p>
          <div className="rating-badge" style={{ fontSize: "14px", padding: "4px 10px" }}>
            ★ {media}
            <span className="rating-votos" style={{ fontSize: "11px" }}>
              ({musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"})
            </span>
          </div>
        </div>
      </a>
    )
  }

  return (
    <main>
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          background: "#1a1a1a", color: "#F5C518", padding: "12px 24px",
          borderRadius: "8px", fontSize: "14px", fontWeight: "500",
          zIndex: 999, boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {toast}
        </div>
      )}
      <p className="section-label">Musicais Brasileiros Database</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: "12px", margin: "8px 0 4px" }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "64px", fontWeight: "700", color: "#F5C518", lineHeight: "1" }}>
          {musicais.length}
        </span>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: "700", margin: 0, lineHeight: "1.2" }}>
          musicais brasileiros<br />catalogados
        </h1>
      </div>
      <p style={{ fontSize: "14px", color: "#888", marginTop: "8px", marginBottom: "16px" }}>
        O maior arquivo colaborativo do teatro musical brasileiro.
      </p>

      <div style={{ marginBottom: "32px" }}>
        <button className="btn-comentar" onClick={() => navigate("/sugestao")}>
          + Sugerir um musical
        </button>
      </div>

      {/* ── EM CARTAZ ── */}
      {destaques.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "12px" }}>
            EM CARTAZ
          </p>
          <div style={{
            display: "flex", gap: "16px", overflowX: "auto",
            paddingBottom: "8px", scrollbarWidth: "none", msOverflowStyle: "none"
          }}>
            {destaques.map(musical => (
              <CardMusical key={musical.id} musical={musical} tamanho="pequeno" />
            ))}
          </div>
        </div>
      )}

      {/* ── RECÉM ADICIONADOS ── */}
      {recentesIds.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ fontSize: "14px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1.5px", margin: 0 }}>
              Recém adicionados
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => scrollCarrossel(-1)} disabled={!podePrev} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #e8e8e4", background: podePrev ? "#1a1a1a" : "#f5f5f5", color: podePrev ? "#F5C518" : "#ccc", fontSize: "14px", fontWeight: "700", cursor: podePrev ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s, color 0.15s", lineHeight: 1 }} aria-label="Anterior">‹</button>
              <button onClick={() => scrollCarrossel(1)} disabled={!podeNext} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #e8e8e4", background: podeNext ? "#1a1a1a" : "#f5f5f5", color: podeNext ? "#F5C518" : "#ccc", fontSize: "14px", fontWeight: "700", cursor: podeNext ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s, color 0.15s", lineHeight: 1 }} aria-label="Próximo">›</button>
            </div>
          </div>
          <div ref={carrosselRef} onScroll={atualizarBotoes} style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "8px", scrollbarWidth: "none", msOverflowStyle: "none", scrollSnapType: "x mandatory" }}>
            {recentesIds.map(musical => (
              <div key={musical.id} style={{ scrollSnapAlign: "start", flexShrink: 0 }}>
                <CardMusical musical={musical} tamanho="pequeno" />
              </div>
            ))}
          </div>
        </div>
      )}

      <hr className="divider" />

      {/* ── LAYOUT DUAS COLUNAS ── */}
      <div className="home-layout">
        <div className="home-conteudo">

          {/* ── FILTROS ── */}
          <div style={{ display: "flex", gap: "12px", margin: "24px 0", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Buscar musical ou pessoa..."
              value={buscaInput}
              onChange={e => setBuscaInput(e.target.value)}
              style={{ flex: 1, minWidth: "200px", padding: "12px 16px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>Organizar por</label>
              <select value={ordenacao} onChange={e => { setOrdenacao(e.target.value); setVisiveis(24) }} style={{ padding: "12px 16px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", background: "#fff", cursor: "pointer", outline: "none" }}>
                <option value="az">A → Z</option>
                <option value="za">Z → A</option>
                <option value="melhor">Melhor avaliação</option>
                <option value="pior">Pior avaliação</option>
                <option value="mais-votados">Mais votados</option>
                <option value="menos-votados">Menos votados</option>
                <option value="recentes">Adicionados recentemente</option>
                <option value="antigos">Adicionados anteriormente</option>
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

          {/* ── GRID PRINCIPAL ── */}
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
              musicaisVisiveis.map(musical => (
                <CardMusical key={musical.id} musical={musical} />
              ))
            )}
          </div>

          {temMais && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "40px" }}>
              <button onClick={() => setVisiveis(v => v + 24)} style={{ padding: "12px 32px", border: "1px solid #e8e8e4", borderRadius: "8px", background: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", cursor: "pointer", color: "#1a1a1a", fontWeight: "500" }}>
                Carregar mais ({musicaisFiltrados.length - visiveis} restantes)
              </button>
            </div>
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <aside className="sidebar-comentarios">
          <p style={{ fontSize: "12px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "16px", marginTop: "24px" }}>
            Últimos comentários
          </p>
          {ultimosComentarios.length === 0 ? (
            <p style={{ fontSize: "13px", color: "#bbb" }}>Nenhum comentário ainda.</p>
          ) : (
            ultimosComentarios.map(c => (
              <div key={c.id} style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #e8e8e4" }}>
                <a href={`/musical/${c.musicalId}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                    {c.musicalCapa
                      ? <img src={c.musicalCapa} alt={c.musicalTitulo} style={{ width: "36px", height: "50px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
                      : <div style={{ width: "36px", height: "50px", background: "#1a1a1a", borderRadius: "4px", flexShrink: 0 }} />
                    }
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "12px", fontWeight: "700", margin: "0 0 2px", color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.musicalTitulo}</p>
                      <a href={`/perfil/${c.userId}`} onClick={e => e.stopPropagation()} style={{ fontSize: "12px", color: "#888", textDecoration: "none" }}>{c.nome}</a>
                      <p style={{ fontSize: "13px", color: "#444", margin: "4px 0 0", lineHeight: "1.4", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.texto}</p>
                    </div>
                  </div>
                </a>
              </div>
            ))
          )}
        </aside>
      </div>

      {/* ── FALE COM A GENTE ── */}
      <div style={{
        marginTop: "64px",
        padding: "48px 0",
        borderTop: "1px solid #e8e8e4"
      }}>
        <p style={{ fontSize: "14px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "8px" }}>
          Fale com a gente
        </p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "28px", fontWeight: "700", margin: "0 0 8px" }}>
          Tem algo a dizer?
        </h2>
        <p style={{ fontSize: "15px", color: "#888", marginBottom: "32px" }}>
          Sugestões, correções, parcerias ou só um oi — a gente lê tudo.
        </p>

        {contatoEnviado ? (
          <div style={{
            background: "#f9f9f9",
            border: "1px solid #e8e8e4",
            borderRadius: "12px",
            padding: "32px",
            textAlign: "center",
            maxWidth: "560px"
          }}>
            <p style={{ fontSize: "32px", marginBottom: "12px" }}>✉️</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>Mensagem enviada!</p>
            <p style={{ fontSize: "14px", color: "#888", marginBottom: "20px" }}>Obrigado por entrar em contato. Retornaremos em breve.</p>
            <button
              onClick={() => setContatoEnviado(false)}
              style={{ padding: "10px 24px", border: "1px solid #e8e8e4", borderRadius: "8px", background: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer", color: "#1a1a1a" }}
            >
              Enviar outra mensagem
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: "560px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Nome <span style={{ color: "#cc0000" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={contatoNome}
                  onChange={e => setContatoNome(e.target.value)}
                  style={{ padding: "12px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: "1px" }}>
                  E-mail <span style={{ color: "#888", fontWeight: "400", textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
                </label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={contatoEmail}
                  onChange={e => setContatoEmail(e.target.value)}
                  style={{ padding: "12px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: "1px" }}>
                Mensagem <span style={{ color: "#cc0000" }}>*</span>
              </label>
              <textarea
                placeholder="Escreva sua mensagem..."
                value={contatoMensagem}
                onChange={e => setContatoMensagem(e.target.value)}
                rows={5}
                style={{ padding: "12px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none", resize: "vertical", lineHeight: "1.5" }}
              />
            </div>
            <div>
              <button
                onClick={enviarContato}
                disabled={contatoEnviando || !contatoNome.trim() || !contatoMensagem.trim()}
                style={{
                  padding: "12px 28px",
                  background: contatoEnviando || !contatoNome.trim() || !contatoMensagem.trim() ? "#ccc" : "#1a1a1a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: contatoEnviando || !contatoNome.trim() || !contatoMensagem.trim() ? "not-allowed" : "pointer",
                  transition: "background 0.15s"
                }}
              >
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