import { useState, useEffect } from "react"
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth"
import { auth, provider } from "../firebase"
import { useNavigate } from "react-router-dom"

function Header() {
  const [usuario, setUsuario] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  const entrar = () => signInWithPopup(auth, provider)
  const sair = () => signOut(auth)

  return (
    <header>
      <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer", display: "flex", alignItems: "baseline", gap: "10px" }}>
  <span style={{ color: "#F5C518" }}>MBD<span style={{ color: "#fff" }}>b</span></span>
  <span className="logo-subtitulo">
    Musicais Brasileiros Database
  </span>
</div>
      <div className="header-right">
        <span
          onClick={() => navigate("/ranking")}
          style={{ fontSize: "14px", color: "#aaa", cursor: "pointer" }}
        >
          Top 15
        </span>
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