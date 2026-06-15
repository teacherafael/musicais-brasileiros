import { useState, useEffect, useRef } from "react"
import { setDoc, doc, collection, onSnapshot, updateDoc, getDocs } from "firebase/firestore"
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth"
import { auth, provider, db } from "../firebase"
import { useNavigate } from "react-router-dom"

function Header() {
  const [usuario, setUsuario] = useState(null)
  const [notificacoes, setNotificacoes] = useState([])
  const [sinoAberto, setSinoAberto] = useState(false)
  const sinoRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  // Escuta notificações em tempo real
  useEffect(() => {
    if (!usuario) {
      setNotificacoes([])
      return
    }
    const q = collection(db, "notificacoes", usuario.uid, "itens")
    const unsub = onSnapshot(q, (snap) => {
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const da = a.data?.toDate ? a.data.toDate() : new Date(a.data || 0)
          const db2 = b.data?.toDate ? b.data.toDate() : new Date(b.data || 0)
          return db2 - da
        })
      setNotificacoes(lista)
    })
    return () => unsub()
  }, [usuario])

  // Fecha o painel ao clicar fora
  useEffect(() => {
    function handleClickFora(e) {
      if (sinoRef.current && !sinoRef.current.contains(e.target)) {
        setSinoAberto(false)
      }
    }
    document.addEventListener("mousedown", handleClickFora)
    return () => document.removeEventListener("mousedown", handleClickFora)
  }, [])

  const naoLidas = notificacoes.filter(n => !n.lida).length

  async function marcarTodasLidas() {
    if (!usuario) return
    const snap = await getDocs(collection(db, "notificacoes", usuario.uid, "itens"))
    await Promise.all(
      snap.docs
        .filter(d => !d.data().lida)
        .map(d => updateDoc(d.ref, { lida: true }))
    )
  }

  async function abrirSino() {
    setSinoAberto(prev => !prev)
    if (!sinoAberto && naoLidas > 0) {
      await marcarTodasLidas()
    }
  }

  function formatarTempo(data) {
    if (!data) return ""
    const d = data?.toDate ? data.toDate() : new Date(data)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return "agora"
    if (diff < 3600) return `${Math.floor(diff / 60)}min`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    return `${Math.floor(diff / 86400)}d`
  }

  const entrar = async () => {
    const resultado = await signInWithPopup(auth, provider)
    const user = resultado.user
    await setDoc(doc(db, "usuarios", user.uid), {
      nome: user.displayName,
      foto: user.photoURL,
    }, { merge: true })
  }

  const sair = () => signOut(auth)

  return (
    <header>
      <div
        className="logo"
        onClick={() => navigate("/")}
        style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: "10px" }}
      >
        <span style={{ color: "#F5C518" }}>MBD<span style={{ color: "#fff" }}>b</span></span>
        <span className="logo-subtitulo">Musicais Brasileiros Database</span>
      </div>

      <div className="header-right">
        <span
          onClick={() => navigate("/ranking")}
          style={{ fontSize: "14px", color: "#aaa", cursor: "pointer" }}
        >
          Top 15
        </span>
        <span
          onClick={() => navigate("/stats")}
          style={{ fontSize: "14px", color: "#aaa", cursor: "pointer" }}
        >
          Estatísticas
        </span>

        {usuario && (
          <div ref={sinoRef} style={{ position: "relative" }}>
            <button
              onClick={abrirSino}
              title="Notificações"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: "20px", color: naoLidas > 0 ? "#F5C518" : "#aaa" }}>🔔</span>
              {naoLidas > 0 && (
                <span style={{
                  position: "absolute",
                  top: "0px",
                  right: "0px",
                  background: "#e53e3e",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: "700",
                  borderRadius: "99px",
                  minWidth: "16px",
                  height: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
                  lineHeight: 1,
                }}>
                  {naoLidas > 9 ? "9+" : naoLidas}
                </span>
              )}
            </button>

            {sinoAberto && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                width: "300px",
                background: "#fff",
                border: "1px solid #e8e8e4",
                borderRadius: "10px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                zIndex: 999,
                overflow: "hidden",
              }}>
                <div style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #f0f0f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a1a" }}>Notificações</span>
                  {notificacoes.length > 0 && (
                    <button
                      onClick={marcarTodasLidas}
                      style={{ background: "none", border: "none", fontSize: "12px", color: "#b8960a", cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>

                {notificacoes.length === 0 ? (
                  <div style={{ padding: "24px 16px", textAlign: "center", color: "#aaa", fontSize: "13px" }}>
                    Nenhuma notificação ainda
                  </div>
                ) : (
                  <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                    {notificacoes.map(n => (
                      <div
                        key={n.id}
                        onClick={() => { if (n.link) { navigate(n.link); setSinoAberto(false) } }}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #f5f5f0",
                          background: n.lida ? "#fff" : "#fffbea",
                          cursor: n.link ? "pointer" : "default",
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ fontSize: "20px", flexShrink: 0, marginTop: "1px" }}>
                          {n.tipo === "reacao" ? n.emoji || "👍" : "👤"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "13px", color: "#1a1a1a", margin: 0, lineHeight: "1.4" }}>
                            {n.texto}
                          </p>
                          <p style={{ fontSize: "11px", color: "#aaa", margin: "3px 0 0", lineHeight: 1 }}>
                            {formatarTempo(n.data)}
                          </p>
                        </div>
                        {!n.lida && (
                          <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#F5C518", flexShrink: 0, marginTop: "5px" }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {usuario ? (
          <>
            {usuario.photoURL && (
              <img
                src={usuario.photoURL}
                alt="perfil"
                onClick={() => navigate(`/perfil/${usuario.uid}`)}
                style={{ width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", flexShrink: 0 }}
              />
            )}
            <span
              className="header-user header-user-nome"
              onClick={() => navigate(`/perfil/${usuario.uid}`)}
              style={{ cursor: "pointer" }}
            >
              Olá, {usuario.displayName}
            </span>
            <button className="btn-sair" onClick={sair}>Sair</button>
          </>
        ) : (
          <button className="btn-login btn-login-responsivo" onClick={entrar}>
            <span className="btn-login-texto-completo">Entrar com Google</span>
            <span className="btn-login-texto-curto">Entrar</span>
          </button>
        )}
      </div>
    </header>
  )
}

export default Header