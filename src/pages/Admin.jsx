import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"

const ADMIN_UID = "LFDNXIXywqQrLsDLobaGzOOmok03"

function Admin() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(null)
  const [sugestoes, setSugestoes] = useState([])
  const [relatos, setRelatos] = useState([])
  const [musicais, setMusicais] = useState([])
  const [aba, setAba] = useState("sugestoes")
  const [carregando, setCarregando] = useState(true)
  const [capas, setCapas] = useState({})

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  useEffect(() => {
    async function buscarDados() {
      const q = query(collection(db, "sugestoes"), where("status", "==", "pendente"), orderBy("data", "desc"))
      const snap = await getDocs(q)
      setSugestoes(snap.docs.map(d => ({ id: d.id, ...d.data() })))

      const relatosSnap = await getDocs(query(collection(db, "relatorios"), orderBy("data", "desc")))
      setRelatos(relatosSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      const musicaisSnap = await getDocs(query(collection(db, "musicais"), orderBy("dataCriacao", "desc")))
      setMusicais(musicaisSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      setCarregando(false)
    }
    buscarDados()
  }, [])

  async function aprovar(sugestao) {
    await addDoc(collection(db, "musicais"), {
      titulo: sugestao.titulo || "",
      sinopse: sugestao.sinopse || "",
      direcao: sugestao.direcao || "",
      direcaoMusical: sugestao.direcaoMusical || "",
      producao: sugestao.producao || "",
      elenco: sugestao.elenco || "",
      elencoAdicional: sugestao.elencoAdicional || "",
      versionista: sugestao.versionista || "",
      textoOriginal: sugestao.textoOriginal || "",
      musicaOriginal: sugestao.musicaOriginal || "",
      ano: sugestao.ano || "",
      teatro: sugestao.teatro || "",
      capa: capas[sugestao.id] || "",
      totalVotos: 0,
      somaEstrelas: 0,
      dataCriacao: new Date()
    })

    await updateDoc(doc(db, "sugestoes", sugestao.id), { status: "aprovado" })
    setSugestoes(prev => prev.filter(s => s.id !== sugestao.id))
    setCapas(prev => { const next = { ...prev }; delete next[sugestao.id]; return next })
  }

  async function rejeitar(sugestaoId) {
    await updateDoc(doc(db, "sugestoes", sugestaoId), { status: "rejeitado" })
    setSugestoes(prev => prev.filter(s => s.id !== sugestaoId))
  }

  async function resolverRelato(relatoId) {
    await deleteDoc(doc(db, "relatorios", relatoId))
    setRelatos(prev => prev.filter(r => r.id !== relatoId))
  }

  async function deletarMusical(musicalId, titulo) {
    if (!window.confirm(`Tem certeza que quer deletar "${titulo}"? Esta ação não pode ser desfeita.`)) return
    await deleteDoc(doc(db, "musicais", musicalId))
    setMusicais(prev => prev.filter(m => m.id !== musicalId))
  }

  if (!usuario) return <main><p>Carregando...</p></main>
  if (usuario.uid !== ADMIN_UID) return <main><p>Acesso negado.</p></main>

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">Painel de administração</p>
      <h1 className="page-title">Admin</h1>

      <div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" }}>
        <button
          onClick={() => setAba("sugestoes")}
          className={aba === "sugestoes" ? "btn-comentar" : "btn-sair"}
        >
          Sugestões pendentes {sugestoes.length > 0 && `(${sugestoes.length})`}
        </button>
        <button
          onClick={() => setAba("relatos")}
          className={aba === "relatos" ? "btn-comentar" : "btn-sair"}
        >
          Relatos de erro {relatos.length > 0 && `(${relatos.length})`}
        </button>
        <button
          onClick={() => setAba("musicais")}
          className={aba === "musicais" ? "btn-comentar" : "btn-sair"}
        >
          Musicais publicados ({musicais.length})
        </button>
      </div>

      {carregando ? (
        <p style={{ color: "#888" }}>Carregando...</p>
      ) : aba === "sugestoes" ? (
        sugestoes.length === 0 ? (
          <p style={{ color: "#888" }}>Nenhuma sugestão pendente.</p>
        ) : (
          sugestoes.map(s => (
            <div key={s.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "12px" }}>{s.titulo}</h2>

              {s.sinopse && <p style={{ fontSize: "14px", color: "#444", marginBottom: "8px" }}><strong>Sinopse:</strong> {s.sinopse}</p>}
              {s.direcao && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Direção:</strong> {s.direcao}</p>}
              {s.direcaoMusical && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Direção musical:</strong> {s.direcaoMusical}</p>}
              {s.producao && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Produção:</strong> {s.producao}</p>}
              {s.elenco && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Elenco:</strong> {s.elenco}</p>}
              {s.elencoAdicional && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Elenco adicional:</strong> {s.elencoAdicional}</p>}
              {s.versionista && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Versionista:</strong> {s.versionista}</p>}
              {s.textoOriginal && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Texto original:</strong> {s.textoOriginal}</p>}
              {s.musicaOriginal && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Música original:</strong> {s.musicaOriginal}</p>}
              {s.ano && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Ano:</strong> {s.ano}</p>}
              {s.teatro && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Teatro:</strong> {s.teatro}</p>}

              <p style={{ fontSize: "13px", color: "#888", marginTop: "12px", marginBottom: "16px" }}>
                Sugerido por: {s.nome}
              </p>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                  URL da capa (opcional)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={capas[s.id] || ""}
                  onChange={e => setCapas(prev => ({ ...prev, [s.id]: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none", marginBottom: "8px" }}
                />
                {capas[s.id] && (
                  <img
                    src={capas[s.id]}
                    alt="Preview"
                    style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e8e4" }}
                  />
                )}
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button className="btn-comentar" onClick={() => aprovar(s)}>Aprovar e publicar</button>
                <button className="btn-sair" onClick={() => rejeitar(s.id)}>Rejeitar</button>
              </div>
            </div>
          ))
        )
      ) : aba === "relatos" ? (
        relatos.length === 0 ? (
          <p style={{ color: "#888" }}>Nenhum relato de erro.</p>
        ) : (
          relatos.map(r => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <p style={{ fontSize: "13px", fontWeight: "500", color: "#F5C518", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>
                {r.musicalTitulo}
              </p>
              <p style={{ fontSize: "15px", color: "#333", marginBottom: "12px", lineHeight: "1.6" }}>{r.texto}</p>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>
                Reportado por: {r.nome}
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button className="btn-comentar" onClick={() => navigate(`/musical/${r.musicalId}`)}>
                  Ver musical
                </button>
                <button className="btn-sair" onClick={() => resolverRelato(r.id)}>
                  Marcar como resolvido
                </button>
              </div>
            </div>
          ))
        )
      ) : (
        musicais.length === 0 ? (
          <p style={{ color: "#888" }}>Nenhum musical publicado.</p>
        ) : (
          musicais.map(m => (
            <div key={m.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "16px" }}>
              {m.capa ? (
                <img src={m.capa} alt={m.titulo} style={{ width: "48px", height: "64px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
              ) : (
                <div style={{ width: "48px", height: "64px", background: "#1a1a1a", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#F5C518", fontSize: "8px", textAlign: "center", padding: "4px" }}>{m.titulo}</span>
                </div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>{m.titulo}</p>
                <p style={{ fontSize: "13px", color: "#888" }}>{m.direcao || "—"} · {m.ano || "—"}</p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button className="btn-comentar" onClick={() => navigate(`/musical/${m.id}`)}>
                  Ver
                </button>
                <button
                  onClick={() => deletarMusical(m.id, m.titulo)}
                  style={{ background: "transparent", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "6px", padding: "7px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer" }}
                >
                  Deletar
                </button>
              </div>
            </div>
          ))
        )
      )}
    </main>
  )
}

export default Admin