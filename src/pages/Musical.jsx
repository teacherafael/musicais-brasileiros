import { useEffect, useState } from "react"
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, getDocs, deleteDoc, orderBy, query } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useParams, useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import ReportarErro from "../components/ReportarErro"

const ADMIN_UID = "LFDNXIXywqQrLsDLobaGzOOmok03"

function formatarNome(nomeCompleto) {
  if (!nomeCompleto) return "Anônimo"
  const partes = nomeCompleto.trim().split(" ")
  if (partes.length === 1) return partes[0]
  return `${partes[0]} ${partes[1][0]}.`
}

function Estrelas({ votoAtual, onVotar }) {
  const [hover, setHover] = useState(0)

  function calcularValor(e, estrela) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    return x < rect.width / 2 ? estrela - 0.5 : estrela
  }

  function renderEstrela(estrela, valor) {
    const cheia = valor >= estrela
    const meia = valor >= estrela - 0.5 && valor < estrela
    if (cheia) return "★"
    if (meia) return "⯨"
    return "★"
  }

  function corEstrela(estrela, valor) {
    if (valor >= estrela - 0.5) return "#F5C518"
    return "#ddd"
  }

  const valorAtivo = hover || votoAtual || 0

  return (
    <div style={{ display: "flex", gap: "4px", fontSize: "36px", cursor: "pointer", marginBottom: "8px" }}>
      {[1, 2, 3, 4, 5].map(estrela => (
        <span
          key={estrela}
          onClick={e => onVotar(calcularValor(e, estrela))}
          onMouseMove={e => setHover(calcularValor(e, estrela))}
          onMouseLeave={() => setHover(0)}
          style={{ color: corEstrela(estrela, valorAtivo), userSelect: "none", lineHeight: 1 }}
        >
          {renderEstrela(estrela, valorAtivo)}
        </span>
      ))}
    </div>
  )
}

