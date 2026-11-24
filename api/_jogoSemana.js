// api/_jogoSemana.js
// Contas do resultado de segunda e do plantão de quinta do jogo
// "Eu Quero Ser Produtor". Funções puras: recebem dados, devolvem dados.
// Quem lê e grava no Firestore é o api/jogo-atualizar.js.

const { r2, paraMs, patrimonio, DONO_DO_JOGO } = require("./_jogo")

const FRACAO_PLANTAO = 72 / 168

// O que está pendente agora nesta temporada, na ordem certa.
// Plantão da semana w (quinta) vem antes do resultado da semana w+1 (segunda).
function proximaAcao(t, agoraMs = Date.now()) {
  if (t.estado?.encerrada) return null
  const t0 = paraMs(t.aberturaMercado)
  const H = t.horasPorSemana * 3600 * 1000
  const w = t.estado?.semanaAtual || 0
  const plantaoFeito = t.estado?.plantaoLiberado ?? -1
  if (w < t.semanas && plantaoFeito < w && agoraMs >= t0 + w * H + H * FRACAO_PLANTAO) {
    return { tipo: "plantao", semana: w }
  }
  if (w < t.semanas && agoraMs >= t0 + (w + 1) * H) {
    return { tipo: "resultado", semana: w + 1 }
  }
  return null
}

// Manchetes de quinta da semana w, sem o campo que diz se é verdade
function manchetesDoPlantao(r, w) {
  return (r.manchetes || [])
    .filter((m) => m.semana === w && m.dia === "quinta")
    .map(({ semana, dia, fonte, texto }) => ({ semana, dia, fonte, texto }))
}

// Monta o que muda no cartaz público com o resultado da semana s.
// precos = calcularPrecos(r) do motor (mesma conta da prévia do /admin).
function montarResultado(t, r, precos, s) {
  const porId = Object.fromEntries(precos.map((p) => [p.id, p]))
  const roteiroPorId = Object.fromEntries(r.musicais.map((m) => [m.id, m]))
  const fecharam = []

  const musicais = t.musicais.map((m) => {
    if (m.fechado) return m
    const rm = roteiroPorId[m.id]
    const p = porId[m.id]
    const ocupacao = rm?.ocupacao?.[s - 1]
    if (!rm || !p || ocupacao == null || p.precos[s] == null) return m
    const novo = {
      ...m,
      precoAtual: p.precos[s],
      historico: [...(m.historico || []), { semana: s, ocupacao, preco: p.precos[s] }],
    }
    if (rm.semanaFechamento === s) {
      novo.fechado = true
      novo.fechouNaSemana = s
      fecharam.push(m.id)
    }
    return novo
  })

  const criticas = [
    ...(t.criticas || []),
    ...(r.criticas || [])
      .filter((c) => c.semana === s)
      .map(({ semana, critico, musical, nota, frase }) => ({ semana, critico, musical, nota, frase: frase || "" })),
  ]
  const manchetes = [
    ...(t.manchetes || []),
    ...(r.manchetes || [])
      .filter((m) => m.semana === s && m.dia === "segunda")
      .map(({ semana, dia, fonte, texto }) => ({ semana, dia, fonte, texto })),
  ]

  // Para os desafios: preço no começo da semana, preço novo e média do mercado
  const precoAntes = Object.fromEntries(t.musicais.map((m) => [m.id, m.precoAtual]))
  const precoInicial = Object.fromEntries(t.musicais.map((m) => [m.id, m.precoInicial]))
  const abertosAntes = t.musicais.filter((m) => !m.fechado)
  const precoDepoisPorId = Object.fromEntries(musicais.map((m) => [m.id, m.precoAtual]))
  const media = abertosAntes.length
    ? abertosAntes.reduce((soma, m) => soma + (precoDepoisPorId[m.id] / m.precoAtual - 1), 0) / abertosAntes.length
    : 0
  const desafioDaSemana = (r.desafios || []).find((d) => d.semana === s) || null

  const final = s >= t.semanas
  const proximo = (r.desafios || []).find((d) => d.semana === s + 1)
  const desafioAtual = !final && proximo
    ? { semana: proximo.semana, tipo: proximo.tipo, titulo: proximo.titulo, descricao: proximo.descricao, metas: proximo.metas || null }
    : null

  const bonusDesafio = t.regras?.bonusDesafio || r.regras?.bonusDesafio || {}
  return { musicais, criticas, manchetes, desafioAtual, fecharam, final, precoAntes, precoInicial, media, desafioDaSemana, bonusDesafio }
}

