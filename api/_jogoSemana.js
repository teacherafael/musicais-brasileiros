// api/_jogoSemana.js
// Contas do resultado de segunda e do plantão de quinta do jogo
// "Eu Quero Ser Produtor". Funções puras: recebem dados, devolvem dados.
// Quem lê e grava no Firestore é o api/jogo-atualizar.js.

const { r2, paraMs, patrimonio } = require("./_jogo")

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

  const final = s >= t.semanas
  const proximo = (r.desafios || []).find((d) => d.semana === s + 1)
  const desafioAtual = !final && proximo
    ? { semana: proximo.semana, tipo: proximo.tipo, titulo: proximo.titulo, descricao: proximo.descricao, metas: proximo.metas || null }
    : null

  return { musicais, criticas, manchetes, desafioAtual, fecharam, final }
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
  const total = patrimonio({ saldo, acoes }, resultado.musicais)
  return {
    carteira: {
      ...c,
      saldo,
      acoes,
      custo,
      patrimonioAnterior: anterior,
      fotoSemana: { semana: s, saldo, acoes, patrimonio: total },
      ultimaSemanaProcessada: s,
    },
    operacoes,
    patrimonio: total,
    variacaoSemana: anterior ? total / anterior - 1 : 0,
  }
}

module.exports = { FRACAO_PLANTAO, proximaAcao, manchetesDoPlantao, montarResultado, aplicarResultadoNaCarteira }
