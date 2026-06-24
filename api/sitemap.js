module.exports = async function handler(req, res) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/musicais-br-database/databases/(default)/documents/indices/home`
    const response = await fetch(url)
    const data = await response.json()

    const itens = data.fields?.itens?.arrayValue?.values || []

    const urls = itens.map(item => {
      const id = item.mapValue?.fields?.id?.stringValue
      if (!id) return ""
      return `
  <url>
    <loc>https://mcdb.musicalcast.com.br/musical/${id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    }).filter(Boolean).join("")

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mcdb.musicalcast.com.br/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://mcdb.musicalcast.com.br/ranking</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>${urls}
</urlset>`

    res.setHeader("Content-Type", "application/xml")
    res.setHeader("Cache-Control", "s-maxage=86400")
    res.send(xml)
  } catch (e) {
    res.status(500).send("Erro ao gerar sitemap")
  }
}