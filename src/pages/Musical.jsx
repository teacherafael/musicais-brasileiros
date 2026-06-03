import { useEffect, useState } from "react"
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, getDocs, deleteDoc, orderBy, query } from "firebase/firestore"
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
  const [editandoComentario, setEditandoComentario] = useState(null)
  const [textoEdicao, setTextoEdicao] = useState("")

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
      const lista = await Promise.all(snap.docs.map(async d => {
        const dados = { id: d.id, ...d.data() }
        if (dados.userId) {
          const votoSnap = await getDoc(doc(db, "musicais", id, "votos", dados.userId))
          if (votoSnap.exists()) {
            dados.estrelasComentario = votoSnap.data().estrelas
          }
        }
        return dados
      }))
      setComentarios(lista)
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
    if (votoAtual) {
      await updateDoc(doc(db, "musicais", id), {
        somaEstrelas: increment(estrelas - votoAtual)
      })
      await setDoc(doc(db, "musicais", id, "votos", usuario.uid), { estrelas })
      setMusical(prev => ({
        ...prev,
        somaEstrelas: prev.somaEstrelas + (estrelas - votoAtual)
      }))
    } else {
      await setDoc(doc(db, "musicais", id, "votos", usuario.uid), { estrelas })
      await updateDoc(doc(db, "musicais", id), {
        totalVotos: increment(1),
        somaEstrelas: increment(estrelas)
      })
      setMusical(prev => ({
        ...prev,
        totalVotos: prev.totalVotos + 1,
        somaEstrelas: prev.somaEstrelas + estrelas
      }))
    }
    setVotoAtual(estrelas)
  }

  async function enviarComentario() {
    if (!usuario) return alert("Faça login para comentar.")
    if (!textoComentario.trim()) return
    const novoComentario = {
      nome: usuario.displayName,
      userId: usuario.uid,
      texto: textoComentario,
      data: new Date()
    }
    const docRef = await addDoc(collection(db, "musicais", id, "comentarios"), novoComentario)
    const votoSnap = await getDoc(doc(db, "musicais", id, "votos", usuario.uid))
    const estrelasComentario = votoSnap.exists() ? votoSnap.data().estrelas : null
    setComentarios(prev => [{ id: docRef.id, ...novoComentario, estrelasComentario }, ...prev])
    setTextoComentario("")
  }

  async function deletarComentario(comentarioId) {
    if (!window.confirm("Apagar este comentário?")) return
    await deleteDoc(doc(db, "musicais", id, "comentarios", comentarioId))
    setComentarios(prev => prev.filter(c => c.id !== comentarioId))
  }

  async function salvarEdicao(comentarioId) {
    if (!textoEdicao.trim()) return
    await updateDoc(doc(db, "musicais", id, "comentarios", comentarioId), {
      texto: textoEdicao
    })
    setComentarios(prev => prev.map(c =>
      c.id === comentarioId ? { ...c, texto: textoEdicao } : c
    ))
    setEditandoComentario(null)
    setTextoEdicao("")
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

      <p className="avaliacao-titulo">
        {votoAtual ? "Sua avaliação (clique para mudar)" : "Avalie este musical"}
      </p>
      <div className="estrelas-container">
        {[1, 2, 3, 4, 5].map(estrela => (
          <span
            key={estrela}
            className={`estrela ${estrela <= (hover || votoAtual || 0) ? "ativa" : ""}`}
            onClick={() => votar(estrela)}
            onMouseEnter={() => setHover(estrela)}
            onMouseLeave={() => setHover(0)}
          >
            ★
          </span>
        ))}
      </div>
      {votoAtual && (
        <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
          Você votou {votoAtual} ★ — clique em outra estrela para mudar
        </p>
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
            <p className="comentario-nome">
              {c.nome}
              {c.estrelasComentario && (
                <span style={{ marginLeft: "8px", color: "#F5C518", fontSize: "13px" }}>
                  {"★".repeat(c.estrelasComentario)}
                </span>
              )}
            </p>

            {editandoComentario === c.id ? (
              <div>
                <textarea
                  value={textoEdicao}
                  onChange={e => setTextoEdicao(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e8e8e4", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", marginBottom: "8px" }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button className="btn-comentar" onClick={() => salvarEdicao(c.id)}>Salvar</button>
                  <button className="btn-sair" onClick={() => setEditandoComentario(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <p className="comentario-texto">{c.texto}</p>
                {usuario && usuario.uid === c.userId && (
                  <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                    <button
                      onClick={() => { setEditandoComentario(c.id); setTextoEdicao(c.texto) }}
                      style={{ background: "none", border: "none", fontSize: "13px", color: "#888", cursor: "pointer", padding: 0 }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deletarComentario(c.id)}
                      style={{ background: "none", border: "none", fontSize: "13px", color: "#cc0000", cursor: "pointer", padding: 0 }}
                    >
                      Apagar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))
      )}
    </main>
  )
}

export default Musical