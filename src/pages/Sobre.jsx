import { useState } from "react"
import { useNavigate } from "react-router-dom"
import QRCode from "qrcode"

function Sobre() {
  const navigate = useNavigate()
  const [qrUrl, setQrUrl] = useState(null)
  const [copiado, setCopiado] = useState(false)

  const pixPayload = "00020126450014BR.GOV.BCB.PIX0123musicalcastbr@gmail.com5204000053039865802BR5920Rafael Luiz Nogueira6009SAO PAULO621405108kiqRR0vuY6304D3D0"

  async function gerarQr() {
    if (qrUrl) return
    const url = await QRCode.toDataURL(pixPayload, { width: 200, margin: 2 })
    setQrUrl(url)
  }

  function copiarChave() {
    navigator.clipboard.writeText("musicalcastbr@gmail.com")
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  // Gera o QR ao montar
  useState(() => { gerarQr() }, [])

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">MCDb — Musical Cast Database</p>
      <h1 className="page-title">Sobre</h1>

      {[
        {
          titulo: "O que é o MCDb",
          paragrafos: [
            <>O <strong>Musical Cast Database (MCDb)</strong>, idealizado e criado por <strong>Rafael Nogueira</strong>, é um catálogo do teatro musical brasileiro — um lugar pra <strong>registrar, descobrir, marcar</strong> o que você já viu e avaliar as produções que passaram pelos nossos palcos.</>,
            <>A motivação é simples: o <strong>teatro musical brasileiro é mal documentado online</strong>. Montagens inteiras desaparecem da memória, fichas técnicas se perdem, e quase nada disso está organizado num só lugar. O <strong>MCDb</strong> existe pra mudar isso — construir, aos poucos, o arquivo que a nossa <strong>comunidade</strong> merece.</>
          ]
        },
        {
          titulo: "De onde veio",
          paragrafos: [
            <>O <strong>MCDb</strong> é uma extensão do <strong>Musical Cast</strong>, podcast que fala sobre teatro musical desde <strong>2015</strong>. É algo que ele sentia que faltava: um catálogo de verdade, onde qualquer pessoa tem acesso às informações em segundos.</>,
            <>A <strong>criação, a curadoria e a pesquisa</strong> do acervo são inteiramente de <strong>Rafael Nogueira</strong>, com a colaboração pontual de <strong>Anderson Dias</strong> e <strong>Fabio Correa</strong> no conteúdo de alguns musicais.</>
          ]
        },
        {
          titulo: "Como funciona",
          paragrafos: [
            <>Qualquer pessoa pode navegar e <strong>descobrir musicais</strong>. Com login pelo Google, você marca o que já viu, monta listas, avalia com estrelas e acompanha o que está em cartaz. As avaliações são privadas por padrão.</>,
            <>O acervo está sempre crescendo — se você sentir falta de algum musical, é só sugerir.</>
          ]
        }
      ].map((item, i) => (
        <div key={i} style={{ marginBottom: "28px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: "700", marginBottom: "10px" }}>{item.titulo}</h2>
          {item.paragrafos.map((p, j) => (
            <p key={j} style={{ fontSize: "15px", color: "#444", lineHeight: "1.75", marginBottom: "14px" }}>{p}</p>
          ))}
        </div>
      ))}

      {/* Seção Apoie */}
      <div style={{ borderTop: "1px solid #e8e8e4", paddingTop: "28px", marginBottom: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: "700" }}>Apoie o MCDb</h2>
        <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75", maxWidth: "520px" }}>
          O MCDb é um projeto independente. Se ele foi útil pra você, considere contribuir — qualquer valor ajuda a manter o catálogo no ar e crescendo.
        </p>
        {qrUrl && <img src={qrUrl} alt="QR Code Pix" style={{ width: 160, height: 160, borderRadius: "8px" }} />}
        <p style={{ fontSize: "13px", color: "#666" }}>Pix: <strong>musicalcastbr@gmail.com</strong></p>
        <button
          onClick={copiarChave}
          style={{
            background: "#fdc03e",
            border: "none",
            borderRadius: "6px",
            padding: "8px 20px",
            fontSize: "14px",
            color: "#000",
            cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: "600"
          }}
        >
          {copiado ? "✓ Chave copiada!" : "Copiar chave Pix"}
        </button>
      </div>
    </main>
  )
}

export default Sobre