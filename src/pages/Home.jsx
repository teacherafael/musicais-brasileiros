import { useEffect, useState } from "react"
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"

function Home() {
  const [musicais, setMusicais] = useState([])
  const [busca, setBusca] = useState("")
  const [ordenacao, setOrdenacao] = useState("recentes")
  const [filtroAno, setFiltroAno] = useState("")
  const [usuario, setUsuario] = useState(null)
  const [queroVerSet, setQueroVerSet] = useState(new Set())
  const [jaViSet, setJaViSet] = useState(new Set())
  const navigate = useNavigate()

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
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setMusicais(lista)
    }
    buscarMusicais()
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

  const musicaisFiltrados = musicais
    .filter(musical => {
      const termo = busca.toLowerCase()
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
        campos.some(c => c && c.toLowerCase().includes(termo)) &&
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
      if (ordenacao === "recentes") {
        const dataA = a.dataCriacao?.seconds || 0
        const dataB = b.dataCriacao?.seconds || 0
        return dataB - dataA
      }
      if (ordenacao === "antigos") {
        const dataA = a.dataCriacao?.seconds || 0
        const dataB = b.dataCriacao?.seconds || 0
        return dataA - dataB
      }
      return 0
    })

  return (
    <main>
      <p className="section-label">Musicais Brasileiros Database</p>
      <h1 className="page-title">Descubra musicais brasileiros</h1>
      <p style={{ fontSize: "18px", color: "#888", marginBottom: "24px", marginTop: "-8px" }}>
        {musicais.length} {musicais.length === 1 ? "musical" : "musicais"} na database
      </p>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar musical ou pessoa..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "12px 16px",
            border: "1px solid #e8e8e4",
            borderRadius: "8px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "15px",
            outline: "none"
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "11px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>
            Organizar por
          </label>
          <select
            value={ordenacao}
            onChange={e => setOrdenacao(e.target.value)}
            style={{
              padding: "12px 16px",
              border: "1px solid #e8e8e4",
              borderRadius: "8px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              background: "#fff",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="recentes">Adicionados recentemente</option>
            <option value="antigos">Adicionados anteriormente</option>
            <option value="melhor">Melhor avaliação</option>
            <option value="pior">Pior avaliação</option>
            <option value="mais-votados">Mais votados</option>
            <option value="menos-votados">Menos votados</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ fontSize: "11px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>
            Ano
          </label>
          <select
            value={filtroAno}
            onChange={e => setFiltroAno(e.target.value)}
            style={{
              padding: "12px 16px",
              border: "1px solid #e8e8e4",
              borderRadius: "8px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              background: "#fff",
              cursor: "pointer",
              outline: "none"
            }}
          >
            <option value="">Todos os anos</option>
            {anos.map(ano => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <button className="btn-comentar" onClick={() => navigate("/sugestao")}>
          + Sugerir um musical
        </button>
      </div>
      <hr className="divider" />

      <div className="grid-musicais" style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "16px"
      }}>
        {musicaisFiltrados.length === 0 ? (
          <p style={{ color: "#888", fontSize: "15px" }}>Nenhum musical encontrado.</p>
        ) : (
          musicaisFiltrados.map(musical => (
            
              <a key={musical.id}
              href={"/musical/" + musical.id}
              className="card-musical"
              style={{ position: "relative", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center" }}
            >
             <div className="card-poster card-poster-home" style={{ width: "100%", position: "relative", paddingBottom: "140%", marginBottom: "12px" }}>
  <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
    {musical.capa
      ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", borderRadius: "6px", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{musical.titulo}</div>
    }
  </div>
</div>
              <div className="card-info" style={{ width: "100%" }}>
                <p className="card-titulo">{musical.titulo}</p>
                <p className="card-meta">Direção: {musical.direcao || "—"}</p>
                <div className="rating-badge">
                  ★ {musical.totalVotos > 0 ? musical.media.toFixed(1) : "—"}
                  <span className="rating-votos">
                    ({musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"})
                  </span>
                </div>
                {usuario && (
                  <div style={{ display: "flex", gap: "8px", marginTop: "10px", justifyContent: "center" }}>
                    <button
                      onClick={e => toggleJaVi(e, musical)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "12px",
                        cursor: "pointer",
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
                        background: "none",
                        border: "none",
                        padding: 0,
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "12px",
                        cursor: "pointer",
                        color: queroVerSet.has(musical.id) ? "#F5C518" : "#aaa",
                        fontWeight: queroVerSet.has(musical.id) ? "600" : "400"
                      }}
                    >
                      {queroVerSet.has(musical.id) ? "★ Quero ver" : "☆ Quero ver"}
                    </button>
                  </div>
                )}
              </div>
            </a>
          ))
        )}
      </div>
    </main>
  )
}

export default Home