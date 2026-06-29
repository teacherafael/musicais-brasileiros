import { useEffect, useState } from "react"
import { getDoc, doc } from "firebase/firestore"
import { db } from "../firebase"
import { useNavigate } from "react-router-dom"

function CardRanking({ musical, index, navigate, contador, labelSingular, labelPlural, mostrarContador = true }) {
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

      {mostrarContador && (
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
      )}
    </div>
  )
}

function Ranking() {
  const [populares, setPopulares] = useState([])
  const [avaliados, setAvaliados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function buscarRanking() {
      try {
        const indiceSnap = await getDoc(doc(db, "indices", "home"))
        if (indiceSnap.exists() && Array.isArray(indiceSnap.data().itens)) {
          const itens = indiceSnap.data().itens

          // ── Mais populares (por "já vi" + "quero ver") ──
          const listaPopulares = itens
            .filter(m => (m.popularidade || 0) > 0)
            .sort((a, b) => (b.popularidade || 0) - (a.popularidade || 0))
            .slice(0, 15)

          // ── Mais bem avaliados (média bayesiana — só a ordem) ──
          // Âncora = média geral da plataforma, calculada em memória a partir do índice (custo zero)
          const PESO = 5 // quantos votos um musical precisa pra "soltar" da média geral
          let somaGlobal = 0
          let votosGlobal = 0
          itens.forEach(m => {
            somaGlobal += Number(m.somaEstrelas) || 0
            votosGlobal += Number(m.totalVotos) || 0
          })
          const mediaGlobal = votosGlobal > 0 ? somaGlobal / votosGlobal : 0

          const listaAvaliados = itens
            .filter(m => (Number(m.totalVotos) || 0) > 0)
            .map(m => {
              const votos = Number(m.totalVotos) || 0
              const media = (Number(m.somaEstrelas) || 0) / votos
              const score = (votos / (votos + PESO)) * media + (PESO / (votos + PESO)) * mediaGlobal
              return { ...m, _score: score }
            })
            .sort((a, b) => b._score - a._score)
            .slice(0, 15)

          setPopulares(listaPopulares)
          setAvaliados(listaAvaliados)
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
            <p style={{ fontSize: "15px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Mais populares</p>
            <p style={{ fontSize: "15px", color: "#aaa", marginBottom: "16px" }}>por "já vi" + "quero ver"</p>
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

          {/* Coluna: Mais bem avaliados */}
          <div>
            <p style={{ fontSize: "15px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Mais bem avaliados</p>
            <p style={{ fontSize: "15px", color: "#aaa", marginBottom: "16px" }}>pela avaliação da comunidade</p>
            {avaliados.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>Nenhuma avaliação ainda.</p>
            ) : (
              avaliados.map((musical, index) => (
                <CardRanking
                  key={musical.id}
                  musical={musical}
                  index={index}
                  navigate={navigate}
                  mostrarContador={false}
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