import { useEffect, useState } from "react"
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useParams, useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"

function Perfil() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [usuarioLogado, setUsuarioLogado] = useState(null)
  const [votos, setVotos] = useState([])
  const [comentarios, setComentarios] = useState([])
  const [queroVer, setQueroVer] = useState([])
  const [musicais, setMusicais] = useState({})
  const [nomeUsuario, setNomeUsuario] = useState("")
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuarioLogado(user))
  }, [])

  useEffect(() => {
    async function buscarDados() {
      const musicaisSnap = await getDocs(collection(db, "musicais"))
      const musicaisMap = {}
      musicaisSnap.docs.forEach(d => {
        musicaisMap[d.id] = { id: d.id, ...d.data() }
      })
      setMusicais(musicaisMap)

      const votosEncontrados = []
      const comentariosEncontrados = []

      for (const musicalId of Object.keys(musicaisMap)) {
        const votosSnap = await getDocs(collection(db, "musicais", musicalId, "votos"))
        votosSnap.docs.forEach(d => {
          if (d.id === userId) {
            votosEncontrados.push({ musicalId, estrelas: d.data().estrelas })
          }
        })

        const comentariosSnap = await getDocs(query(collection(db, "musicais", musicalId, "comentarios")))
        comentariosSnap.docs.forEach(d => {
          const dados = d.data()
          if (dados.userId === userId) {
            if (!nomeUsuario && dados.nome) setNomeUsuario(dados.nome)
            comentariosEncontrados.push({ id: d.id, musicalId, ...dados })
          }
        })
      }

      const queroVerSnap = await getDocs(collection(db, "usuarios", userId, "queroVer"))
      const queroVerLista = queroVerSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      setVotos(votosEncontrados)
      setComentarios(comentariosEncontrados)
      setQueroVer(queroVerLista)
      setCarregando(false)
    }

    buscarDados()
  }, [userId])

  const isProprioPerfil = usuarioLogado && usuarioLogado.uid === userId
  const nomePerfil = isProprioPerfil ? usuarioLogado.displayName : nomeUsuario

  if (carregando) return <main><p>Carregando...</p></main>

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>

      <div style={{ marginBottom: "32px" }}>
        {isProprioPerfil && usuarioLogado.photoURL && (
          <img
            src={usuarioLogado.photoURL}
            alt={nomePerfil}
            style={{ width: "64px", height: "64px", borderRadius: "50%", marginBottom: "12px" }}
          />
        )}
        <h1 className="page-title">{nomePerfil || "Usuário"}</h1>
        {isProprioPerfil && <p style={{ color: "#888", fontSize: "14px" }}>Este é o seu perfil</p>}
      </div>

      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "16px" }}>
        Avaliações ({votos.length})
      </h2>

      {votos.length === 0 ? (
        <p className="login-aviso" style={{ marginBottom: "32px" }}>Nenhuma avaliação ainda.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "40px" }}>
          {votos.map(voto => {
            const musical = musicais[voto.musicalId]
            if (!musical) return null
            return (
              <div
                key={voto.musicalId}
                className="card-musical"
                onClick={() => navigate(`/musical/${voto.musicalId}`)}
              >
                <div style={{ width: "100%", height: "280px", marginBottom: "12px" }}>
                  {musical.capa
                    ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
                    : <div style={{ width: "100%", height: "100%", background: "#1a1a1a", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{musical.titulo}</div>
                  }
                </div>
                <div style={{ width: "100%" }}>
                  <p className="card-titulo">{musical.titulo}</p>
                  <div className="rating-badge">★ {voto.estrelas}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "16px" }}>
        Quero ver ({queroVer.length})
      </h2>

      {queroVer.length === 0 ? (
        <p className="login-aviso" style={{ marginBottom: "32px" }}>Nenhum musical marcado ainda.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "40px" }}>
          {queroVer.map(item => (
            <div
              key={item.id}
              className="card-musical"
              onClick={() => navigate(`/musical/${item.musicalId}`)}
            >
              <div style={{ width: "100%", height: "280px", marginBottom: "12px" }}>
                {item.capa
                  ? <img src={item.capa} alt={item.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
                  : <div style={{ width: "100%", height: "100%", background: "#1a1a1a", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{item.titulo}</div>
                }
              </div>
              <div style={{ width: "100%" }}>
                <p className="card-titulo">{item.titulo}</p>
                <p className="card-meta">Direção: {item.direcao || "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "16px" }}>
        Comentários ({comentarios.length})
      </h2>

      {comentarios.length === 0 ? (
        <p className="login-aviso">Nenhum comentário ainda.</p>
      ) : (
        comentarios.map(c => {
          const musical = musicais[c.musicalId]
          return (
            <div
              key={c.id}
              className="comentario-item"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/musical/${c.musicalId}`)}
            >
              <p style={{ fontSize: "13px", fontWeight: "500", color: "#F5C518", marginBottom: "4px" }}>
                {musical?.titulo}
              </p>
              <p className="comentario-texto">{c.texto}</p>
            </div>
          )
        })
      )}
    </main>
  )
}

export default Perfil