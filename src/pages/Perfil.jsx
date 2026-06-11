import { useEffect, useState } from "react"
import { collection, getDocs, query, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore"
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
  const [fotoUsuario, setFotoUsuario] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [top3, setTop3] = useState([])
  const [editandoTop3, setEditandoTop3] = useState(false)
  const [top3Selecionado, setTop3Selecionado] = useState([])
  const [buscaTop3, setBuscaTop3] = useState("")

  // estados do sistema de seguir
  const [seguindo, setSeguindo] = useState([])
  const [seguidores, setSeguidores] = useState([])
  const [jaSigo, setJaSigo] = useState(false)
  const [carregandoSeguir, setCarregandoSeguir] = useState(false)

  // estados para abrir/fechar listas
  const [mostrarSeguidores, setMostrarSeguidores] = useState(false)
  const [mostrarSeguindo, setMostrarSeguindo] = useState(false)

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
      let nomeEncontrado = ""

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
            if (!nomeEncontrado && dados.nome) nomeEncontrado = dados.nome
            comentariosEncontrados.push({ id: d.id, musicalId, ...dados })
          }
        })
      }

      if (nomeEncontrado) setNomeUsuario(nomeEncontrado)

      const queroVerSnap = await getDocs(collection(db, "usuarios", userId, "queroVer"))
      const queroVerLista = queroVerSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const jaViSnap = await getDocs(collection(db, "usuarios", userId, "jaVi"))
      const jaViLista = jaViSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      const top3Snap = await getDocs(collection(db, "usuarios", userId, "top3"))
      const top3Lista = top3Snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.ordem - b.ordem)
      setTop3(top3Lista)

      const seguindoSnap = await getDocs(collection(db, "usuarios", userId, "seguindo"))
      setSeguindo(seguindoSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      const seguidoresSnap = await getDocs(collection(db, "usuarios", userId, "seguidores"))
      setSeguidores(seguidoresSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      setVotos(votosEncontrados)
      setComentarios(comentariosEncontrados)
      setQueroVer(queroVerLista)
      setJaVi(jaViLista)
      setCarregando(false)
    }

    buscarDados()
  }, [userId])

  useEffect(() => {
    async function verificarSeguindo() {
      if (!usuarioLogado || usuarioLogado.uid === userId) return
      const ref = doc(db, "usuarios", usuarioLogado.uid, "seguindo", userId)
      const snap = await getDoc(ref)
      setJaSigo(snap.exists())
    }
    verificarSeguindo()
  }, [usuarioLogado, userId])

  async function toggleSeguir() {
    if (!usuarioLogado) return alert("Voce precisa estar logado para seguir alguem.")
    setCarregandoSeguir(true)

    const refMeuSeguindo = doc(db, "usuarios", usuarioLogado.uid, "seguindo", userId)
    const refSeguidorDele = doc(db, "usuarios", userId, "seguidores", usuarioLogado.uid)

    if (jaSigo) {
      await Promise.all([
        deleteDoc(refMeuSeguindo),
        deleteDoc(refSeguidorDele)
      ])
      setJaSigo(false)
      setSeguidores(prev => prev.filter(s => s.id !== usuarioLogado.uid))
    } else {
      const dadosAlvo = {
        userId,
        nome: nomeUsuario || "Usuario",
        foto: fotoUsuario || ""
      }
      const meusDados = {
        userId: usuarioLogado.uid,
        nome: usuarioLogado.displayName || "Usuario",
        foto: usuarioLogado.photoURL || ""
      }
      await Promise.all([
        setDoc(refMeuSeguindo, dadosAlvo),
        setDoc(refSeguidorDele, meusDados)
      ])
      setJaSigo(true)
      setSeguidores(prev => [...prev, { id: usuarioLogado.uid, ...meusDados }])
    }

    setCarregandoSeguir(false)
  }

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
      if (top3Selecionado.length >= 3) return alert("Voce ja selecionou 3 musicais.")
      setTop3Selecionado(prev => [...prev, musicalId])
    }
  }

  const isProprioPerfil = usuarioLogado && usuarioLogado.uid === userId
  const nomePerfil = isProprioPerfil ? usuarioLogado.displayName : nomeUsuario
  const fotoPerfil = isProprioPerfil ? usuarioLogado.photoURL : fotoUsuario

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

  const cardUsuario = (pessoa) => (
    <a
      key={pessoa.id}
      href={"/perfil/" + pessoa.userId}
      style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", background: "#f5f5f0" }}
    >
      {pessoa.foto
        ? <img src={pessoa.foto} alt={pessoa.nome} style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        : <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", fontSize: "16px", flexShrink: 0 }}>👤</div>
      }
      <span style={{ fontSize: "14px", fontWeight: "500" }}>{pessoa.nome || "Usuario"}</span>
    </a>
  )

  const estiloContador = {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: "14px",
    color: "#555",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    textDecoration: "underline",
    textDecorationColor: "#ccc"
  }

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>

      <div style={{ marginBottom: "32px" }}>
        {fotoPerfil && (
          <img
            src={fotoPerfil}
            alt={nomePerfil}
            style={{ width: "64px", height: "64px", borderRadius: "50%", marginBottom: "12px" }}
          />
        )}
        <h1 className="page-title">{nomePerfil || "Usuario"}</h1>
        {isProprioPerfil && <p style={{ color: "#888", fontSize: "14px" }}>Este e o seu perfil</p>}

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "12px", flexWrap: "wrap" }}>

          <button
            style={estiloContador}
            onClick={() => { setMostrarSeguidores(prev => !prev); setMostrarSeguindo(false) }}
          >
            <strong>{seguidores.length}</strong> {seguidores.length === 1 ? "seguidor" : "seguidores"}
          </button>

          <button
            style={estiloContador}
            onClick={() => { setMostrarSeguindo(prev => !prev); setMostrarSeguidores(false) }}
          >
            <strong>{seguindo.length}</strong> seguindo
          </button>

          {!isProprioPerfil && usuarioLogado && (
            <button
              onClick={toggleSeguir}
              disabled={carregandoSeguir}
              style={{
                padding: "6px 18px",
                borderRadius: "20px",
                border: jaSigo ? "1px solid #ccc" : "none",
                background: jaSigo ? "transparent" : "#F5C518",
                color: jaSigo ? "#555" : "#1a1a1a",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                fontWeight: "600",
                cursor: carregandoSeguir ? "not-allowed" : "pointer",
                opacity: carregandoSeguir ? 0.6 : 1
              }}
            >
              {carregandoSeguir ? "..." : jaSigo ? "Seguindo" : "Seguir"}
            </button>
          )}
        </div>

        {mostrarSeguidores && (
          <div style={{ marginTop: "16px", padding: "16px", border: "1px solid #e8e8e4", borderRadius: "8px", background: "#fafafa" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px", color: "#333" }}>
              Seguidores ({seguidores.length})
            </p>
            {seguidores.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#888" }}>Nenhum seguidor ainda.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {seguidores.map(cardUsuario)}
              </div>
            )}
          </div>
        )}

        {mostrarSeguindo && (
          <div style={{ marginTop: "16px", padding: "16px", border: "1px solid #e8e8e4", borderRadius: "8px", background: "#fafafa" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px", color: "#333" }}>
              Seguindo ({seguindo.length})
            </p>
            {seguindo.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#888" }}>Nao esta seguindo ninguem ainda.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {seguindo.map(cardUsuario)}
              </div>
            )}
          </div>
        )}

        {votos.length > 0 && (
          <div style={{ display: "flex", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
            <div style={{ background: "#1a1a1a", color: "#F5C518", borderRadius: "8px", padding: "10px 18px", display: "inline-flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "22px", fontWeight: "700" }}>★ {mediaVotos}</span>
              <span style={{ fontSize: "12px", color: "#888" }}>media pessoal</span>
            </div>
            <div style={{ background: "#f5f5f0", border: "1px solid #e8e8e4", borderRadius: "8px", padding: "10px 18px", display: "inline-flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "22px", fontWeight: "700" }}>{votos.length}</span>
              <span style={{ fontSize: "12px", color: "#888" }}>{votos.length === 1 ? "avaliacao" : "avaliacoes"}</span>
            </div>
          </div>
        )}
      </div>

      {/* TOP 3 */}
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
              Selecione ate 3 musicais favoritos ({top3Selecionado.length}/3)
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
                  <p className="card-meta">Direcao: {item.direcao || "—"}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* AVALIACOES */}
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "16px" }}>
        Avaliacoes ({votos.length})
      </h2>
      {votos.length === 0 ? (
        <p className="login-aviso" style={{ marginBottom: "32px" }}>Nenhuma avaliacao ainda.</p>
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

      {/* JA VI */}
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "16px" }}>
        Ja vi ({jaVi.length})
      </h2>
      {jaVi.length === 0 ? (
        <p className="login-aviso" style={{ marginBottom: "32px" }}>Nenhum musical marcado ainda.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "40px" }}>
          {jaVi.map(item => cardMusical(item, <p className="card-meta">Direcao: {item.direcao || "—"}</p>))}
        </div>
      )}

      {/* QUERO VER */}
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "16px" }}>
        Quero ver ({queroVer.length})
      </h2>
      {queroVer.length === 0 ? (
        <p className="login-aviso" style={{ marginBottom: "32px" }}>Nenhum musical marcado ainda.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "40px" }}>
          {queroVer.map(item => cardMusical(item, <p className="card-meta">Direcao: {item.direcao || "—"}</p>))}
        </div>
      )}

      {/* COMENTARIOS */}
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "16px" }}>
        Comentarios ({comentarios.length})
      </h2>
      {comentarios.length === 0 ? (
        <p className="login-aviso">Nenhum comentario ainda.</p>
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
