import { useEffect, useState, useRef } from "react"
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, getDocs, deleteDoc, orderBy, query, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useParams, useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import ReportarErro from "../components/ReportarErro"
import html2canvas from "html2canvas"

const ADMIN_UID = "LFDNXIXywqQrLsDLobaGzOOmok03"



function Estrelas({ votoAtual, onVotar }) {
  const [hover, setHover] = useState(0)

  function calcularValor(e, estrela) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    return x < rect.width / 2 ? estrela - 0.5 : estrela
  }

  function corEstrela(estrela, valor) {
    if (valor >= estrela - 0.5) return "#F5C518"
    return "#ddd"
  }

  const valorAtivo = hover || votoAtual || 0

  return (
    <div style={{ display: "flex", gap: "4px", fontSize: "36px", cursor: "pointer", marginBottom: "8px" }}>
      {[1, 2, 3, 4, 5].map(estrela => {
        const cheia = valorAtivo >= estrela
        const meia = valorAtivo >= estrela - 0.5 && valorAtivo < estrela
        return (
          <span
            key={estrela}
            onClick={e => onVotar(calcularValor(e, estrela))}
            onMouseMove={e => setHover(calcularValor(e, estrela))}
            onMouseLeave={() => setHover(0)}
            style={{ position: "relative", display: "inline-block", userSelect: "none", lineHeight: 1 }}
          >
            {meia ? (
              <>
                <span style={{ color: "#ddd" }}>★</span>
                <span style={{ position: "absolute", left: 0, top: 0, width: "50%", overflow: "hidden", color: "#F5C518" }}>★</span>
              </>
            ) : (
              <span style={{ color: cheia ? "#F5C518" : "#ddd" }}>★</span>
            )}
          </span>
        )
      })}
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
  const [jaVi, setJaVi] = useState(false)
  const [comentarios, setComentarios] = useState([])
  const [textoComentario, setTextoComentario] = useState("")
  const [editandoComentario, setEditandoComentario] = useState(null)
  const [textoEdicao, setTextoEdicao] = useState("")
  const [editandoMusical, setEditandoMusical] = useState(false)
  const [formEdicao, setFormEdicao] = useState({})
  const [gerando, setGerando] = useState(false)
  const [denunciandoComentario, setDenunciandoComentario] = useState(null)
  const [textoDenuncia, setTextoDenuncia] = useState("")
  const [denunciaEnviada, setDenunciaEnviada] = useState(null)
  const cartaoRef = useRef(null)

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
    async function buscarEstados() {
      if (!usuario) return
      const votoSnap = await getDoc(doc(db, "musicais", id, "votos", usuario.uid))
      if (votoSnap.exists()) setVotoAtual(votoSnap.data().estrelas)
      const queroVerSnap = await getDoc(doc(db, "usuarios", usuario.uid, "queroVer", id))
      setQueroVer(queroVerSnap.exists())
      const jaViSnap = await getDoc(doc(db, "usuarios", usuario.uid, "jaVi", id))
      setJaVi(jaViSnap.exists())
    }
    buscarEstados()
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
      await updateDoc(doc(db, "musicais", id), { somaEstrelas: increment(estrelas - votoAtual) })
      await setDoc(doc(db, "musicais", id, "votos", usuario.uid), { estrelas })
      setMusical(prev => ({ ...prev, somaEstrelas: prev.somaEstrelas + (estrelas - votoAtual) }))
    } else {
      await setDoc(doc(db, "musicais", id, "votos", usuario.uid), { estrelas })
      await updateDoc(doc(db, "musicais", id), { totalVotos: increment(1), somaEstrelas: increment(estrelas) })
      setMusical(prev => ({ ...prev, totalVotos: prev.totalVotos + 1, somaEstrelas: prev.somaEstrelas + estrelas }))
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
      await setDoc(ref, { musicalId: id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" })
      setQueroVer(true)
    }
  }

  async function toggleJaVi() {
    if (!usuario) return alert("Faça login para usar esta função.")
    const refJaVi = doc(db, "usuarios", usuario.uid, "jaVi", id)
    const refQueroVer = doc(db, "usuarios", usuario.uid, "queroVer", id)
    if (jaVi) {
      await deleteDoc(refJaVi)
      setJaVi(false)
    } else {
      await setDoc(refJaVi, { musicalId: id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" })
      await deleteDoc(refQueroVer)
      setJaVi(true)
      setQueroVer(false)
    }
  }

  async function gerarImagem() {
    if (!cartaoRef.current) return
    setGerando(true)
    try {
      const canvas = await html2canvas(cartaoRef.current, { useCORS: true, scale: 2, backgroundColor: null })
      const link = document.createElement("a")
      link.download = `${musical.titulo}-mbdb.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (e) {
      alert("Erro ao gerar imagem. Tente novamente.")
    }
    setGerando(false)
  }

  async function enviarComentario() {
    if (!usuario) return alert("Faça login para comentar.")
    if (!textoComentario.trim()) return
    const confirmado = window.confirm("Lembre-se de manter sua crítica respeitosa e sem ataques à produção. Deseja publicar o comentário?")
    if (!confirmado) return
    const novoComentario = {
      nome: usuario.displayName || "Anônimo",
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
    setComentarios(prev => prev.map(c => c.id === comentarioId ? { ...c, texto: textoEdicao } : c))
    setEditandoComentario(null)
    setTextoEdicao("")
  }

  async function enviarDenuncia(comentario) {
    if (!textoDenuncia.trim()) return
    await addDoc(collection(db, "relatorios"), {
      tipo: "denuncia_comentario",
      musicalId: id,
      musicalTitulo: musical.titulo,
      comentarioId: comentario.id,
      comentarioTexto: comentario.texto,
      comentarioAutor: comentario.nome,
      texto: textoDenuncia,
      nome: usuario ? (usuario.displayName || "Anônimo") : "Anônimo",
      userId: usuario ? usuario.uid : null,
      data: serverTimestamp()
    })
    setDenunciaEnviada(comentario.id)
    setDenunciandoComentario(null)
    setTextoDenuncia("")
    setTimeout(() => setDenunciaEnviada(null), 3000)
  }

  if (!musical) return <main><p>Carregando...</p></main>

  const media = musical.totalVotos > 0
    ? (musical.somaEstrelas / musical.totalVotos).toFixed(1)
    : null

  const estrelasSVG = (nota) => {
    return [1, 2, 3, 4, 5].map(i => {
      const cheia = nota >= i
      const meia = nota >= i - 0.5 && nota < i
      const cor = (cheia || meia) ? "#1a1a1a" : "rgba(0,0,0,0.2)"
      return <span key={i} style={{ color: cor, fontSize: "24px" }}>★</span>
    })
  }

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
            <img src={formEdicao.capa} alt="Preview" style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e8e4", marginBottom: "16px" }} />
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
                  <span className="rating-grande-label">{musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"}</span>
                </div>
              ) : (
                <div className="rating-grande">— <span className="rating-grande-label">sem votos ainda</span></div>
              )}
              {usuario && usuario.uid === ADMIN_UID && (
                <button onClick={abrirEdicao} style={{ marginTop: "12px", background: "none", border: "1px solid #ccc", borderRadius: "6px", padding: "6px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}>
                  ✏️ Editar musical
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <button onClick={toggleJaVi} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: jaVi ? "#1a1a1a" : "transparent", color: jaVi ? "#F5C518" : "#888", border: "1px solid", borderColor: jaVi ? "#1a1a1a" : "#ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>
              {jaVi ? "✓ Já vi" : "Já vi"}
            </button>
            <button onClick={toggleQueroVer} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: queroVer ? "#F5C518" : "transparent", color: queroVer ? "#1a1a1a" : "#888", border: "1px solid", borderColor: queroVer ? "#F5C518" : "#ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>
              {queroVer ? "✓ Quero ver" : "+ Quero ver"}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copiado!") }} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "transparent", color: "#888", border: "1px solid #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>
              🔗 Copiar link
            </button>
          </div>

          {musical.sinopse && (
  <div style={{ marginBottom: "24px" }}>
    <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Sinopse</p>
    <p className="sinopse" style={{ marginBottom: 0 }}>{musical.sinopse}</p>
  </div>
)}

          {musical.elenco && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Elenco</p>
              <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75" }}>{musical.elenco}</p>
            </div>
          )}

          {musical.elencoAdicional && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Elenco adicional</p>
              <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75" }}>{musical.elencoAdicional}</p>
            </div>
          )}

          <hr className="divider" />

          <p className="avaliacao-titulo">
            {votoAtual ? `Sua avaliação: ${votoAtual} ★ (clique para mudar)` : "Avalie este musical"}
          </p>

          <Estrelas votoAtual={votoAtual} onVotar={votar} />

          {votoAtual && (
            <div style={{ marginTop: "16px", marginBottom: "8px" }}>
              <div ref={cartaoRef} style={{ position: "absolute", left: "-9999px", top: "-9999px", background: "#F5C518", borderRadius: "16px", padding: "40px 32px", display: "flex", flexDirection: "column", alignItems: "center", width: "270px", minHeight: "420px", justifyContent: "flex-start", paddingTop: "48px" }}>
                {musical.capa ? (
                  <img src={musical.capa} alt={musical.titulo} crossOrigin="anonymous" style={{ width: "160px", height: "220px", objectFit: "cover", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }} />
                ) : (
                  <div style={{ width: "160px", height: "220px", background: "#1a1a1a", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
                    <span style={{ color: "#F5C518", fontSize: "12px", textAlign: "center", padding: "12px" }}>{musical.titulo}</span>
                  </div>
                )}
                <p style={{ fontFamily: "Georgia, serif", fontSize: "17px", fontWeight: "700", color: "#1a1a1a", textAlign: "center", marginBottom: "6px", lineHeight: 1.3 }}>{musical.titulo}</p>
                <p style={{ fontSize: "12px", color: "#1a1a1a", opacity: 0.6, textAlign: "center", marginBottom: "16px" }}>Dir. {musical.direcao || "—"}</p>
                <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>{estrelasSVG(votoAtual)}</div>
                <div style={{ width: "40px", height: "1px", background: "#1a1a1a", opacity: 0.2, marginBottom: "12px" }} />
                <p style={{ fontFamily: "Georgia, serif", fontSize: "11px", fontWeight: "400", color: "#1a1a1a", opacity: 0.5, letterSpacing: "2px", textTransform: "uppercase", textAlign: "center" }}>Musicais Brasileiros Database</p>
              </div>
              <div style={{ marginTop: "12px" }}>
                <button onClick={gerarImagem} disabled={gerando} style={{ background: "#F5C518", color: "#1a1a1a", border: "none", borderRadius: "6px", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: "500", cursor: gerando ? "wait" : "pointer" }}>
                  {gerando ? "Gerando..." : "⬇ Baixar imagem para compartilhar"}
                </button>
              </div>
            </div>
          )}

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
              <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>
                Lembre-se de manter sua crítica respeitosa e sem ataques a produção.
              </p>
              <button className="btn-comentar" onClick={enviarComentario}>Enviar comentário</button>
            </div>
          ) : (
            <p className="login-aviso">Faça login para comentar.</p>
          )}

          {!usuario ? (
            <p className="login-aviso" style={{ marginTop: "16px" }}>Faça login para ver os comentários.</p>
          ) : comentarios.length === 0 ? (
            <p className="login-aviso" style={{ marginTop: "16px" }}>Nenhum comentário ainda.</p>
          ) : (
            comentarios.map(c => (
              <div key={c.id} className="comentario-item">
                <p className="comentario-nome" onClick={() => navigate(`/perfil/${c.userId}`)} style={{ cursor: "pointer" }}>
                  {c.nome || "Anônimo"}
                  {c.estrelasComentario && (
                    <span style={{ marginLeft: "8px", color: "#F5C518", fontSize: "13px" }}>{c.estrelasComentario} ★</span>
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

                    <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
                      {usuario && usuario.uid === c.userId && (
                        <>
                          <button onClick={() => { setEditandoComentario(c.id); setTextoEdicao(c.texto) }} style={{ background: "none", border: "none", fontSize: "13px", color: "#888", cursor: "pointer", padding: 0 }}>
                            Editar
                          </button>
                          <button onClick={() => deletarComentario(c.id)} style={{ background: "none", border: "none", fontSize: "13px", color: "#cc0000", cursor: "pointer", padding: 0 }}>
                            Apagar
                          </button>
                        </>
                      )}
                      {usuario && usuario.uid !== c.userId && (
                        <>
                          {denunciaEnviada === c.id ? (
                            <span style={{ fontSize: "13px", color: "#888" }}>Denúncia enviada!</span>
                          ) : denunciandoComentario === c.id ? (
                            <div style={{ width: "100%", marginTop: "8px" }}>
                              <textarea
                                value={textoDenuncia}
                                onChange={e => setTextoDenuncia(e.target.value)}
                                placeholder="Descreva o motivo da denúncia..."
                                style={{ width: "100%", height: "70px", padding: "8px", borderRadius: "6px", border: "1px solid #e8e8e4", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", marginBottom: "8px", resize: "none" }}
                              />
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button className="btn-comentar" onClick={() => enviarDenuncia(c)} style={{ fontSize: "13px", padding: "6px 14px" }}>Enviar</button>
                                <button className="btn-sair" onClick={() => { setDenunciandoComentario(null); setTextoDenuncia("") }} style={{ fontSize: "13px", padding: "6px 14px" }}>Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setDenunciandoComentario(c.id)} style={{ background: "none", border: "none", fontSize: "13px", color: "#bbb", cursor: "pointer", padding: 0 }}>
                              Denunciar
                            </button>
                          )}
                        </>
                      )}
                    </div>
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