function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

module.exports = async function handler(req, res) {
  const id = req.query.id
  if (!id) return res.status(400).send("Missing id")

  try {
    const url = `https://firestore.googleapis.com/v1/projects/musicais-br-database/databases/(default)/documents/musicais/${id}`
    const response = await fetch(url)
    const data = await response.json()

    if (!data.fields) return res.status(404).send("Not found")

    const titulo = data.fields.titulo?.stringValue || "Musical"
    const sinopse = data.fields.sinopse?.stringValue || ""
    const capa = data.fields.capa?.stringValue || ""
    const descricao = (sinopse || `Veja avaliações e informações sobre ${titulo} no MCDb.`).slice(0, 200)
    const ogUrl = `https://mcdb.musicalcast.com.br/musical/${id}`

    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${esc(titulo)} — MCDb</title>
  <meta name="description" content="${esc(descricao)}" />
  <meta property="og:title" content="${esc(titulo)}" />
  <meta property="og:description" content="${esc(descricao)}" />
  <meta property="og:image" content="${esc(capa)}" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
<body></body>
</html>`)
  } catch (e) {
    res.status(500).send("Erro")
  }
}