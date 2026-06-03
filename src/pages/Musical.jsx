import { useEffect, useState } from "react"
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, getDocs, orderBy, query } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useParams, useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"

function Musical() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [musical, setMusical] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [votoAtual, setVotoAtual] = useState(null)
  const [hover, setHover] = useState(0)
  const [comentarios, setComentarios] = useState([])
  const [textoComentario, setTextoComentario] = useState("")

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  useEffect(() => {
    async function buscarMusical() {
      const docSnap = await getDoc(doc(db, "musicais", id))
      if (docSnap.exists()) setMusical({ id: docSnap.id, ...docSnap.data() })
    }
    async function buscarComentarios() {
      const q = query(collection(db, "musicais", id, "comentarios"), orderBy("data", "desc"))
      const snap = await getDocs(q)
      setComentarios(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }
    buscarMusical()
    buscarComentarios()
  }, [id])

  useEffect(() => {
    async function buscarVoto() {
      if (!usuario) return
      const votoSnap = await getDoc(doc(db, "musicais", id, "votos", usuario.uid))
      if (votoSnap.exists()) setVotoAtual(votoSnap.data().estrelas)
    }
    buscarVoto()
  }, [usuario, id])

  async function votar(estrelas) {
    if (!usuario) return alert("Faça login para votar.")
    if (votoAtual) return alert("Você já votou neste musical.")
    await setDoc(doc(db, "musicais", id, "votos", usuario.uid), { estrelas })
    await updateDoc(doc(db, "musicais", id), {
      totalVotos: increment(1),
      somaEstrelas: increment(estrelas)
    })
    setVotoAtual(estrelas)
    setMusical(prev => ({
      ...prev,
      totalVotos: prev.totalVotos + 1,
      somaEstrelas: prev.somaEstrelas + estrelas
    }))
  }

  async function enviarComentario() {
    if (!usuario) return alert("Faça login para comentar.")
    if (!textoComentario.trim()) return
    const novoComentario = {
      nome: usuario.displayName,
      texto: textoComentario,
      data: new Date()
    }
    const docRef = await addDoc(collection(db, "musicais", id, "comentarios"), novoComentario)
    setComentarios(prev => [{ id: docRef.id, ...novoComentario }, ...prev])
    setTextoComentario("")
  }

  if (!musical) return <main><p>Carregando...</p></main>

  const media = musical.totalVotos > 0
    ? (musical.somaEstrelas / musical.totalVotos).toFixed(1)
    : null

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>
        ← Voltar
      </button>

      <div className="musical-header">
        <div className="musical-poster">
  {musical.capa
    ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
    : musical.titulo
  }
</div>
        <div>
          <h1 className="musical-titulo">{musical.titulo}</h1>
          <p className="musical-meta">Direção: {musical.direcao || "—"}</p>
          {media ? (
            <div className="rating-grande">
              ★ {media}
              <span className="rating-grande-label">
                {musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"}
              </span>
            </div>
          ) : (
            <div className="rating-grande">
              — <span className="rating-grande-label">sem votos ainda</span>
            </div>
          )}
        </div>
      </div>

      <p className="sinopse">{musical.sinopse}</p>

      <hr className="divider" />

      <p className="avaliacao-titulo">Avalie este musical</p>
      {votoAtual ? (
        <div className="voto-registrado">Você votou {votoAtual} ★</div>
      ) : (
        <div className="estrelas-container">
          {[1, 2, 3, 4, 5].map(estrela => (
            <span
              key={estrela}
              className={`estrela ${estrela <= (hover || 0) ? "ativa" : ""}`}
              onClick={() => votar(estrela)}
              onMouseEnter={() => setHover(estrela)}
              onMouseLeave={() => setHover(0)}
            >
              ★
            </span>
          ))}
        </div>
      )}

      <hr className="divider" />

      <h2 className="comentarios-titulo">Comentários</h2>

      {usuario ? (
        <div className="comentario-form">
          <textarea
            value={textoComentario}
            onChange={e => setTextoComentario(e.target.value)}
            placeholder="Escreva um comentário..."
          />
          <button className="btn-comentar" onClick={enviarComentario}>
            Enviar comentário
          </button>
        </div>
      ) : (
        <p className="login-aviso">Faça login para comentar.</p>
      )}

      {comentarios.length === 0 ? (
        <p className="login-aviso" style={{ marginTop: "16px" }}>Nenhum comentário ainda.</p>
      ) : (
        comentarios.map(c => (
          <div key={c.id} className="comentario-item">
            <p className="comentario-nome">{c.nome}</p>
            <p className="comentario-texto">{c.texto}</p>
          </div>
        ))
      )}
    </main>
  )
}

export default Musical