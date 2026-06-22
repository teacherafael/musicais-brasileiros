import { useNavigate } from "react-router-dom"

function Footer() {
  const navigate = useNavigate()

  return (
    <footer style={{
      background: "#1a1a1a",
      padding: "24px 32px",
      marginTop: "60px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "12px"
    }}>
      <p style={{ fontSize: "12px", color: "#555", textAlign: "center" }}>
  Musicais Brasileiros Database
</p>
<p style={{ fontSize: "12px", color: "#555", textAlign: "center" }}>
  Feito com ❤️ para o teatro musical brasileiro
</p>
      <div style={{ display: "flex", gap: "20px" }}>
        <button
          onClick={() => navigate("/termos")}
          style={{ background: "none", border: "none", fontSize: "12px", color: "#888", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
        >
          Termos de Uso
        </button>
      </div>
      <p style={{ fontSize: "11px", color: "#444" }}>© 2026 MBDb</p>
    </footer>
  )
}

export default Footer