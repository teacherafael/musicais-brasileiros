import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { useNavigate } from "react-router-dom"

function Home() {
  const [musicais, setMusicais] = useState([])
  const [busca, setBusca] = useState("")
  const [ordenacao, setOrdenacao] = useState("melhor")
  const navigate = useNavigate()

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

  const musicaisFiltrados = musicais
    .filter(musical =>
      musical.titulo.toLowerCase().includes(busca.toLowerCase())
    )
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
      <h1 className="page-title">Todos os Musicais</h1>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar musical..."
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
            <option value="melhor">Melhor avaliação</option>
            <option value="pior">Pior avaliação</option>
            <option value="mais-votados">Mais votados</option>
            <option value="menos-votados">Menos votados</option>
<option value="az">A → Z</option>
<option value="za">Z → A</option>
<option value="recentes">Adicionados recentemente</option>
<option value="antigos">Adicionados anteriormente</option>
          </select>
        </div>
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
            <div
              key={musical.id}
              className="card-musical"
              onClick={() => navigate(`/musical/${musical.id}`)}
            >
              <div className="card-poster card-poster-home" style={{ width: "100%", height: "280px", marginBottom: "12px" }}>
                {musical.capa
                  ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
                  : musical.titulo
                }
              </div>
              <div className="card-info" style={{ width: "100%" }}>
                <p className="card-titulo">{musical.titulo}</p>
                <p className="card-meta">Direção: {musical.direcao || "—"}</p>
                <div className="rating-badge">
                  ★ {musical.totalVotos > 0
                    ? musical.media.toFixed(1)
                    : "—"}
                  <span className="rating-votos">
                    ({musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"})
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )  
}

export default Home