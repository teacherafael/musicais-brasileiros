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
      <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        MBD<span>b</span>
      </div>
      <div className="header-right">
        {usuario ? (
          <>
            <span
  className="header-user"
  onClick={() => navigate(`/perfil/${usuario.uid}`)}
  style={{ cursor: "pointer" }}
>
  Olá, {usuario.displayName}
</span>
            <button className="btn-sair" onClick={sair}>Sair</button>
          </>
        ) : (
          <button className="btn-login" onClick={entrar}>Entrar com Google</button>
        )}
      </div>
    </header>
  )
}

export default Header