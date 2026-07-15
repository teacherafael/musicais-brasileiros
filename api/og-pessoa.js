// api/og-pessoa.js — MCDb
// Versão em HTML puro da página /pessoa/:nome para crawlers.
// Espelha a lógica do src/pages/Pessoa.jsx: alias -> canônico,
// correspondência EXATA de nome (tolerante a acento).
//
// Os aliases vêm de src/aliases.json — mesma fonte que o Pessoa.jsx usa.

const ALIASES = require("../src/aliases.json")

const BASE = "https://mcdb.musicalcast.com.br"
const PROJETO = "musicais-br-database"

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Mesma normalização do Pessoa.jsx
function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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

// Todos os nomes que aparecem nos créditos de um item do índice
function nomesDoItem(campos) {
  const textos = [
    "direcao",
    "direcaoMusical",
    "producao",
    "elenco",
    "elencoAdicional",
    "versionista",
    "textoOriginal",
    "musicaOriginal",
  ]

  const dosCampos = textos
    .map((c) => str(campos[c]))
    .filter(Boolean)
    .flatMap((c) => c.split(","))
    .map((n) => n.trim())

  const daEquipe = arr(campos.equipeCriativa).flatMap((b) =>
    arr(mapa(b).nomes).map((n) => str(n))
  )

  const dosMusicos = arr(campos.musicos).flatMap((b) =>
    arr(mapa(b).nomes).map((n) => str(n))
  )

  return [...dosCampos, ...daEquipe, ...dosMusicos].filter(Boolean)
}

async function buscarEntidade(nome) {
  try {
    const id = normalizar(nome)
    const url =
      `https://firestore.googleapis.com/v1/projects/${PROJETO}/` +
      `databases/(default)/documents/entidades/${encodeURIComponent(id)}`
    const r = await fetch(url)
    if (!r.ok) return null
    const d = await r.json()
    if (!d.fields) return null
    const pub = d.fields.publicado
    if (!pub || pub.booleanValue !== true) return null
    return d.fields
  } catch (e) {
    return null
  }
}

module.exports = async function handler(req, res) {
  const bruto = req.query.nome
  if (!bruto) return res.status(400).send("Missing nome")

  let nome
  try {
    nome = decodeURIComponent(bruto).trim()
  } catch (e) {
    nome = String(bruto).trim()
  }
  if (!nome) return res.status(400).send("Missing nome")

  const nomeLower = nome.toLowerCase()

  // Se veio por um alias, manda o crawler para o nome canônico.
  // 301 de verdade — melhor que o redirect via JS que a SPA faz.
  const canonicoDoAlias = ALIASES[nomeLower]
  if (canonicoDoAlias) {
    res.setHeader("Cache-Control", "public, s-maxage=86400")
    res.writeHead(301, {
      Location: `/pessoa/${encodeURIComponent(canonicoDoAlias)}`,
    })
    return res.end()
  }

  try {
    // Todos os nomes que apontam para este canônico
    const todosOsNomes = [
      nomeLower,
      ...Object.entries(ALIASES)
        .filter(([, canonico]) => canonico.toLowerCase() === nomeLower)
        .map(([alias]) => alias),
    ].map(normalizar)

    const url =
      `https://firestore.googleapis.com/v1/projects/${PROJETO}/` +
      `databases/(default)/documents/indices/home`

    const [resposta, entidade] = await Promise.all([
      fetch(url).then((r) => r.json()),
      buscarEntidade(nome),
    ])

    const itens = arr(
      resposta.fields && resposta.fields.itens
    )

    const encontrados = itens
      .map((item) => mapa(item))
      .filter((campos) => {
        const nomes = nomesDoItem(campos)
        return nomes.some((c) => todosOsNomes.includes(normalizar(c)))
      })
      .sort((a, b) => Number(str(a.ano)) - Number(str(b.ano)))

    const total = encontrados.length
    const ogUrl = `${BASE}/pessoa/${encodeURIComponent(nome)}`

    // ---- Bio (coleção entidades) ----
    let bioHtml = ""
    let descricao = ""

    if (entidade) {
      const tipoBruto = str(entidade.tipo)
      const tipo =
        tipoBruto === "produtora"
          ? "Produtora"
          : tipoBruto === "assessoria"
          ? "Assessoria de imprensa"
          : tipoBruto
          ? "Artista"
          : ""
      const bio = str(entidade.bio)
      const formacao = str(entidade.formacao)
      const destaques = arr(entidade.destaques)
        .map((d) => str(d))
        .filter(Boolean)
        .join(" · ")

      if (tipo) bioHtml += `<p><strong>${esc(tipo)}</strong></p>`
      if (bio) {
        // Tira a marcação [[Nome]] e **negrito** da bio
        const limpa = bio
          .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$1")
          .replace(/\[\[([^\]]+)\]\]/g, "$1")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
        bioHtml += `<p>${esc(limpa)}</p>`
        descricao = limpa.slice(0, 200)
      }
      if (formacao) bioHtml += `<p><strong>Formação:</strong> ${esc(formacao)}</p>`
      if (destaques) bioHtml += `<p><strong>Destaques:</strong> ${esc(destaques)}</p>`
    }

    if (!descricao) {
      descricao =
        total > 0
          ? `${nome} no MCDb: ${total} ${total === 1 ? "musical" : "musicais"} do teatro musical brasileiro.`
          : `${nome} no MCDb — Musical Cast Database.`
    }

    // ---- Lista de musicais ----
    const lista = encontrados
      .map((campos) => {
        const id = str(campos.id)
        const titulo = str(campos.titulo) || id
        const ano = str(campos.ano)
        if (!id) return ""
        return `<li><a href="/musical/${encodeURIComponent(id)}">${esc(titulo)}</a>${ano ? ` (${esc(ano)})` : ""}</li>`
      })
      .filter(Boolean)
      .join("")

    const imagem = entidade ? str(entidade.imagem) : ""

    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    )

    res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${esc(nome)} — MCDb</title>
  <meta name="description" content="${esc(descricao)}" />
  <link rel="canonical" href="${esc(ogUrl)}" />
  <meta property="og:title" content="${esc(nome)} — MCDb" />
  <meta property="og:description" content="${esc(descricao)}" />
  ${imagem ? `<meta property="og:image" content="${esc(imagem)}" />` : ""}
  <meta property="og:url" content="${esc(ogUrl)}" />
  <meta property="og:type" content="profile" />
  <meta property="og:site_name" content="MCDb — Musical Cast Database" />
  <meta property="og:locale" content="pt_BR" />
  <meta name="twitter:card" content="summary" />
</head>
<body>
  <h1>${esc(nome)}</h1>
  ${imagem ? `<img src="${esc(imagem)}" alt="${esc(nome)}" width="200" />` : ""}
  ${bioHtml}
  <p>${total} ${total === 1 ? "musical encontrado" : "musicais encontrados"}</p>
  ${lista ? `<ul>${lista}</ul>` : "<p>Nenhum musical encontrado para esta pessoa.</p>"}
  <hr />
  <p><a href="/">MCDb — Musical Cast Database</a> | <a href="/ranking">Ranking</a></p>
</body>
</html>`)
  } catch (e) {
    res.status(500).send("Erro")
  }
}