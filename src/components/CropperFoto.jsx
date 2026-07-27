import { useState, useCallback } from "react"
import Cropper from "react-easy-crop"

// Recorta a área escolhida e devolve um blob quadrado (JPEG)
async function gerarBlobRecortado(imagemSrc, area) {
  const img = await new Promise((res, rej) => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = rej
    i.src = imagemSrc
  })
  const lado = Math.min(area.width, area.height)
  const canvas = document.createElement("canvas")
  canvas.width = lado
  canvas.height = lado
  const ctx = canvas.getContext("2d")
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, lado, lado)
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92))
}

export default function CropperFoto({ imagemSrc, onConfirmar, onCancelar, enviando }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [areaPixels, setAreaPixels] = useState(null)

  const aoCompletar = useCallback((_, pixels) => {
    setAreaPixels(pixels)
  }, [])

  async function confirmar() {
    if (!areaPixels || enviando) return
    const blob = await gerarBlobRecortado(imagemSrc, areaPixels)
    onConfirmar(blob)
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 10000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", gap: "18px" }}>
      <p style={{ color: "#fff", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: "600", margin: 0 }}>
        Ajuste sua foto
      </p>

      <div style={{ position: "relative", width: "min(85vw, 340px)", height: "min(85vw, 340px)", background: "#111", borderRadius: "8px", overflow: "hidden" }}>
        <Cropper
          image={imagemSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={aoCompletar}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "min(85vw, 340px)" }}>
        <span style={{ color: "#aaa", fontSize: "20px", lineHeight: 1 }}>−</span>
        <input type="range" min={1} max={3} step={0.01} value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ flex: 1, accentColor: "#F5C518", cursor: "pointer" }} />
        <span style={{ color: "#aaa", fontSize: "20px", lineHeight: 1 }}>+</span>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={confirmar} disabled={enviando}
          style={{ padding: "12px 24px", background: "#F5C518", color: "#1a1a1a", border: "none", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: "600", cursor: enviando ? "wait" : "pointer", opacity: enviando ? 0.6 : 1 }}>
          {enviando ? "Enviando..." : "Usar foto"}
        </button>
        <button onClick={onCancelar} disabled={enviando}
          style={{ padding: "12px 24px", background: "transparent", color: "#aaa", border: "1px solid #555", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", cursor: enviando ? "not-allowed" : "pointer" }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}