function Musical() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [musical, setMusical] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [votoAtual, setVotoAtual] = useState(null)
  const [queroVer, setQueroVer] = useState(false)
  const [comentarios, setComentarios] = useState([])
  const [textoComentario, setTextoComentario] = useState("")
  const [editandoComentario, setEditandoComentario] = useState(null)
  const [textoEdicao, setTextoEdicao] = useState("")
  const [editandoMusical, setEditandoMusical] = useState(false)
  const [formEdicao, setFormEdicao] = useState({})

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
          if (votoSnap.exists()) dados.estrelasComentario = votoSnap.data().estrelas
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
      const queroVerSnap = await getDoc(doc(db, "usuarios", usuario.uid, "queroVer", id))
      setQueroVer(queroVerSnap.exists())
    }
    buscarVoto()
  }, [usuario, id])

  function abrirEdicao() {
    setFormEdicao({
      titulo: musical.titulo || "",
      sinopse: musical.sinopse || "",
      direcao: musical.direcao || "",
      direcaoMusical: musical.direcaoMusical || "",
      producao: musical.producao || "",
      elenco: musical.elenco || "",
      elencoAdicional: musical.elencoAdicional || "",
      versionista: musical.versionista || "",
      textoOriginal: musical.textoOriginal || "",
      musicaOriginal: musical.musicaOriginal || "",
      ano: musical.ano || "",
      teatro: musical.teatro || "",
      capa: musical.capa || ""
    })
    setEditandoMusical(true)
  }

  async function salvarEdicaoMusical() {
    await updateDoc(doc(db, "musicais", id), formEdicao)
    setMusical(prev => ({ ...prev, ...formEdicao }))
    setEditandoMusical(false)
  }

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

  async function toggleQueroVer() {
    if (!usuario) return alert("Faça login para usar esta função.")
    const ref = doc(db, "usuarios", usuario.uid, "queroVer", id)
    if (queroVer) {
      await deleteDoc(ref)
      setQueroVer(false)
    } else {
      await setDoc(ref, {
        musicalId: id,
        titulo: musical.titulo,
        capa: musical.capa || null,
        direcao: musical.direcao || ""
      })
      setQueroVer(true)
    }
  }

  async function enviarComentario() {
    if (!usuario) return alert("Faça login para comentar.")
    if (!textoComentario.trim()) return
    const novoComentario = {
      nome: formatarNome(usuario.displayName),
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
    await updateDoc(doc(db, "musicais", id, "comentarios", comentarioId), { texto: textoEdicao })
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

  const campo = (label, chave, multiline = false) => (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={formEdicao[chave] || ""}
          onChange={e => setFormEdicao(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", height: "100px", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none", resize: "vertical" }}
        />
      ) : (
        <input
          type="text"
          value={formEdicao[chave] || ""}
          onChange={e => setFormEdicao(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none" }}
        />
      )}
    </div>
  )

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>

      {editandoMusical ? (
        <div style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", marginBottom: "24px" }}>Editar musical</h2>
          {campo("Título", "titulo")}
          {campo("Sinopse", "sinopse", true)}
          {campo("Direção", "direcao")}
          {campo("Direção musical", "direcaoMusical")}
          {campo("Produção", "producao")}
          {campo("Elenco", "elenco")}
          {campo("Elenco adicional", "elencoAdicional")}
          {campo("Versionista", "versionista")}
          {campo("Texto original", "textoOriginal")}
          {campo("Música original", "musicaOriginal")}
          {campo("Ano", "ano")}
          {campo("Teatro de estreia", "teatro")}
          {campo("URL da capa", "capa")}
          {formEdicao.capa && (
            <img
              src={formEdicao.capa}
              alt="Preview"
              style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e8e4", marginBottom: "16px" }}
            />
          )}
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn-comentar" onClick={salvarEdicaoMusical}>Salvar alterações</button>
            <button className="btn-sair" onClick={() => setEditandoMusical(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="musical-header">
            <div className="musical-poster">
              {musical.capa
                ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                : musical.titulo
              }
            </div>
            <div>
              <h1 className="musical-titulo">{musical.titulo}</h1>
              <p className="musical-meta"><strong>Direção:</strong> {musical.direcao || "—"}</p>
              {musical.direcaoMusical && <p className="musical-meta"><strong>Direção musical:</strong> {musical.direcaoMusical}</p>}
              {musical.producao && <p className="musical-meta"><strong>Produção:</strong> {musical.producao}</p>}
              {musical.ano && <p className="musical-meta"><strong>Ano:</strong> {musical.ano}</p>}
              {musical.teatro && <p className="musical-meta"><strong>Teatro de estreia:</strong> {musical.teatro}</p>}
              {musical.versionista && <p className="musical-meta"><strong>Versionista:</strong> {musical.versionista}</p>}
              {musical.textoOriginal && <p className="musical-meta"><strong>Texto original:</strong> {musical.textoOriginal}</p>}
              {musical.musicaOriginal && <p className="musical-meta"><strong>Música original:</strong> {musical.musicaOriginal}</p>}
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
              {usuario && usuario.uid === ADMIN_UID && (
                <button
                  onClick={abrirEdicao}
                  style={{ marginTop: "12px", background: "none", border: "1px solid #ccc", borderRadius: "6px", padding: "6px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}
                >
                  ✏️ Editar musical
                </button>
              )}
            </div>
          </div>

          <button
            onClick={toggleQueroVer}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: queroVer ? "#F5C518" : "transparent",
              color: queroVer ? "#1a1a1a" : "#888",
              border: "1px solid",
              borderColor: queroVer ? "#F5C518" : "#ccc",
              borderRadius: "6px",
              padding: "8px 16px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              cursor: "pointer",
              marginBottom: "20px"
            }}
          >
            {queroVer ? "✓ Quero ver" : "+ Quero ver"}
          </button>

          <p className="sinopse">{musical.sinopse}</p>

          {musical.elenco && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Elenco</p>
              <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75" }}>{musical.elenco}</p>
            </div>
          )}

          {musical.elencoAdicional && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Elenco adicional</p>
              <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75" }}>{musical.elencoAdicional}</p>
            </div>
          )}

          <hr className="divider" />

          <p className="avaliacao-titulo">
            {votoAtual ? `Sua avaliação: ${votoAtual} ★ (clique para mudar)` : "Avalie este musical"}
          </p>

          <Estrelas votoAtual={votoAtual} onVotar={votar} />

          <hr className="divider" />

          <ReportarErro musicalId={id} musicalTitulo={musical.titulo} usuario={usuario} />
          <hr className="divider" />

          <h2 className="comentarios-titulo">Comentários</h2>

          {usuario ? (
            <div className="comentario-form">
              <textarea
                value={textoComentario}
                onChange={e => setTextoComentario(e.target.value)}
                placeholder="Escreva um comentário..."
              />
              <button className="btn-comentar" onClick={enviarComentario}>Enviar comentário</button>
            </div>
          ) : (
            <p className="login-aviso">Faça login para comentar.</p>
          )}

          {comentarios.length === 0 ? (
            <p className="login-aviso" style={{ marginTop: "16px" }}>Nenhum comentário ainda.</p>
          ) : (
            comentarios.map(c => (
              <div key={c.id} className="comentario-item">
                <p
                  className="comentario-nome"
                  onClick={() => navigate(`/perfil/${c.userId}`)}
                  style={{ cursor: "pointer" }}
                >
                  {formatarNome(c.nome)}
                  {c.estrelasComentario && (
                    <span style={{ marginLeft: "8px", color: "#F5C518", fontSize: "13px" }}>
                      {c.estrelasComentario} ★
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
        </>
      )}
    </main>
  )
}

export default Musical