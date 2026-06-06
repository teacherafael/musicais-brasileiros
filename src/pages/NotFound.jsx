import { useNavigate } from "react-router-dom"

function NotFound() {
  const navigate = useNavigate()

  return (
    <main style={{ textAlign: "center", paddingTop: "80px" }}>
      <p className="section-label">Erro 404</p>
      <h1 className="page-title" style={{ fontSize: "48px", marginBottom: "16px" }}>Página não encontrada</h1>
      <p style={{ color: "#888", fontSize: "16px", marginBottom: "32px" }}>
        A página que você está procurando não existe ou foi removida.
      </p>
      <button className="btn-comentar" onClick={() => navigate("/")}>
        Voltar para a Home
      </button>
    </main>
  )
}

export default NotFound