// api/og-musical.js — MCDb
// Serve uma versão em HTML puro da ficha do musical para crawlers
// (WhatsApp, Facebook, Googlebot etc). Usuários com JS nunca veem isso.
//
// Roteado pelo vercel.json via rewrite condicional por user-agent.

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Helpers do formato REST do Firestore
function str(campo) {
  return (campo && campo.stringValue) || ""
}
function arr(campo) {
  return (campo && campo.arrayValue && campo.arrayValue.values) || []
}
function mapa(valor) {
  return (valor && valor.mapValue && valor.mapValue.fields) || {}
}

// Uma linha da ficha técnica. Some se estiver vazia.
function linha(rotulo, valor) {
  if (!valor || !String(valor).trim()) return ""
  return `<p><strong>${esc(rotulo)}:</strong> ${esc(valor)}</p>`
}

module.exports = async function handler(req, res) {
  const id = req.query.id
  if (!id) return res.status(400).send("Missing id")

  try {
    const url =
      "https://firestore.googleapis.com/v1/projects/musicais-br-database/" +
      "databases/(default)/documents/musicais/" +
      encodeURIComponent(id)

    const response = await fetch(url)
    const data = await response.json()

    if (!data.fields) return res.status(404).send("Not found")
    const f = data.fields

    const titulo = str(f.titulo) || "Musical"
    const sinopse = str(f.sinopse)
    const capa = str(f.capa)
    const ano = str(f.ano)

    const descricao = (
      sinopse || `Veja avaliações e informações sobre ${titulo} no MCDb.`
    ).slice(0, 200)

    const ogUrl = `https://mcdb.musicalcast.com.br/musical/${id}`
    const tituloPagina = ano ? `${titulo} (${ano})` : titulo

    // ---- Ficha técnica ----
    let ficha = ""
    ficha += linha("Ano", ano)
    ficha += linha("Direção", str(f.direcao))
    ficha += linha("Direção Musical", str(f.direcaoMusical))
    ficha += linha("Produção", str(f.producao))
    ficha += linha("Versão Brasileira", str(f.versionista))
    ficha += linha("Texto Original", str(f.textoOriginal))
    ficha += linha("Música Original", str(f.musicaOriginal))
    ficha += linha("Elenco", str(f.elenco))
    ficha += linha("Elenco Adicional", str(f.elencoAdicional))

    // ---- Teatros (array de { teatros: [], ano }) ----
    let teatrosHtml = ""
    const listaTeatros = arr(f.teatros)
    if (listaTeatros.length > 0) {
      const itens = listaTeatros
        .map((t) => {
          const campos = mapa(t)
          const nomes = arr(campos.teatros)
            .map((n) => str(n))
            .filter(Boolean)
            .join(", ")
          const anoT = str(campos.ano)
          if (!nomes) return ""
          return `<li>${esc(nomes)}${anoT ? ` — ${esc(anoT)}` : ""}</li>`
        })
        .filter(Boolean)
        .join("")
      if (itens) teatrosHtml = `<h2>Teatros</h2><ul>${itens}</ul>`
    }

    // ---- Equipe criativa (array de { funcao, nomes: [] }) ----
    let equipeHtml = ""
    const listaEquipe = arr(f.equipeCriativa)
    if (listaEquipe.length > 0) {
      const itens = listaEquipe
        .map((b) => {
          const campos = mapa(b)
          const funcao = str(campos.funcao)
          const nomes = arr(campos.nomes)
            .map((n) => str(n))
            .filter(Boolean)
            .join(", ")
          if (!funcao || !nomes) return ""
          return `<p><strong>${esc(funcao)}:</strong> ${esc(nomes)}</p>`
        })
        .filter(Boolean)
        .join("")
      if (itens) equipeHtml = `<h2>Equipe Criativa</h2>${itens}`
    }

    // ---- Músicos (array de { local, nomes: [] }) ----
    let musicosHtml = ""
    const listaMusicos = arr(f.musicos)
    if (listaMusicos.length > 0) {
      const itens = listaMusicos
        .map((b) => {
          const campos = mapa(b)
          const local = str(campos.local)
          const nomes = arr(campos.nomes)
            .map((n) => str(n))
            .filter(Boolean)
            .join(", ")
          if (!nomes) return ""
          return `<p>${local ? `<strong>${esc(local)}:</strong> ` : ""}${esc(nomes)}</p>`
        })
        .filter(Boolean)
        .join("")
      if (itens) musicosHtml = `<h2>Músicos</h2>${itens}`
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    )

    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${esc(tituloPagina)} — MCDb</title>
  <meta name="description" content="${esc(descricao)}" />
  <link rel="canonical" href="${esc(ogUrl)}" />
  <meta property="og:title" content="${esc(titulo)}" />
  <meta property="og:description" content="${esc(descricao)}" />
  <meta property="og:image" content="${esc(capa)}" />
  <meta property="og:url" content="${esc(ogUrl)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="MCDb — Musical Cast Database" />
  <meta property="og:locale" content="pt_BR" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
<body>
  <h1>${esc(titulo)}</h1>
  ${capa ? `<img src="${esc(capa)}" alt="${esc(titulo)}" width="400" />` : ""}
  ${sinopse ? `<p>${esc(sinopse)}</p>` : ""}
  <h2>Ficha Técnica</h2>
  ${ficha}
  ${teatrosHtml}
  ${equipeHtml}
  ${musicosHtml}
  <hr />
  <p><a href="${esc(ogUrl)}">Ver no MCDb — Musical Cast Database</a></p>
</body>
</html>`)
  } catch (e) {
    res.status(500).send("Erro")
  }
}
