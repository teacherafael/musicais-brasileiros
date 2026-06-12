import { useEffect, useState } from "react"
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, limit } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useNavigate, useSearchParams } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"

const POR_PAGINA = 12

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
  const [usuario, setUsuario] = useState(null)
  const [queroVerSet, setQueroVerSet] = useState(new Set())
  const [jaViSet, setJaViSet] = useState(new Set())
  const [pagina, setPagina] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [ultimosComentarios, setUltimosComentarios] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      setBusca(buscaInput)
      setPagina(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [buscaInput])

  useEffect(() => {
    setPagina(1)
  }, [ordenacao, filtroAno])

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
      setDestaques(lista.filter(m => m.destaque === true).slice(0, 5))
      setCarregando(false)
    }
    buscarMusicais()
  }, [])

  useEffect(() => {
    async function buscarComentarios() {
      try {
        const q = query(collection(db, "comentarios"), orderBy("data", "desc"), limit(8))
        const snap = await getDocs(q)
        setUltimosComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) {
        // Coleção ainda vazia ou índice não criado — sidebar fica em branco
        setUltimosComentarios([])
      }
    }
    buscarComentarios()
  }, [])

  async function toggleQueroVer(e, musical) {
    e.preventDefault()
    e.stopPropagation()
    if (!usuario) return alert("Faça login para usar esta função.")
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

  const anos = [...new Set(musicais.map(m => m.ano).filter(Boolean))].sort((a, b) => b - a)

  const destaquesIds = new Set(destaques.map(m => m.id))

  const recentesIds = [...musicais]
    .filter(m => !destaquesIds.has(m.id))
    .sort((a, b) => (b.dataCriacao?.seconds || 0) - (a.dataCriacao?.seconds || 0))
    .slice(0, 10)

  const idsExcluidos = new Set([...destaquesIds])

  const musicaisFiltrados = musicais
    .filter(m => !idsExcluidos.has(m.id))
    .filter(musical => {
      const termo = normalizar(busca)
      const campos = [
        musical.titulo,
        musical.elenco,
        musical.elencoAdicional,
        musical.direcao,
        musical.direcaoMusical,
        musical.producao,
        musical.versionista,
        musical.textoOriginal,
        musical.musicaOriginal
      ]
      return (
        campos.some(c => normalizar(c).includes(termo)) &&
        (filtroAno === "" || musical.ano === filtroAno)
      )
    })
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

  const totalPaginas = Math.ceil(musicaisFiltrados.length / POR_PAGINA)
  const musicaisPagina = musicaisFiltrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  function CardMusical({ musical, tamanho = "normal" }) {
    const media = musical.totalVotos > 0
      ? (musical.somaEstrelas / musical.totalVotos).toFixed(1)
      : "—"
    const largura = tamanho === "pequeno" ? "140px" : "100%"

    return (
      <a
        href={"/musical/" + musical.id}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: tamanho === "pequeno" ? "140px" : "100%",
          flexShrink: 0
        }}
      >
        <div style={{
          width: largura,
          position: "relative",
          paddingBottom: tamanho === "pequeno" ? "0" : "140%",
          height: tamanho === "pequeno" ? "200px" : "0",
          marginBottom: "10px"
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
            {musical.capa
              ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", borderRadius: "6px", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{musical.titulo}</div>
            }
          </div>
        </div>
        <div style={{ width: "100%" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: "600", fontSize: tamanho === "pequeno" ? "13px" : "15px", margin: "0 0 4px", lineHeight: "1.3" }}>{musical.titulo}</p>
          {tamanho !== "pequeno" && (
            <p style={{ fontSize: "13px", color: "#888", margin: "0 0 6px" }}>Direção: {musical.direcao || "—"}</p>
          )}
          <div className="rating-badge">
            ★ {media}
            <span className="rating-votos">
              ({musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"})
            </span>
          </div>
          {usuario && (
            <div style={{ display: "flex", gap: "8px", marginTop: "10px", justifyContent: "center" }}>
              <button
                onClick={e => toggleJaVi(e, musical)}
                style={{
                  background: "none", border: "none", padding: 0,
                  fontFamily: "'DM Sans', sans-serif", fontSize: "12px", cursor: "pointer",
                  color: jaViSet.has(musical.id) ? "#1a1a1a" : "#aaa",
                  fontWeight: jaViSet.has(musical.id) ? "600" : "400"
                }}
              >
                {jaViSet.has(musical.id) ? "✓ Já vi" : "Já vi"}
              </button>
              <span style={{ color: "#ddd", fontSize: "12px" }}>·</span>
              <button
                onClick={e => toggleQueroVer(e, musical)}
                style={{
                  background: "none", border: "none", padding: 0,
                  fontFamily: "'DM Sans', sans-serif", fontSize: "12px", cursor: "pointer",
                  color: queroVerSet.has(musical.id) ? "#b8960a" : "#aaa",
                  fontWeight: queroVerSet.has(musical.id) ? "600" : "400"
                }}
              >
                {queroVerSet.has(musical.id) ? "★ Quero ver" : "☆ Quero ver"}
              </button>
            </div>
          )}
        </div>
      </a>
    )
  }

  return (
    <main>
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
            display: "flex",
            gap: "16px",
            overflowX: "auto",
            paddingBottom: "8px",
            scrollbarWidth: "none",
            msOverflowStyle: "none"
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
          <p style={{ fontSize: "14px", fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "12px" }}>
            Recém adicionados
          </p>
          <div style={{
            display: "flex",
            gap: "16px",
            overflowX: "auto",
            paddingBottom: "8px",
            scrollbarWidth: "none",
            msOverflowStyle: "none"
          }}>
            {recentesIds.map(musical => (
              <CardMusical key={musical.id} musical={musical} tamanho="pequeno" />
            ))}
          </div>
        </div>
      )}

      <hr className="divider" />

      {/* ── LAYOUT DUAS COLUNAS (desktop) ── */}
      <div className="home-layout">

        {/* ── COLUNA ESQUERDA: filtros + grid ── */}
        <div className="home-conteudo">

          {/* ── FILTROS ── */}
          <div style={{ display: "flex", gap: "12px", margin: "24px 0", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Buscar musical ou pessoa..."
              value={buscaInput}
              onChange={e => setBuscaInput(e.target.value)}
              style={{
                flex: 1, minWidth: "200px", padding: "12px 16px",
                border: "1px solid #e8e8e4", borderRadius: "8px",
                fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none"
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label style={{ fontSize: "11px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>
                Organizar por
              </label>
              <select
                value={ordenacao}
                onChange={e => setOrdenacao(e.target.value)}
                style={{ padding: "12px 16px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", background: "#fff", cursor: "pointer", outline: "none" }}
              >
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
              <label style={{ fontSize: "11px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>
                Ano
              </label>
              <select
                value={filtroAno}
                onChange={e => setFiltroAno(e.target.value)}
                style={{ padding: "12px 16px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", background: "#fff", cursor: "pointer", outline: "none" }}
              >
                <option value="">Todos os anos</option>
                {anos.map(ano => <option key={ano} value={ano}>{ano}</option>)}
              </select>
            </div>
          </div>

          {/* ── GRID PRINCIPAL ── */}
          <div
            className="grid-musicais"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}
          >
            {carregando ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                  borderRadius: "6px",
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.2s infinite",
                  aspectRatio: "3/4"
                }} />
              ))
            ) : musicaisPagina.length === 0 ? (
              <p style={{ color: "#888", fontSize: "15px" }}>Nenhum musical encontrado.</p>
            ) : (
              musicaisPagina.map(musical => (
                <CardMusical key={musical.id} musical={musical} />
              ))
            )}
          </div>

          {/* ── PAGINAÇÃO ── */}
          {totalPaginas > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "40px", flexWrap: "wrap" }}>
              <button
                onClick={() => { setPagina(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                disabled={pagina === 1}
                style={{
                  padding: "8px 16px", border: "1px solid #e8e8e4", borderRadius: "8px",
                  background: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                  cursor: pagina === 1 ? "not-allowed" : "pointer", color: pagina === 1 ? "#ccc" : "#1a1a1a"
                }}
              >
                ← Anterior
              </button>

              {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => { setPagina(n); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                  style={{
                    padding: "8px 14px", border: "1px solid #e8e8e4", borderRadius: "8px",
                    background: n === pagina ? "#F5C518" : "#fff",
                    fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                    fontWeight: n === pagina ? "700" : "400",
                    cursor: "pointer", color: "#1a1a1a"
                  }}
                >
                  {n}
                </button>
              ))}

              <button
                onClick={() => { setPagina(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }) }}
                disabled={pagina === totalPaginas}
                style={{
                  padding: "8px 16px", border: "1px solid #e8e8e4", borderRadius: "8px",
                  background: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                  cursor: pagina === totalPaginas ? "not-allowed" : "pointer", color: pagina === totalPaginas ? "#ccc" : "#1a1a1a"
                }}
              >
                Próximo →
              </button>
            </div>
          )}

          {totalPaginas > 1 && (
            <p style={{ textAlign: "center", fontSize: "13px", color: "#999", marginTop: "12px" }}>
              Página {pagina} de {totalPaginas} · {musicaisFiltrados.length} musicais
            </p>
          )}

        </div>

        {/* ── SIDEBAR: últimos comentários (só desktop) ── */}
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
                    {c.musicalCapa ? (
                      <img
                        src={c.musicalCapa}
                        alt={c.musicalTitulo}
                        style={{ width: "36px", height: "50px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: "36px", height: "50px", background: "#1a1a1a", borderRadius: "4px", flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "12px", fontWeight: "700", margin: "0 0 2px", color: "#1a1a1a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.musicalTitulo}
                      </p>
                      <a
                        href={`/perfil/${c.userId}`}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: "12px", color: "#888", textDecoration: "none" }}
                      >
                        {c.nome}
                      </a>
                      <p style={{
                        fontSize: "13px", color: "#444", margin: "4px 0 0", lineHeight: "1.4",
                        display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden"
                      }}>
                        {c.texto}
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            ))
          )}
        </aside>

      </div>
    </main>
  )
}

export default Home
