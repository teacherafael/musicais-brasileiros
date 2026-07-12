// ============================================================================
// musicalSchema.js
// Fonte única da verdade para a estrutura de dados de um musical.
// Importado tanto pelo formulário público (Sugestao.jsx) quanto pelo painel
// admin (Admin.jsx), para que os dois NUNCA voltem a divergir de formato.
//
// Este arquivo é "puro": não importa Firebase nem React. Só define a lista de
// cargos e as funções que leem/montam os dados. Por isso pode ser importado de
// qualquer lugar sem efeitos colaterais.
// ============================================================================

// ── Cargos essenciais ────────────────────────────────────────────────────────
// Gravam em campos planos no topo do documento (a busca, a Home e a página
// Pessoa dependem desses campos existirem soltos).
export const ESSENCIAIS = ["Direção", "Direção Musical", "Versionista", "Texto Original", "Música Original", "Produtora"]

export const ESSENCIAL_CAMPO = {
  "Direção": "direcao",
  "Direção Musical": "direcaoMusical",
  "Versionista": "versionista",
  "Texto Original": "textoOriginal",
  "Música Original": "musicaOriginal",
  "Produtora": "producao",
}

// ── Cargos complementares ────────────────────────────────────────────────────
// Gravam dentro do array `equipeCriativa`. Esta é a lista que aparece tanto no
// admin quanto (a partir de agora) no formulário público de sugestão.
export const COMPLEMENTARES = [
  "Direção Residente", "Direção Artística", "Direção Associada", "Assistência de Direção", "Coordenação Artística",
  "Supervisão Musical", "Assistência de Direção Musical", "Regência", "Preparação Vocal", "Arranjos/Orquestração",
  "Coreografia", "Assistência de Coreografia", "Direção de Movimento", "Coreografia Associada",
  "Cenografia", "Assistente de Cenografia", "Cenotécnica", "Figurino", "Assistente de Figurino", "Design de Luz", "Design de Som", "Visagismo", "Perucaria",
  "Direção de Produção", "Coordenação de Produção", "Produção Geral", "Produção Executiva", "Assistente de Produção", "Produtor Associado",
]

// ── Tradutor de campos antigos ───────────────────────────────────────────────
// O formulário de sugestão ANTIGO gravava alguns cargos como campos planos
// soltos (ex: `figurino`, `coreografia`). Este mapa converte esses campos
// antigos para os nomes de cargo do formato novo, para que sugestões já
// paradas na fila não percam esses dados quando forem lidas/aprovadas.
const CAMPOS_ANTIGOS_EQUIPE = {
  coreografia: "Coreografia",
  cenografia: "Cenografia",
  designDeLuz: "Design de Luz",
  designDeSom: "Design de Som",
  visagismo: "Visagismo",
  perucaria: "Perucaria",
  figurino: "Figurino",
  regencia: "Regência",
}

// ── Estado inicial do editor de equipe ───────────────────────────────────────
export function equipeInicial() {
  return [
    ...ESSENCIAIS.map(funcao => ({ funcao, nomesTexto: "", essencial: true })),
    ...COMPLEMENTARES.map(funcao => ({ funcao, nomesTexto: "", essencial: false })),
  ]
}

// ── Leitura: documento → estado do editor de equipe ──────────────────────────
// Lê tanto o formato NOVO (array `equipeCriativa`) quanto o formato ANTIGO
// (campos planos como `figurino`). O formato novo tem prioridade: um campo
// antigo só preenche uma linha se ela ainda estiver vazia.
export function equipeDeDocumento(doc) {
  const base = equipeInicial()

  // Essenciais (campos planos — iguais nos dois formatos)
  if (doc.direcao) base.find(r => r.funcao === "Direção").nomesTexto = doc.direcao
  if (doc.direcaoMusical) base.find(r => r.funcao === "Direção Musical").nomesTexto = doc.direcaoMusical
  if (doc.versionista) base.find(r => r.funcao === "Versionista").nomesTexto = doc.versionista
  if (doc.textoOriginal) base.find(r => r.funcao === "Texto Original").nomesTexto = doc.textoOriginal
  if (doc.musicaOriginal) base.find(r => r.funcao === "Música Original").nomesTexto = doc.musicaOriginal
  if (doc.producao) base.find(r => r.funcao === "Produtora").nomesTexto = doc.producao

  // Complementares — formato NOVO (array estruturado)
  if (Array.isArray(doc.equipeCriativa)) {
    doc.equipeCriativa.forEach(item => {
      const row = base.find(r => !r.essencial && !r.livre && r.funcao === item.funcao)
      if (row) {
        row.nomesTexto = Array.isArray(item.nomes) ? item.nomes.join(", ") : (item.nomes || "")
      } else if (item.funcao) {
        // cargo livre não listado nos COMPLEMENTARES
        base.push({ funcao: item.funcao, nomesTexto: Array.isArray(item.nomes) ? item.nomes.join(", ") : (item.nomes || ""), livre: true, cargoTexto: item.funcao })
      }
    })
  }

  // Complementares — formato ANTIGO (campos planos). Só preenche se a linha
  // correspondente ainda estiver vazia (o formato novo tem prioridade).
  Object.entries(CAMPOS_ANTIGOS_EQUIPE).forEach(([campoAntigo, nomeCargo]) => {
    const valor = doc[campoAntigo]
    if (!valor || typeof valor !== "string") return
    const row = base.find(r => !r.livre && r.funcao === nomeCargo)
    if (row && !row.nomesTexto.trim()) {
      row.nomesTexto = valor
    }
  })

  return base
}

