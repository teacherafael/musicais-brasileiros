import { useEffect, useState, useRef } from "react"
import { collection, doc, getDoc, addDoc, onSnapshot, orderBy, query, updateDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useParams, useNavigate } from "react-router-dom"

function Conversa() {
  const { conversaId } = useParams()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(null)
  const [conversa, setConversa] = useState(null)
  const [outroUsuario, setOutroUsuario] = useState(null)
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const fimRef = useRef(null)

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  useEffect(() => {
    if (!usuario) return

    async function buscarConversa() {
      const snap = await getDoc(doc(db, "conversas", conversaId))
      if (!snap.exists()) return navigate("/mensagens")
      const dados = snap.data()

      // Verifica se o usuário faz parte da conversa
      if (!dados.participantes.includes(usuario.uid)) return navigate("/mensagens")

      setConversa({ id: snap.id, ...dados })

      const outroUid = dados.participantes.find(p => p !== usuario.uid)
      const outroSnap = await getDoc(doc(db, "usuarios", outroUid))
      setOutroUsuario({ uid: outroUid, ...(outroSnap.exists() ? outroSnap.data() : { nome: "Usuário" }) })

      // Zera contador de não lidas
      await updateDoc(doc(db, "conversas", conversaId), {
        [`naoLidas.${usuario.uid}`]: 0
      })
    }

    buscarConversa()
  }, [usuario, conversaId])

  useEffect(() => {
    if (!conversaId) return

    const q = query(
      collection(db, "conversas", conversaId, "mensagens"),
      orderBy("data", "asc")
    )

    const unsub = onSnapshot(q, (snap) => {
      setMensagens(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setTimeout(() => fimRef.current?.scrollIntoView({ behavior: "smooth" }), 50)
    })

    return () => unsub()
  }, [conversaId])

  // Zera não lidas quando chega mensagem nova
  useEffect(() => {
    if (!usuario || mensagens.length === 0) return
    updateDoc(doc(db, "conversas", conversaId), {
      [`naoLidas.${usuario.uid}`]: 0
    }).catch(() => {})
  }, [mensagens.length])

  async function enviarMensagem() {
    if (!texto.trim() || !usuario || enviando) return
    setEnviando(true)

    const outroUid = conversa.participantes.find(p => p !== usuario.uid)

    await addDoc(collection(db, "conversas", conversaId, "mensagens"), {
      texto: texto.trim(),
      de: usuario.uid,
      para: outroUid,
      data: serverTimestamp(),
    })

    await updateDoc(doc(db, "conversas", conversaId), {
      ultimaMensagem: texto.trim(),
      ultimaMensagemData: serverTimestamp(),
      [`naoLidas.${outroUid}`]: (conversa.naoLidas?.[outroUid] || 0) + 1,
    })

    // Notificação para o destinatário
    try {
      await addDoc(collection(db, "notificacoes", outroUid, "itens"), {
        tipo: "mensagem",
        de: usuario.displayName || "Alguém",
        texto: `${usuario.displayName || "Alguém"} te enviou uma mensagem`,
        link: `/mensagens/${conversaId}`,
        lida: false,
        data: serverTimestamp(),
      })
    } catch (e) {}

    setTexto("")
    setEnviando(false)
  }

  function formatarHora(data) {
    if (!data) return ""
    const d = data?.toDate ? data.toDate() : new Date(data)
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }

  if (!usuario || !conversa || !outroUsuario) return <main><p>Carregando...</p></main>

  return (
    <main style={{ display: "flex", flexDirection: "column", maxWidth: "560px", margin: "0 auto", height: "calc(100vh - 160px)" }}>
      {/* Cabeçalho da conversa */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button className="voltar" onClick={() => navigate("/mensagens")} style={{ marginBottom: 0 }}>← Voltar</button>
        {outroUsuario.foto
          ? <img src={outroUsuario.foto} alt={outroUsuario.nome} style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover" }} />
          : <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", fontSize: "16px" }}>👤</div>
        }
        <a href={`/perfil/${outroUsuario.uid}`} style={{ fontSize: "15px", fontWeight: "600", color: "#1a1a1a", textDecoration: "none" }}>
          {outroUsuario.nome || "Usuário"}
        </a>
      </div>

      {/* Mensagens */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "16px" }}>
        {mensagens.length === 0 && (
          <p style={{ fontSize: "13px", color: "#bbb", textAlign: "center", marginTop: "32px" }}>
            Nenhuma mensagem ainda. Diga olá!
          </p>
        )}
        {mensagens.map(m => {
          const minha = m.de === usuario.uid
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: minha ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "75%",
                background: minha ? "#1a1a1a" : "#f0f0eb",
                color: minha ? "#F5C518" : "#1a1a1a",
                borderRadius: minha ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "10px 14px",
              }}>
                <p style={{ fontSize: "14px", lineHeight: "1.5", margin: 0 }}>{m.texto}</p>
                <p style={{ fontSize: "11px", color: minha ? "#888" : "#aaa", margin: "4px 0 0", textAlign: "right" }}>
                  {formatarHora(m.data)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={fimRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: "10px", paddingTop: "12px", borderTop: "1px solid #e8e8e4" }}>
        <input
          type="text"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && enviarMensagem()}
          placeholder="Escreva uma mensagem..."
          style={{
            flex: 1, padding: "10px 14px", border: "1px solid #e8e8e4",
            borderRadius: "8px", fontFamily: "'DM Sans', sans-serif",
            fontSize: "14px", outline: "none"
          }}
        />
        <button
          onClick={enviarMensagem}
          disabled={!texto.trim() || enviando}
          style={{
            background: "#F5C518", color: "#1a1a1a", border: "none",
            borderRadius: "8px", padding: "10px 18px",
            fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
            fontWeight: "600", cursor: texto.trim() ? "pointer" : "not-allowed",
            opacity: texto.trim() ? 1 : 0.5
          }}
        >
          Enviar
        </button>
      </div>
    </main>
  )
}

export default Conversa