// ─────────────────────────────────────────────────────────────
// Desafios
// "acima(x, meta)": meta 0 quer dizer "maior que zero"; meta positiva, "pelo menos a meta".
// Valores em %: metas 3 e 5 = 3% e 5%.
// ─────────────────────────────────────────────────────────────
const NIVEIS = ["ouro", "prata", "bronze"]
const acima = (x, meta) => (meta > 0 ? x >= meta / 100 - 1e-9 : x > 1e-9)

function avaliarDesafio({ desafio, acoesAntes, precoAntes, precoDepois, precoInicial, patAntes, patDepois, media }) {
  if (!desafio || !desafio.metas) return null
  const ids = Object.keys(acoesAntes).filter((id) => (acoesAntes[id] || 0) > 0)
  const n = ids.length
  const minimo = desafio.minMusicais || 0
  const varCarteira = patAntes ? patDepois / patAntes - 1 : 0
  const varMusical = (id) => (precoAntes[id] ? precoDepois[id] / precoAntes[id] - 1 : 0)
  const metas = desafio.metas

  let passou
  switch (desafio.tipo) {
    case "primeira-carteira":
      passou = (meta) => n >= minimo && acima(varCarteira, meta)
      break
    case "bata-o-mercado":
      passou = (meta) => n >= minimo && acima(varCarteira - media, meta)
      break
    case "contra-a-mare": {
      const melhor = ids
        .filter((id) => precoAntes[id] < precoInicial[id])
        .reduce((m, id) => Math.max(m, varMusical(id)), -Infinity)
      passou = (meta) => melhor > -Infinity && acima(melhor, meta)
      break
    }
    case "sem-tombo": {
      const cumpriu = n >= minimo && n > 0 && ids.every((id) => varMusical(id) >= -0.10 - 1e-9)
      passou = (meta, nivel) => cumpriu && (nivel === "bronze" || acima(varCarteira, meta))
      break
    }
    case "tudo-no-azul": {
      const cumpriu = n >= Math.max(minimo, 1) && ids.every((id) => varMusical(id) > 1e-9)
      passou = (meta, nivel) => cumpriu && (nivel === "bronze" || acima(varCarteira, meta))
      break
    }
    case "grande-final":
      passou = (meta) => patDepois >= meta - 1e-9
      break
    default:
      return null
  }
  return NIVEIS.find((nivel) => metas[nivel] != null && passou(metas[nivel], nivel)) || null
}

