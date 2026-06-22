import { useEffect, useState } from "react"
import { getDoc, doc } from "firebase/firestore"
import { db } from "../firebase"
import { useNavigate } from "react-router-dom"

function Ranking() {
  const [musicais, setMusicais] = useState([])
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function buscarRanking() {
      try {
        // 1 leitura: lê o índice já construído pelo admin
        const indiceSnap = await getDoc(doc(db, "indices", "home"))
        if (indiceSnap.exists() && Array.isArray(indiceSnap.data().itens)) {
          const lista = indiceSnap.data().itens
            .filter(m => (m.popularidade || 0) > 0)
            .sort((a, b) => (b.popularidade || 0) - (a.popularidade || 0))
            .slice(0, 15)
          setMusicais(lista)
        }
      } catch (e) {
        console.error("Erro ao carregar ranking:", e)
      }
      setCarregando(false)
    }
    buscarRanking()
  }, [])

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">Musicais Brasileiros Database</p>
      <h1 className="page-title">Ranking</h1>
      <p style={{ fontSize: "15px", color: "#888", marginBottom: "32px", marginTop: "-8px" }}>
        Os 15 musicais mais populares — por número de pessoas que já viram ou querem ver
      </p>

      {carregando ? (
        <p style={{ color: "#888" }}>Carregando...</p>
      ) : musicais.length === 0 ? (
        <p style={{ color: "#888" }}>Nenhum musical com votos ainda.</p>
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
            {/* Posição */}
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

            {/* Capa */}
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

            {/* Título e direção */}
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "19px", fontWeight: "700", marginBottom: "4px" }}>{musical.titulo}</p>
              <p style={{ fontSize: "13px", color: "#888" }}>Direção: {musical.direcao || "—"}</p>
            </div>

            {/* Contador de popularidade */}
            <div style={{
              background: "#1a1a1a",
              color: "#F5C518",
              borderRadius: "8px",
              padding: "8px 14px",
              textAlign: "center",
              flexShrink: 0
            }}>
              <p style={{ fontSize: "20px", fontWeight: "700", lineHeight: 1 }}>{musical.popularidade}</p>
              <p style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                {musical.popularidade === 1 ? "pessoa" : "pessoas"}
              </p>
            </div>
          </div>
        ))
      )}
    </main>
  )
}

export default Ranking
