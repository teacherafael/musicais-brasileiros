import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"
import { useNavigate } from "react-router-dom"

function Home() {
  const [musicais, setMusicais] = useState([])
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

  return (
    <main>
      <p className="section-label">Musicais Brasileiros Database</p>
      <h1 className="page-title">Todos os Musicais</h1>
      <hr className="divider" />
      {musicais.map(musical => (
        <div
          key={musical.id}
          className="card-musical"
          onClick={() => navigate(`/musical/${musical.id}`)}
        >
          <div className="card-poster">
            {musical.capa
              ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
              : musical.titulo
            }
          </div>
          <div className="card-info">
            <p className="card-titulo">{musical.titulo}</p>
            <p className="card-meta">Direção: {musical.direcao || "—"}</p>
            <div className="rating-badge">
              ★ {musical.totalVotos > 0
                ? (musical.somaEstrelas / musical.totalVotos).toFixed(1)
                : "—"}
              <span className="rating-votos">
                ({musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"})
              </span>
            </div>
          </div>
        </div>
      ))}
    </main>
  )
}

export default Home