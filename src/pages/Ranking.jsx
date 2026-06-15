import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { useNavigate } from "react-router-dom"

function Ranking() {
  const [musicais, setMusicais] = useState([])
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function buscarMusicais() {
      const snapshot = await getDocs(collection(db, "musicais"))
      const lista = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(m => m.totalVotos > 5)
        .map(m => ({ ...m, media: m.somaEstrelas / m.totalVotos }))
        .sort((a, b) => b.media - a.media)
        .slice(0, 15)
      setMusicais(lista)
      setCarregando(false)
    }
    buscarMusicais()
  }, [])

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">Musicais Brasileiros Database</p>
<h1 className="page-title">Top 15</h1>
<p style={{ fontSize: "15px", color: "#888", marginBottom: "32px", marginTop: "-8px" }}>
  Os 15 musicais mais bem avaliados
</p>

      {carregando ? (
        <p style={{ color: "#888" }}>Carregando...</p>
      ) : musicais.length === 0 ? (
        <p style={{ color: "#888" }}>Nenhum musical avaliado ainda.</p>
      ) : (
        musicais.map((musical, index) => (
          <div
            key={musical.id}
            onClick={() => navigate(`/musical/${musical.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              background: "#fff",
              border: "1px solid #e8e8e4",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "12px",
              cursor: "pointer",
              transition: "border-color 0.15s"
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#F5C518"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "#e8e8e4"}
          >
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: index === 0 ? "#F5C518" : index === 1 ? "#e0e0e0" : index === 2 ? "#c8a06e" : "#1a1a1a",
              color: index === 0 ? "#1a1a1a" : index === 1 ? "#1a1a1a" : index === 2 ? "#fff" : "#F5C518",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "15px",
              fontWeight: "700",
              flexShrink: 0
            }}>
              {index + 1}
            </div>

            {musical.capa ? (
              <img
                src={musical.capa}
                alt={musical.titulo}
                style={{ width: "48px", height: "64px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: "48px", height: "64px", background: "#1a1a1a", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#F5C518", fontSize: "8px", textAlign: "center", padding: "4px" }}>{musical.titulo}</span>
              </div>
            )}

            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "19px", fontWeight: "700", marginBottom: "4px" }}>{musical.titulo}</p>
              <p style={{ fontSize: "13px", color: "#888" }}>Direção: {musical.direcao || "—"}</p>
            </div>

            <div style={{
              background: "#1a1a1a",
              color: "#F5C518",
              borderRadius: "8px",
              padding: "8px 14px",
              textAlign: "center",
              flexShrink: 0
            }}>
              <p style={{ fontSize: "20px", fontWeight: "700", lineHeight: 1 }}>★ {musical.media.toFixed(1)}</p>
              <p style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                {musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"}
              </p>
            </div>
          </div>
        ))
      )}
    </main>
  )
}

export default Ranking