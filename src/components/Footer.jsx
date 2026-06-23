import { useNavigate } from "react-router-dom"

function Footer() {
  const navigate = useNavigate()

  return (
    <footer style={{
      background: "#191E3B",
      padding: "24px 32px",
      marginTop: "60px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px"
    }}>
      <p style={{ fontSize: "13px", color: "#fff", textAlign: "center" }}>
  Musical Cast Database
</p>
<p style={{ fontSize: "13px", color: "#ccd6e4", textAlign: "center" }}>
  Feito com ❤️ para o teatro musical brasileiro
</p>
      <div style={{ display: "flex", gap: "20px" }}>
        <button
          onClick={() => navigate("/sobre")}
          style={{ background: "none", border: "none", fontSize: "13px", color: "#ccd6e4", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
        >
          Sobre
        </button>
        <button
          onClick={() => navigate("/termos")}
          style={{ background: "none", border: "none", fontSize: "13px", color: "#ccd6e4", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
        >
          Termos de Uso
        </button>
      </div>
      <p style={{ fontSize: "12px", color: "#9fb0c7" }}>© 2026 MCDb</p>
    </footer>
  )
}

export default Footer