import { useState } from "react"
import { useNavigate } from "react-router-dom"
import QRCode from "qrcode"

function Footer() {
  const navigate = useNavigate()
  const [qrUrl, setQrUrl] = useState(null)

  const pixPayload = "00020126450014BR.GOV.BCB.PIX0123musicalcastbr@gmail.com5204000053039865802BR5920Rafael Luiz Nogueira6009SAO PAULO621405108kiqRR0vuY6304D3D0"

  async function toggleQr() {
    if (qrUrl) { setQrUrl(null); return }
    const url = await QRCode.toDataURL(pixPayload, { width: 180, margin: 2 })
    setQrUrl(url)
  }

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
      <p style={{ fontSize: "13px", color: "#fff", textAlign: "center" }}>Musical Cast Database</p>
      <p style={{ fontSize: "13px", color: "#ccd6e4", textAlign: "center" }}>Feito com ❤️ para o teatro musical brasileiro</p>

      {/* Bloco Pix */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", margin: "4px 0" }}>
        <button
          onClick={toggleQr}
          style={{
            background: "#fdc03e",
          border: "none",
          borderRadius: "6px",
          padding: "7px 18px",
          fontSize: "13px",
          color: "#000",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: "600"
          }}
        >
          💛 Contribua via Pix
        </button>
        {qrUrl && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <img src={qrUrl} alt="QR Code Pix" style={{ width: 140, height: 140, borderRadius: "8px" }} />
            <span style={{ fontSize: "12px", color: "#9fb0c7" }}>musicalcastbr@gmail.com</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        <button onClick={() => navigate("/sobre")} style={{ background: "none", border: "none", fontSize: "13px", color: "#ccd6e4", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Sobre</button>
        <button onClick={() => navigate("/termos")} style={{ background: "none", border: "none", fontSize: "13px", color: "#ccd6e4", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>Termos de Uso</button>
      </div>
      <p style={{ fontSize: "12px", color: "#9fb0c7" }}>© 2026 MCDb</p>
    </footer>
  )
}

export default Footer