// Aplica o resultado da semana s numa carteira:
// vende automaticamente as ações dos musicais que fecharam (pelo preço já
// liquidado a 30%, sem taxa) e, na última semana, vende tudo pelo preço final.
// Depois tira a "foto" da semana, usada pelos desafios e pela variação semanal.
function aplicarResultadoNaCarteira(c, resultado, s) {
  if ((c.ultimaSemanaProcessada || 0) >= s) return null
  const precoPorId = Object.fromEntries(resultado.musicais.map((m) => [m.id, m.precoAtual]))
  const tituloPorId = Object.fromEntries(resultado.musicais.map((m) => [m.id, m.titulo]))
  const acoes = { ...(c.acoes || {}) }
  const custo = { ...(c.custo || {}) }
  let saldo = c.saldo
  const operacoes = []

  const vender = (id, motivo) => {
    const qtd = acoes[id] || 0
    if (!qtd) return
    const valor = r2(qtd * (precoPorId[id] || 0))
    saldo = r2(saldo + valor)
    operacoes.push({ tipo: motivo, musicalId: id, titulo: tituloPorId[id] || id, quantidade: qtd, preco: precoPorId[id] || 0, valor, taxa: 0, total: valor, semana: s })
    delete acoes[id]
    delete custo[id]
  }

  resultado.fecharam.forEach((id) => vender(id, "liquidacao"))
  if (resultado.final) Object.keys(acoes).forEach((id) => vender(id, "encerramento"))

  const anterior = c.fotoSemana?.patrimonio ?? c.saldo
  let total = patrimonio({ saldo, acoes }, resultado.musicais)

  // Desafio da semana: avaliado com as ações que o jogador tinha quando o mercado fechou
  let selo = null
  const d = resultado.desafioDaSemana
  if (d) {
    const nivel = avaliarDesafio({
      desafio: d,
      acoesAntes: c.acoes || {},
      precoAntes: resultado.precoAntes,
      precoDepois: precoPorId,
      precoInicial: resultado.precoInicial,
      patAntes: anterior,
      patDepois: total,
      media: resultado.media,
    })
    if (nivel) {
      const bonus = (resultado.bonusDesafio || {})[nivel] || 0
      saldo = r2(saldo + bonus)
      total = r2(total + bonus)
      selo = { semana: s, tipo: d.tipo, titulo: d.titulo, nivel, bonus }
      if (bonus) operacoes.push({ tipo: "bonus", musicalId: "", titulo: `Desafio ${d.titulo} (${nivel})`, quantidade: 0, preco: 0, valor: bonus, taxa: 0, total: bonus, semana: s })
    }
  }

  return {
    carteira: {
      ...c,
      saldo,
      acoes,
      custo,
      selos: selo ? [...(c.selos || []), selo] : c.selos || [],
      patrimonioAnterior: anterior,
      fotoSemana: { semana: s, saldo, acoes, patrimonio: total },
      ultimaSemanaProcessada: s,
    },
    operacoes,
    selo,
    patrimonio: total,
    variacaoSemana: anterior ? total / anterior - 1 : 0,
  }
}

// Ranking da temporada: todas as carteiras (já com o resultado da semana),
// sem o dono do jogo, ordenadas por patrimônio. Desempate: quem fez a
// primeira operação antes fica na frente.
// Em temporada de teste o dono entra, para dar para testar o ranking sozinho.
function montarRanking(carteiras, semana, saldoInicial, incluirDono = false) {
  const lista = carteiras
    .filter((c) => c.uid && (incluirDono || c.uid !== DONO_DO_JOGO))
    .map((c) => {
      const pat = c.fotoSemana?.patrimonio ?? c.saldo
      const anterior = c.patrimonioAnterior ?? saldoInicial
      const selos = { ouro: 0, prata: 0, bronze: 0 }
      ;(c.selos || []).forEach((s) => { if (selos[s.nivel] != null) selos[s.nivel]++ })
      return {
        uid: c.uid,
        nome: c.nome || "Produtor anônimo",
        foto: c.foto || "",
        patrimonio: r2(pat),
        lucro: saldoInicial ? pat / saldoInicial - 1 : 0,
        variacaoSemana: anterior ? pat / anterior - 1 : 0,
        selos,
        desempate: paraMs(c.primeiraOperacaoEm) || Number.MAX_SAFE_INTEGER,
      }
    })
    .sort((a, b) => b.patrimonio - a.patrimonio || a.desempate - b.desempate)
    // eslint-disable-next-line no-unused-vars
    .map(({ desempate, ...item }, i) => ({ posicao: i + 1, ...item }))
  return { semana, total: lista.length, jogadores: lista }
}

module.exports = {
  montarRanking, FRACAO_PLANTAO, proximaAcao, manchetesDoPlantao, montarResultado, aplicarResultadoNaCarteira, avaliarDesafio }
