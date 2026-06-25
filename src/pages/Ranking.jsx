import { useEffect, useState } from "react"
import { getDoc, doc } from "firebase/firestore"
import { db } from "../firebase"
import { useNavigate } from "react-router-dom"

function CardRanking({ musical, index, navigate, contador, labelSingular, labelPlural }) {
  return (
    <div
      onClick={() => navigate(`/musical/${musical.id}`)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "#fff",
        border: "1px solid #e8e8e4",
        borderRadius: "12px",
        padding: "12px",
        marginBottom: "10px",
        cursor: "pointer",
        transition: "border-color 0.15s"
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#F5C518"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#e8e8e4"}
    >
      <div style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: index === 0 ? "#F5C518" : index === 1 ? "#e0e0e0" : index === 2 ? "#c8a06e" : "#1a1a1a",
        color: index === 0 ? "#1a1a1a" : index === 1 ? "#1a1a1a" : index === 2 ? "#fff" : "#F5C518",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: "700",
        flexShrink: 0
      }}>
        {index + 1}
      </div>

      {musical.capa ? (
        <img src={musical.capa} alt={musical.titulo} style={{ width: "36px", height: "50px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
      ) : (
        <div style={{ width: "36px", height: "50px", background: "#1a1a1a", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#F5C518", fontSize: "7px", textAlign: "center", padding: "3px" }}>{musical.titulo}</span>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: "700", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{musical.titulo}</p>
        <p style={{ fontSize: "12px", color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Dir. {musical.direcao || "—"}</p>
      </div>

      <div style={{
        background: "#1a1a1a",
        color: "#F5C518",
        borderRadius: "8px",
        padding: "6px 10px",
        textAlign: "center",
        flexShrink: 0
      }}>
        <p style={{ fontSize: "16px", fontWeight: "700", lineHeight: 1 }}>{contador}</p>
        <p style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
          {contador === 1 ? labelSingular : labelPlural}
        </p>
      </div>
    </div>
  )
}

function Ranking() {
  const [populares, setPopulares] = useState([])
  const [curtidos, setCurtidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function buscarRanking() {
      try {
        const indiceSnap = await getDoc(doc(db, "indices", "home"))
        if (indiceSnap.exists() && Array.isArray(indiceSnap.data().itens)) {
          const itens = indiceSnap.data().itens

          const listaPopulares = itens
            .filter(m => (m.popularidade || 0) > 0)
            .sort((a, b) => (b.popularidade || 0) - (a.popularidade || 0))
            .slice(0, 15)

          const listaCurtidos = itens
            .filter(m => (m.totalLikes || 0) > 0)
            .sort((a, b) => (b.totalLikes || 0) - (a.totalLikes || 0))
            .slice(0, 15)

          setPopulares(listaPopulares)
          setCurtidos(listaCurtidos)
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

      {carregando ? (
        <p style={{ color: "#888" }}>Carregando...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px", alignItems: "start" }}>

          {/* Coluna: Mais populares */}
          <div>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Mais populares</p>
            <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "16px" }}>por "já vi" + "quero ver"</p>
            {populares.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>Nenhum musical ainda.</p>
            ) : (
              populares.map((musical, index) => (
                <CardRanking
                  key={musical.id}
                  musical={musical}
                  index={index}
                  navigate={navigate}
                  contador={musical.popularidade}
                  labelSingular="pessoa"
                  labelPlural="pessoas"
                />
              ))
            )}
          </div>

          {/* Coluna: Mais curtidos */}
          <div>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Mais curtidos</p>
            <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "16px" }}>por reações 👍</p>
            {curtidos.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>Nenhuma reação registrada ainda.</p>
            ) : (
              curtidos.map((musical, index) => (
                <CardRanking
                  key={musical.id}
                  musical={musical}
                  index={index}
                  navigate={navigate}
                  contador={musical.totalLikes}
                  labelSingular="curtida"
                  labelPlural="curtidas"
                />
              ))
            )}
          </div>

        </div>
      )}
    </main>
  )
}

export default Ranking