import { useEffect, useState } from "react"
import { collection, getDocs, query, doc, setDoc, deleteDoc } from "firebase/firestore"
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
  const [jaVi, setJaVi] = useState([])
  const [musicais, setMusicais] = useState({})
  const [nomeUsuario, setNomeUsuario] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [top3, setTop3] = useState([])
  const [editandoTop3, setEditandoTop3] = useState(false)
  const [top3Selecionado, setTop3Selecionado] = useState([])
  const [buscaTop3, setBuscaTop3] = useState("")

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

      const jaViSnap = await getDocs(collection(db, "usuarios", userId, "jaVi"))
      const jaViLista = jaViSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const top3Snap = await getDocs(collection(db, "usuarios", userId, "top3"))
      const top3Lista = top3Snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.ordem - b.ordem)
      setTop3(top3Lista)

      setVotos(votosEncontrados)
      setComentarios(comentariosEncontrados)
      setQueroVer(queroVerLista)
      setJaVi(jaViLista)
      setCarregando(false)
    }

    buscarDados()
  }, [userId])

  async function salvarTop3() {
    const snap = await getDocs(collection(db, "usuarios", userId, "top3"))
    for (const d of snap.docs) await deleteDoc(d.ref)

    for (let i = 0; i < top3Selecionado.length; i++) {
      const m = musicais[top3Selecionado[i]]
      if (m) {
        await setDoc(doc(db, "usuarios", userId, "top3", m.id), {
          musicalId: m.id,
          titulo: m.titulo,
          capa: m.capa || null,
          direcao: m.direcao || "",
          ordem: i
        })
      }
    }

    const novoTop3 = top3Selecionado
      .map((id, i) => ({ id, musicalId: id, ordem: i, ...musicais[id] }))
      .filter(Boolean)
    setTop3(novoTop3)
    setEditandoTop3(false)
    setBuscaTop3("")
  }

  function toggleTop3(musicalId) {
    if (top3Selecionado.includes(musicalId)) {
      setTop3Selecionado(prev => prev.filter(id => id !== musicalId))
    } else {
      if (top3Selecionado.length >= 3) return alert("Você já selecionou 3 musicais.")
      setTop3Selecionado(prev => [...prev, musicalId])
    }
  }

  const isProprioPerfil = usuarioLogado && usuarioLogado.uid === userId
  const nomePerfil = isProprioPerfil ? usuarioLogado.displayName : nomeUsuario

  const mediaVotos = votos.length > 0
    ? (votos.reduce((acc, v) => acc + v.estrelas, 0) / votos.length).toFixed(1)
    : null

  if (carregando) return <main><p>Carregando...</p></main>

  const musicaisFiltradosTop3 = Object.values(musicais).filter(m =>
    m.titulo.toLowerCase().includes(buscaTop3.toLowerCase())
  )

  const cardMusical = (item, extra) => (
    <a
      key={item.id}
      href={"/musical/" + item.musicalId}
      className="card-musical"
      style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div style={{ width: "100%", height: "280px", marginBottom: "12px" }}>
        {item.capa
          ? <img src={item.capa} alt={item.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
          : <div style={{ width: "100%", height: "100%", background: "#1a1a1a", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{item.titulo}</div>
        }
      </div>
      <div style={{ width: "100%" }}>
        <p className="card-titulo">{item.titulo}</p>
        {extra}
      </div>
    </a>
  )

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

        {votos.length > 0 && (
          <div style={{ display: "flex", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
            <div style={{ background: "#1a1a1a", color: "#F5C518", borderRadius: "8px", padding: "10px 18px", display: "inline-flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "22px", fontWeight: "700" }}>★ {mediaVotos}</span>
              <span style={{ fontSize: "12px", color: "#888" }}>média pessoal</span>
            </div>
            <div style={{ background: "#f5f5f0", border: "1px solid #e8e8e4", borderRadius: "8px", padding: "10px 18px", display: "inline-flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "22px", fontWeight: "700" }}>{votos.length}</span>
              <span style={{ fontSize: "12px", color: "#888" }}>{votos.length === 1 ? "avaliação" : "avaliações"}</span>
            </div>
          </div>
        )}
      </div>

      {/* MEU TOP 3 */}
      <div style={{ marginBottom: "40px", background: "#1a1a1a", borderRadius: "16px", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "26px", color: "#F5C518", letterSpacing: "1px" }}>✦ Meu Top 3</h2>
          {isProprioPerfil && !editandoTop3 && (
            <button
              onClick={() => {
                setTop3Selecionado(top3.map(t => t.musicalId))
                setEditandoTop3(true)
              }}
              style={{ background: "none", border: "none", fontSize: "13px", color: "#666", cursor: "pointer", padding: 0 }}
            >
              ✏️ Editar
            </button>
          )}
        </div>

        {editandoTop3 ? (
          <div>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>
              Selecione até 3 musicais favoritos ({top3Selecionado.length}/3)
            </p>
            <input
              type="text"
              placeholder="Buscar musical..."
              value={buscaTop3}
              onChange={e => setBuscaTop3(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", marginBottom: "12px" }}
            />
            <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #333", borderRadius: "8px", marginBottom: "16px" }}>
              {musicaisFiltradosTop3.map(m => (
                <div
                  key={m.id}
                  onClick={() => toggleTop3(m.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 14px", cursor: "pointer",
                    background: top3Selecionado.includes(m.id) ? "#2a2a1a" : "#222",
                    borderBottom: "1px solid #333"
                  }}
                >
                  {m.capa
                    ? <img src={m.capa} alt={m.titulo} style={{ width: "32px", height: "44px", objectFit: "cover", borderRadius: "3px", flexShrink: 0 }} />
                    : <div style={{ width: "32px", height: "44px", background: "#333", borderRadius: "3px", flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: "500", color: "#fff" }}>{m.titulo}</p>
                    <p style={{ fontSize: "12px", color: "#666" }}>{m.direcao || "—"}</p>
                  </div>
                  {top3Selecionado.includes(m.id) && (
                    <span style={{ color: "#F5C518", fontSize: "18px" }}>★</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-comentar" onClick={salvarTop3}>Salvar</button>
              <button className="btn-sair" onClick={() => { setEditandoTop3(false); setBuscaTop3("") }}>Cancelar</button>
            </div>
          </div>
        ) : top3.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#666", fontStyle: "italic" }}>
            {isProprioPerfil ? "Clique em editar para escolher seus 3 musicais favoritos." : "Nenhum favorito definido ainda."}
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
   
            {top3.map((item, i) => (
              <a
                key={item.id}
                href={"/musical/" + item.musicalId}
                className="card-musical"
                style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", border: "2px solid #F5C518" }}
              >
                <div style={{ position: "absolute", top: "8px", left: "8px", background: "#F5C518", color: "#1a1a1a", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", zIndex: 1 }}>
                  {i + 1}
                </div>
                <div style={{ width: "100%", height: "280px", marginBottom: "12px" }}>
                  {item.capa
                    ? <img src={item.capa} alt={item.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
                    : <div style={{ width: "100%", height: "100%", background: "#333", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{item.titulo}</div>
                  }
                </div>
                <div style={{ width: "100%" }}>
                  <p className="card-titulo">{item.titulo}</p>
                  <p className="card-meta">Direção: {item.direcao || "—"}</p>
                </div>
              </a>
            ))}
          </div>
        )}
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
            return cardMusical(
              { id: voto.musicalId, musicalId: voto.musicalId, ...musical },
              <div className="rating-badge">★ {voto.estrelas}</div>
            )
          })}
        </div>
      )}

      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "16px" }}>
        Já vi ({jaVi.length})
      </h2>

      {jaVi.length === 0 ? (
        <p className="login-aviso" style={{ marginBottom: "32px" }}>Nenhum musical marcado ainda.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "40px" }}>
          {jaVi.map(item => cardMusical(item, <p className="card-meta">Direção: {item.direcao || "—"}</p>))}
        </div>
      )}

      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "16px" }}>
        Quero ver ({queroVer.length})
      </h2>

      {queroVer.length === 0 ? (
        <p className="login-aviso" style={{ marginBottom: "32px" }}>Nenhum musical marcado ainda.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "40px" }}>
          {queroVer.map(item => cardMusical(item, <p className="card-meta">Direção: {item.direcao || "—"}</p>))}
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
            <a
              key={c.id}
              href={"/musical/" + c.musicalId}
              className="comentario-item"
              style={{ display: "block", textDecoration: "none", color: "inherit", cursor: "pointer" }}
            >
              <p style={{ fontSize: "13px", fontWeight: "500", color: "#F5C518", marginBottom: "4px" }}>
                {musical?.titulo}
              </p>
              <p className="comentario-texto">{c.texto}</p>
            </a>
          )
        })
      )}
    </main>
  )
}

export default Perfil