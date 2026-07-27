import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { collection, query, where, getDocs } from "firebase/firestore"
import { db } from "../firebase"

// Deriva a miniatura -400 a partir da URL -800 do R2; outras URLs passam intactas
function thumb(url) {
  if (!url) return ""
  return url.includes("-800.webp") ? url.replace("-800.webp", "-400.webp") : url
}

export default function Destaques() {
  const [artistas, setArtistas] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function buscar() {
      try {
        const q = query(
          collection(db, "entidades"),
          where("publicado", "==", true),
          where("tipo", "==", "artista")
        )
        const snap = await getDocs(q)
        const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"))
        setArtistas(lista)
      } catch (e) {
        console.error("Erro ao carregar destaques:", e)
        setArtistas([])
      } finally {
        setCarregando(false)
      }
    }
    buscar()
  }, [])

  return (
    <main>
      <h1 className="page-title">Artistas em destaque</h1>
      <p style={{ color: "#666", marginTop: "12px", marginBottom: "28px", fontSize: "15px" }}>
        Confira mais informações sobre nossos artistas em destaque.
      </p>

      {carregando ? (
        <p style={{ color: "#666" }}>Carregando…</p>
      ) : artistas.length === 0 ? (
        <p style={{ color: "#666" }}>Nenhum artista em destaque ainda.</p>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "20px",
        }}>
          {artistas.map((a) => (
            <Link
              key={a.id}
              to={`/pessoa/${encodeURIComponent(a.nome)}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{
                aspectRatio: "3 / 4",
                borderRadius: "6px",
                overflow: "hidden",
                background: "#0a2c59",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {a.imagem ? (
                  <img
                    src={thumb(a.imagem)}
                    alt={a.nome}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: a.tipoImagem === "logo" ? "contain" : "cover",
                      padding: a.tipoImagem === "logo" ? "16px" : "0",
                    }}
                  />
                ) : (
                  <span style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "40px",
                    color: "#F5C518",
                  }}>
                    {(a.nome || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <p style={{
                margin: "8px 0 0",
                textAlign: "center",
                fontSize: "14px",
                fontWeight: 500,
                lineHeight: 1.3,
              }}>
                {a.nome}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}