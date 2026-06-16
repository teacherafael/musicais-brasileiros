import { useEffect, useState } from "react"
import { collection, query, where, onSnapshot, doc, getDoc, orderBy } from "firebase/firestore"
import { db, auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useNavigate } from "react-router-dom"

function Mensagens() {
  const [usuario, setUsuario] = useState(null)
  const [conversas, setConversas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  useEffect(() => {
    if (!usuario) return

    const q = query(
      collection(db, "conversas"),
      where("participantes", "array-contains", usuario.uid),
      orderBy("ultimaMensagemData", "desc")
    )

    const unsub = onSnapshot(q, async (snap) => {
      const lista = await Promise.all(snap.docs.map(async d => {
        const dados = { id: d.id, ...d.data() }
        const outroUid = dados.participantes.find(p => p !== usuario.uid)
        const outroSnap = await getDoc(doc(db, "usuarios", outroUid))
        const outro = outroSnap.exists() ? outroSnap.data() : {}
        return {
          ...dados,
          outroUid,
          outroNome: outro.nome || "Usuário",
          outroFoto: outro.foto || null,
        }
      }))
      setConversas(lista)
      setCarregando(false)
    })

    return () => unsub()
  }, [usuario])

  if (!usuario) return (
    <main>
      <p style={{ color: "#888", fontSize: "14px" }}>Faça login para ver suas mensagens.</p>
    </main>
  )

  return (
    <main>
      <button className="voltar" onClick={() => navigate(-1)}>← Voltar</button>
      <h1 className="page-title" style={{ marginBottom: "24px" }}>Mensagens</h1>

      {carregando ? (
        <p style={{ color: "#888", fontSize: "14px" }}>Carregando...</p>
      ) : conversas.length === 0 ? (
        <p style={{ color: "#888", fontSize: "14px" }}>Nenhuma conversa ainda.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "560px" }}>
          {conversas.map(c => {
            const naoLidas = c.naoLidas?.[usuario.uid] || 0
            return (
              <div
                key={c.id}
                onClick={() => navigate(`/mensagens/${c.id}`)}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  padding: "14px 16px", border: "1px solid #e8e8e4",
                  borderRadius: "10px", cursor: "pointer",
                  background: naoLidas > 0 ? "#fffbea" : "#fff",
                  transition: "background 0.15s"
                }}
              >
                {c.outroFoto
                  ? <img src={c.outroFoto} alt={c.outroNome} style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", fontSize: "18px", flexShrink: 0 }}>👤</div>
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "14px", fontWeight: naoLidas > 0 ? "700" : "500", color: "#1a1a1a", marginBottom: "3px" }}>
                    {c.outroNome}
                  </p>
                  <p style={{ fontSize: "13px", color: "#888", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.ultimaMensagem || "..."}
                  </p>
                </div>
                {naoLidas > 0 && (
                  <div style={{ background: "#F5C518", color: "#1a1a1a", borderRadius: "99px", minWidth: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", padding: "0 6px", flexShrink: 0 }}>
                    {naoLidas}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}

export default Mensagens