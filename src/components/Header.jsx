import { useState, useEffect, useRef } from "react"
import { setDoc, doc, getDoc, collection, onSnapshot, updateDoc, query, orderBy, limit } from "firebase/firestore"
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth"
import { auth, provider, db } from "../firebase"
import { useNavigate, Link } from "react-router-dom"
import emailjs from "@emailjs/browser"

// Detecta se o site foi aberto dentro de um navegador de app (WhatsApp, Instagram, etc.)
function navegadorDeApp() {
  const ua = navigator.userAgent || navigator.vendor || ""
  const apps = [
    "FBAN", "FBAV", "FB_IAB", "Instagram", "WhatsApp", "Line/",
    "Twitter", "TikTok", "musical_ly", "BytedanceWebview",
    "Messenger", "Snapchat", "LinkedIn", "Pinterest", "KAKAOTALK"
  ]
  if (apps.some(a => ua.includes(a))) return true
  // WebView do Android (apps que embutem o navegador): a marca "; wv" no user-agent.
  // Navegadores de verdade (Chrome, Firefox, Samsung Internet) NÃO têm essa marca.
  if (ua.includes("; wv")) return true
  return false
}

// iOS (iPhone/iPad) roda em WebKit não importa o navegador (Chrome, Firefox, etc
// também usam a engine do Safari por baixo). Por isso o signInWithRedirect quebra
// em qualquer navegador do iOS, não só no Safari.
function ehIOS() {
  const ua = navigator.userAgent || navigator.vendor || ""
  return /iPhone|iPad|iPod/.test(ua)
}

// Salva/atualiza nome e foto do usuário no Firestore (usado tanto no popup quanto no redirect)
async function salvarUsuario(user) {
  if (!user) return
  const refUsuario = doc(db, "usuarios", user.uid)
  const docSnap = await getDoc(refUsuario)
  await setDoc(refUsuario, {
    nome: user.displayName,
    foto: user.photoURL,
  }, { merge: true })
  // Só no primeiro cadastro: dispara o e-mail de boas-vindas
  if (!docSnap.exists() && user.email) {
    try {
      await emailjs.send(
        "service_n04arq6",
        "template_xmcjq1c",
        { nome: user.displayName || "", email: user.email },
        { publicKey: "S64BV4jJFtAi5B-Sd" }
      )
    } catch (e) {
      console.error("Falha ao enviar e-mail de boas-vindas:", e)
    }
  }
}

function Header() {
  const [usuario, setUsuario] = useState(null)
  const [notificacoes, setNotificacoes] = useState([])
  const [sinoAberto, setSinoAberto] = useState(false)
  const [appBrowser, setAppBrowser] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const sinoRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    setAppBrowser(navegadorDeApp())
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setUsuario(user))
    return () => unsub()
  }, [])

  // Quando o login acontece por redirecionamento (fallback), o usuário volta pra cá:
  // capturamos o resultado e salvamos os dados dele.
  useEffect(() => {
    getRedirectResult(auth)
      .then((resultado) => {
        if (resultado?.user) salvarUsuario(resultado.user)
      })
      .catch(() => {})
  }, [])

  // Escuta notificações em tempo real
  useEffect(() => {
    if (!usuario) {
      setNotificacoes([])
      return
    }
    const q = query(collection(db, "notificacoes", usuario.uid, "itens"), orderBy("data", "desc"), limit(20))
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
    await Promise.all(
      notificacoes
        .filter(n => !n.lida)
        .map(n => updateDoc(doc(db, "notificacoes", usuario.uid, "itens", n.id), { lida: true }))
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

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  const entrar = async () => {
    // Dentro de app (WhatsApp/Instagram) o login do Google não funciona
    if (appBrowser) {
      alert("Para entrar, abra o site no seu navegador.\n\nToque no menu (•••) aqui no canto e escolha \"Abrir no Safari\" ou \"Abrir no Chrome\".")
      return
    }
    try {
      const resultado = await signInWithPopup(auth, provider)
      await salvarUsuario(resultado.user)
    } catch (e) {
      // Usuário fechou a janelinha sozinho: não é erro, ignora
      if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") return
      // Popup bloqueado pelo navegador (comum no celular): tenta pelo redirecionamento.
      // No iOS isso não é confiável (qualquer navegador ali usa WebKit e perde o
      // sessionStorage entre a ida e a volta), então no iOS só avisamos o usuário.
      if (e?.code === "auth/popup-blocked" || e?.code === "auth/operation-not-supported-in-this-environment") {
        if (ehIOS()) {
          alert("Não foi possível entrar agora. Se o problema continuar, tente pelo Safari.")
          return
        }
        try {
          await signInWithRedirect(auth, provider)
          return
        } catch {
          alert("Não foi possível entrar agora. Tente novamente.")
          return
        }
      }
      alert("Não foi possível entrar agora. Tente novamente.")
    }
  }

  const sair = () => signOut(auth)

  return (
    <>
      {appBrowser && (
        <div style={{
          background: "#F5C518",
          color: "#1a1a1a",
          padding: "10px 16px",
          fontSize: "13px",
          fontFamily: "'DM Sans', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          flexWrap: "wrap",
          textAlign: "center",
          fontWeight: 600,
        }}>
          <span>⚠️ Você abriu dentro de um app. Para entrar e ver tudo, abra no seu navegador.</span>
          <button
            onClick={copiarLink}
            style={{
              background: "#1a1a1a",
              color: "#F5C518",
              border: "none",
              borderRadius: "6px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              flexShrink: 0,
            }}
          >
            {copiado ? "Link copiado ✓" : "Copiar link"}
          </button>
        </div>
      )}

      <header>
        <Link
  to="/"
  className="logo"
  style={{ cursor: "pointer", display: "flex", alignItems: "center", textDecoration: "none", gap: "12px" }}
>
  <img
    src="https://pub-c2de81da01f44e4aa685a9b28614c01d.r2.dev/logo/mcdb-logo.png"
    alt="MCDb — Musical Cast Database"
    style={{ height: "56px", width: "auto", display: "block" }}
  />
  <span className="logo-texto">Musical Cast Database</span>
</Link>

        <div className="header-right">
          <Link
            to="/ranking"
            style={{ fontSize: "14px", color: "#aaa", textDecoration: "none" }}
          >
            Top 15
          </Link>

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
                <Link to={`/perfil/${usuario.uid}`} style={{ flexShrink: 0, lineHeight: 0 }}>
                  <img
                    src={usuario.photoURL}
                    alt="perfil"
                    referrerPolicy="no-referrer"
                    style={{ width: "32px", height: "32px", borderRadius: "50%", display: "block" }}
                  />
                </Link>
              )}
              <Link
                to={`/perfil/${usuario.uid}`}
                className="header-user header-user-nome"
                style={{ textDecoration: "none", color: "#aaa" }}
              >
                Meu perfil
              </Link>
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
    </>
  )
}

export default Header
