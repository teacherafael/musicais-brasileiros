// api/sitemap.js — MCDb
// Gera o sitemap.xml a partir do documento indices/home (1 leitura).
// Roteado pelo vercel.json: /sitemap.xml -> /api/sitemap
//
// Nota: <changefreq> e <priority> foram removidos porque o Google os
// ignora. A unica tag que ele usa de fato e <lastmod>.

const BASE = "https://mcdb.musicalcast.com.br"

function escXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// dataCriacao pode vir como timestampValue ou como mapa { seconds }
function dataDe(campos) {
  const dc = campos && campos.dataCriacao
  if (!dc) return ""

  if (dc.timestampValue) {
    return String(dc.timestampValue).slice(0, 10)
  }

  const fields = dc.mapValue && dc.mapValue.fields
  const secs = fields && fields.seconds
  const n = secs && (secs.integerValue || secs.doubleValue)
  if (n) {
    const d = new Date(Number(n) * 1000)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }

  return ""
}

function url(loc, lastmod) {
  return `
  <url>
    <loc>${escXml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ""}
  </url>`
}

module.exports = async function handler(req, res) {
  try {
    const endpoint =
      "https://firestore.googleapis.com/v1/projects/musicais-br-database/" +
      "databases/(default)/documents/indices/home"

    const response = await fetch(endpoint)
    const data = await response.json()

    const itens =
      (data.fields &&
        data.fields.itens &&
        data.fields.itens.arrayValue &&
        data.fields.itens.arrayValue.values) ||
      []

    // Data em que o indice foi atualizado — serve de lastmod das
    // paginas agregadas (home, ranking).
    const atualizadoEm =
      (data.fields &&
        data.fields.atualizadoEm &&
        String(data.fields.atualizadoEm.timestampValue || "").slice(0, 10)) ||
      new Date().toISOString().slice(0, 10)

    const musicais = itens
      .map((item) => {
        const campos = (item.mapValue && item.mapValue.fields) || {}
        const id = campos.id && campos.id.stringValue
        if (!id) return ""
        return url(`${BASE}/musical/${encodeURIComponent(id)}`, dataDe(campos))
      })
      .filter(Boolean)
      .join("")

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${url(`${BASE}/`, atualizadoEm)}${url(`${BASE}/ranking`, atualizadoEm)}${musicais}
</urlset>`

    res.setHeader("Content-Type", "application/xml; charset=utf-8")
    res.setHeader("Cache-Control", "public, s-maxage=86400")
    res.send(xml)
  } catch (e) {
    res.status(500).send("Erro ao gerar sitemap")
  }
}