// ── Leitura: documento → estado do editor de músicos ─────────────────────────
export function musicosDeDocumento(doc) {
  // Formato NOVO: array de { local, nomes }
  if (Array.isArray(doc.musicos)) {
    return doc.musicos.map(m => ({
      local: m.local || "",
      nomesTexto: Array.isArray(m.nomes) ? m.nomes.join(", ") : (m.nomes || "")
    }))
  }
  // Formato ANTIGO: string única (sem local)
  if (typeof doc.musicos === "string" && doc.musicos.trim()) {
    return [{ local: "", nomesTexto: doc.musicos.trim() }]
  }
  return []
}

// ── Leitura: documento → estado do editor de fontes ──────────────────────────
export function fontesDeDocumento(doc) {
  if (!Array.isArray(doc.fontes)) return []
  return doc.fontes.map(f => ({ descricao: f.descricao || "", link: f.link || "" }))
}

// ── Leitura: documento → estado do editor de teatros ─────────────────────────
export function teatrosDeDocumento(doc) {
  // Formato NOVO: array de { ano, teatros }
  if (Array.isArray(doc.teatros)) {
    return doc.teatros.map(t => ({
      ano: t.ano || "",
      teatrosTexto: Array.isArray(t.teatros) ? t.teatros.join(", ") : (t.teatros || "")
    }))
  }
  // Formato ANTIGO: `teatro` string única, combinada com o `ano` do musical
  if (typeof doc.teatro === "string" && doc.teatro.trim()) {
    return [{ ano: doc.ano || "", teatrosTexto: doc.teatro.trim() }]
  }
  return []
}

// ── Fallback: reconstrói equipe a partir das strings de direção ──────────────
export function montarEquipeDeStrings(direcao, direcaoMusical) {
  const equipe = []
  const d = (direcao || "").split(",").map(n => n.trim()).filter(Boolean)
  const dm = (direcaoMusical || "").split(",").map(n => n.trim()).filter(Boolean)
  if (d.length > 0) equipe.push({ funcao: "Direção", nomes: d })
  if (dm.length > 0) equipe.push({ funcao: "Direção Musical", nomes: dm })
  return equipe
}

// ── Escrita: estado do editor → documento final ──────────────────────────────
// Constrói o objeto que vai para o Firestore. Usado pelo formulário público
// (Sugestao.jsx) e pelo admin (Adicionar / Editar). Como os dois usam ESTA
// função, o formato de saída é garantidamente idêntico.
export function montarPayload(form, equipe, musicos, teatros, capa, fontes) {
  const teatrosLimpos = teatros
    .map(item => ({
      ano: (item.ano || "").trim(),
      teatros: (item.teatrosTexto || "").split(",").map(t => t.trim()).filter(Boolean)
    }))
    .filter(item => item.teatros.length > 0)

  const planos = {}
  ESSENCIAIS.forEach(funcao => {
    const row = equipe.find(r => r.essencial && r.funcao === funcao)
    const nomes = row ? row.nomesTexto.split(",").map(n => n.trim()).filter(Boolean) : []
    planos[ESSENCIAL_CAMPO[funcao]] = nomes.join(", ")
  })

  const equipeCriativa = equipe
    .filter(r => !r.essencial)
    .map(r => ({
      funcao: r.livre ? (r.cargoTexto || "").trim() : r.funcao,
      nomes: r.nomesTexto.split(",").map(n => n.trim()).filter(Boolean)
    }))
    .filter(e => e.funcao && e.nomes.length > 0)

  const musicosLimpos = musicos
    .map(item => ({ local: (item.local || "").trim(), nomes: (item.nomesTexto || "").split(",").map(n => n.trim()).filter(Boolean) }))
    .filter(item => item.nomes.length > 0)

  const fontesLimpas = (fontes || [])
    .map(item => ({ descricao: (item.descricao || "").trim(), link: (item.link || "").trim() }))
    .filter(item => item.descricao)

  return {
    titulo: form.titulo || "",
    tituloOriginal: form.tituloOriginal || "",
    sinopse: form.sinopse || "",
    direcao: planos.direcao,
    direcaoMusical: planos.direcaoMusical,
    versionista: planos.versionista,
    textoOriginal: planos.textoOriginal,
    musicaOriginal: planos.musicaOriginal,
    producao: planos.producao,
    equipeCriativa,
    elenco: form.elenco || "",
    elencoAdicional: form.elencoAdicional || "",
    ano: form.ano || "",
    teatro: teatrosLimpos[0]?.teatros[0] || "",
    teatros: teatrosLimpos,
    musicos: musicosLimpos,
    capa: capa || "",
    programaDigital: form.programaDigital || "",
    fontes: fontesLimpas,
  }
}