// src/jogo/motor.js
// Regras e contas do jogo "Eu Quero Ser Produtor".
// Funções puras (sem Firebase): validam o roteiro, calculam preços,
// simulam estratégias e montam o cartaz público.
// As mesmas contas serão repetidas nas funções do servidor (api/), então
// qualquer mudança de fórmula aqui precisa ser espelhada lá.

// Fração da semana em que o plantão sai (segunda 10h -> quinta 10h = 72h de 168h)
export const FRACAO_PLANTAO = 72 / 168
// Fração da semana antes do resultado em que o mercado fecha (domingo 24h -> segunda 10h = 10h de 168h)
export const FRACAO_FECHA_ANTES = 10 / 168

// ─────────────────────────────────────────────────────────────
// Agenda das rodadas ("semanas" do jogo)
// ritmo "semanal" (padrão): uma rodada a cada horasPorSemana horas
//   (168 = semana real; valores pequenos = teste acelerado).
// ritmo "segunda-quinta": duas rodadas por semana real, resultados
//   segunda e quinta às 10h. Plantão: terça 20h (rodada seg→qui) e
//   sábado 12h (rodada qui→seg). Mercado fecha 10h antes do resultado
//   (quarta e domingo 23h59). escalaTempo encolhe tudo para teste
//   (ex.: 0.0015 = rodadas de 6 a 9 minutos).
// ESPELHADA em api/_jogo.js (agendaDaTemporada). Mudou aqui, mude lá.
// ─────────────────────────────────────────────────────────────
const HORA_MS = 3600 * 1000

function cicloDoRitmo(t, t0) {
  if (t.ritmo === "segunda-quinta") {
    const segQui = { duracao: 72, plantao: 34, fechaAntes: 10 } // seg 10h -> qui 10h; plantão ter 20h
    const quiSeg = { duracao: 96, plantao: 50, fechaAntes: 10 } // qui 10h -> seg 10h; plantão sáb 12h
    const diaEmSP = new Date(t0 - 3 * HORA_MS).getUTCDay() // 4 = quinta
    return diaEmSP === 4 ? [quiSeg, segQui] : [segQui, quiSeg]
  }
  const H = t.horasPorSemana
  return [{ duracao: H, plantao: (H * 72) / 168, fechaAntes: (H * 10) / 168 }]
}

function agendaDaTemporadaBase(t, t0) {
  const escala = t.ritmo === "segunda-quinta" ? t.escalaTempo || 1 : 1
  const ciclo = cicloDoRitmo(t, t0)
  const rodadas = []
  let inicio = t0
  for (let w = 0; w < t.semanas; w++) {
    const c = ciclo[w % ciclo.length]
    const fim = inicio + c.duracao * escala * HORA_MS
    rodadas.push({ abre: inicio, plantao: inicio + c.plantao * escala * HORA_MS, fecha: fim - c.fechaAntes * escala * HORA_MS, resultado: fim })
    inicio = fim
  }
  return rodadas
}

export function agendaDaTemporada(t) {
  const t0 = typeof t.aberturaMercado === "string" ? Date.parse(t.aberturaMercado)
    : t.aberturaMercado?.toMillis ? t.aberturaMercado.toMillis()
    : t.aberturaMercado?.getTime ? t.aberturaMercado.getTime()
    : Date.parse(t.aberturaMercado)
  return agendaDaTemporadaBase(t, t0)
}

export const TIPOS_DESAFIO = {
  "primeira-carteira": "Ter ações de pelo menos N musicais e terminar a semana com lucro (metas em % de lucro da carteira)",
  "bata-o-mercado": "Ter ações de pelo menos N musicais e render mais que a média dos musicais (metas em pontos acima da média)",
  "contra-a-mare": "Ter ações de um musical que estava abaixo do preço inicial no começo da semana e lucrar com ele (metas em % de lucro nesse musical)",
  "sem-tombo": "Ter ações de pelo menos N musicais e nenhuma cair mais de 10% (bronze = cumpriu; prata e ouro = lucro mínimo da carteira em %)",
  "tudo-no-azul": "Pelo menos N musicais na carteira, todos com lucro (bronze = cumpriu; prata e ouro = rendimento mínimo da carteira em %)",
  "grande-final": "Terminar a temporada acima do saldo inicial (metas em Bravos de patrimônio final)",
}

const r2 = (n) => Math.round(n * 100) / 100
const ID_VALIDO = /^[a-z0-9-]+$/

// ─────────────────────────────────────────────────────────────
// Validação
// ─────────────────────────────────────────────────────────────
export function validarRoteiro(r) {
  const erros = []
  const avisos = []
  const e = (m) => erros.push(m)
  const a = (m) => avisos.push(m)

  if (!r || typeof r !== "object" || Array.isArray(r)) {
    e("O roteiro precisa ser um objeto JSON (começa com { e termina com }).")
    return { erros, avisos }
  }

  if (!ID_VALIDO.test(r.id || "")) e('"id" da temporada: só letras minúsculas, números e hífen, sem "_". Exemplo: "t1".')
  if (!r.nome) e('Falta "nome" da temporada.')
  const S = r.semanas
  if (!Number.isInteger(S) || S < 1 || S > 20) e('"semanas" precisa ser um número inteiro entre 1 e 20.')
  const ritmo = r.ritmo || "semanal"
  if (!["semanal", "segunda-quinta"].includes(ritmo)) e('"ritmo" precisa ser "semanal" ou "segunda-quinta".')
  if (isNaN(Date.parse(r.aberturaMercado))) e('"aberturaMercado" não é uma data válida. Exemplo: "2026-12-07T10:00:00-03:00".')
  if (typeof r.modoTeste !== "boolean") e('"modoTeste" precisa ser true ou false.')
  if (ritmo === "semanal") {
    if (!(r.horasPorSemana > 0)) e('"horasPorSemana" precisa ser maior que zero (168 = semana real, 0.1 = teste acelerado).')
    if (r.modoTeste === false && r.horasPorSemana !== 168) a('Temporada real (modoTeste false) com "horasPorSemana" diferente de 168.')
  } else {
    if (r.escalaTempo != null && !(r.escalaTempo > 0 && r.escalaTempo <= 1)) e('"escalaTempo" precisa ser um número entre 0 e 1 (1 = tempo real; 0.0015 = teste acelerado).')
    if (r.modoTeste === false && r.escalaTempo != null && r.escalaTempo !== 1) e('Temporada real não pode ter "escalaTempo" diferente de 1.')
    if (r.modoTeste === false && !isNaN(Date.parse(r.aberturaMercado))) {
      const sp = new Date(Date.parse(r.aberturaMercado) - 3 * 3600 * 1000)
      const dia = sp.getUTCDay()
      if (!((dia === 1 || dia === 4) && sp.getUTCHours() === 10 && sp.getUTCMinutes() === 0)) {
        e('Com "ritmo": "segunda-quinta", a abertura precisa ser numa segunda ou quinta às 10h00 (horário de Brasília).')
      }
    }
  }
  if (r.modoTeste === true && !/teste/.test(r.id || "")) a('Temporada de teste sem "teste" no id. Recomendado, para não confundir com a real.')

  const g = r.regras || {}
  for (const k of ["saldoInicial", "taxa", "limitePorMusical", "pontoNeutro", "liquidacaoFechamento"]) {
    if (typeof g[k] !== "number") e(`"regras.${k}" precisa ser um número.`)
  }
  const fatores = g.fatores || {}
  if (!Object.keys(fatores).length) e('Faltam os "fatores" em "regras" (ex.: grande, medio, pequeno).')
  const bonus = g.bonusDesafio || {}
  for (const k of ["bronze", "prata", "ouro"]) {
    if (typeof bonus[k] !== "number") e(`"regras.bonusDesafio.${k}" precisa ser um número.`)
  }

  const musicais = Array.isArray(r.musicais) ? r.musicais : []
  if (musicais.length < 2) e('"musicais" precisa ter pelo menos 2 musicais.')
  const semPoster = musicais.filter((m) => !m.poster).length
  if (semPoster > 0) a(`${semPoster} musical(is) ainda sem pôster. Dá para enviar na seção "Pôsteres", abaixo da prévia.`)
  const ids = new Set()
  musicais.forEach((m, i) => {
    const nome = m.titulo || `Musical ${i + 1}`
    if (!ID_VALIDO.test(m.id || "")) e(`${nome}: "id" inválido (só minúsculas, números e hífen).`)
    if (ids.has(m.id)) e(`${nome}: "id" repetido (${m.id}).`)
    ids.add(m.id)
    if (!m.titulo) e(`Musical ${i + 1}: falta "titulo".`)
    if (!m.teatro || !m.teatro.nome) e(`${nome}: falta "teatro.nome".`)
    if (!m.teatro || !(m.teatro.tamanho in fatores)) e(`${nome}: "teatro.tamanho" precisa ser um destes: ${Object.keys(fatores).join(", ")}.`)
    if (!(m.precoInicial > 0)) e(`${nome}: "precoInicial" precisa ser maior que zero.`)
    const f = m.semanaFechamento || 0
    if (!Number.isInteger(f) || f < 0 || (Number.isInteger(S) && f > S)) {
      e(`${nome}: "semanaFechamento" precisa ser 0 (não fecha) ou uma semana entre 1 e ${S}.`)
    }
    const esperado = f > 0 ? f : S
    if (!Array.isArray(m.ocupacao) || m.ocupacao.length !== esperado) {
      e(`${nome}: "ocupacao" precisa ter ${esperado} números (${f > 0 ? "até a semana em que fecha" : "um por semana"}).`)
    } else {
      m.ocupacao.forEach((o, w) => {
        if (typeof o !== "number" || o < 0 || o > 200) e(`${nome}: ocupação da semana ${w + 1} inválida (${o}).`)
      })
    }
    if (!m.sinopse) a(`${nome}: sem sinopse.`)
    if (!m.direcao || !m.direcao.nome) a(`${nome}: sem direção.`)
  })

  const fontes = new Set((r.fontes || []).map((f) => f.id))
  const criticos = new Set((r.criticos || []).map((c) => c.id))
  const fechamento = Object.fromEntries(musicais.map((m) => [m.id, m.semanaFechamento || 0]))

  ;(r.criticas || []).forEach((c, i) => {
    const q = `Crítica ${i + 1}`
    if (!criticos.has(c.critico)) e(`${q}: crítico "${c.critico}" não está na lista "criticos".`)
    if (!ids.has(c.musical)) e(`${q}: musical "${c.musical}" não existe.`)
    if (!Number.isInteger(c.semana) || c.semana < 1 || c.semana > S) e(`${q}: "semana" precisa ser entre 1 e ${S}.`)
    if (typeof c.nota !== "number" || c.nota < 0 || c.nota > 5) e(`${q}: "nota" precisa ser de 0 a 5.`)
    const fm = fechamento[c.musical]
    if (fm && c.semana > fm) a(`${q}: crítica de "${c.musical}" depois de ele fechar.`)
  })

  ;(r.manchetes || []).forEach((m, i) => {
    const q = `Manchete ${i + 1}`
    if (!fontes.has(m.fonte)) e(`${q}: fonte "${m.fonte}" não está na lista "fontes".`)
    if (m.dia !== "segunda" && m.dia !== "quinta") e(`${q}: "dia" precisa ser "segunda" ou "quinta".`)
    if (m.dia === "segunda" && (!Number.isInteger(m.semana) || m.semana < 1 || m.semana > S)) {
      e(`${q}: manchete de segunda precisa ter "semana" entre 1 e ${S}.`)
    }
    if (m.dia === "quinta" && (!Number.isInteger(m.semana) || m.semana < 0 || m.semana > S - 1)) {
      e(`${q}: manchete de quinta precisa ter "semana" entre 0 (antes da estreia) e ${S - 1}.`)
    }
    if (typeof m.verdadeira !== "boolean") e(`${q}: "verdadeira" precisa ser true ou false.`)
    if (!m.texto) e(`${q}: falta "texto".`)
  })

  const semanasComDesafio = new Set()
  ;(r.desafios || []).forEach((d, i) => {
    const q = `Desafio ${i + 1}`
    if (!(d.tipo in TIPOS_DESAFIO)) e(`${q}: "tipo" precisa ser um destes: ${Object.keys(TIPOS_DESAFIO).join(", ")}.`)
    if (!Number.isInteger(d.semana) || d.semana < 1 || d.semana > S) e(`${q}: "semana" precisa ser entre 1 e ${S}.`)
    if (semanasComDesafio.has(d.semana)) e(`${q}: já existe outro desafio na semana ${d.semana}.`)
    semanasComDesafio.add(d.semana)
    if (!d.titulo || !d.descricao) e(`${q}: precisa de "titulo" e "descricao".`)
    const mt = d.metas || {}
    for (const k of ["bronze", "prata", "ouro"]) {
      if (typeof mt[k] !== "number") e(`${q}: "metas.${k}" precisa ser um número.`)
    }
  })
  if (Number.isInteger(S)) {
    for (let w = 1; w <= S; w++) if (!semanasComDesafio.has(w)) a(`Semana ${w} sem desafio.`)
  }

  return { erros, avisos }
}

// ─────────────────────────────────────────────────────────────
// Preços
// ─────────────────────────────────────────────────────────────
// Preço novo = preço anterior × (1 + (ocupação − ponto neutro) / 100 × fator).
// Na semana de fechamento, o preço ainda muda pela ocupação e depois vira
// "liquidacaoFechamento" (ex.: 30%) do valor. Arredondado em centavos a cada semana.
export function calcularPrecos(r) {
  const g = r.regras
  return r.musicais.map((m) => {
    const fator = g.fatores[m.teatro.tamanho]
    const f = m.semanaFechamento || 0
    let p = r2(m.precoInicial)
    const precos = [p]
    m.ocupacao.forEach((o, i) => {
      const semana = i + 1
      p = r2(p * (1 + ((o - g.pontoNeutro) / 100) * fator))
      if (f === semana) p = r2(p * g.liquidacaoFechamento)
      precos.push(p)
    })
    return {
      id: m.id,
      titulo: m.titulo,
      tamanho: m.teatro.tamanho,
      precos,
      fechouNaSemana: f,
      variacaoFinal: precos[precos.length - 1] / precos[0] - 1,
    }
  })
}

export function mediaDoMercado(precos) {
  if (!precos.length) return 0
  return precos.reduce((s, p) => s + p.variacaoFinal, 0) / precos.length
}

// ─────────────────────────────────────────────────────────────
// Estratégias de teste (com taxa, ações inteiras e limite por musical)
// ─────────────────────────────────────────────────────────────
export function simularEstrategias(r, precos) {
  const g = r.regras
  const S = r.semanas
  const taxa = g.taxa
  const precoEm = (p, w) => (w < p.precos.length ? p.precos[w] : null)
  const abertoEm = (p, w) => (p.fechouNaSemana ? w < p.fechouNaSemana : w < S)

  // Dividir igual na abertura e não mexer mais
  let caixa = g.saldoInicial
  const posicoes = precos.map((p) => {
    const alvo = g.saldoInicial / precos.length
    const qtd = Math.floor(alvo / (p.precos[0] * (1 + taxa)))
    caixa -= qtd * p.precos[0] * (1 + taxa)
    return { p, qtd }
  })
  const dividirIgual = caixa + posicoes.reduce((s, { p, qtd }) => s + qtd * p.precos[p.precos.length - 1], 0)

  // Teto: sabendo o futuro, toda semana troca a carteira pelos 2 musicais que mais vão subir
  let caixaT = g.saldoInicial
  let carteira = []
  for (let w = 0; w < S; w++) {
    carteira.forEach(({ p, qtd }) => { caixaT += qtd * p.precos[w] * (1 - taxa) })
    carteira = []
    const candidatos = precos
      .filter((p) => abertoEm(p, w))
      .map((p) => ({ p, ganho: precoEm(p, w + 1) / precoEm(p, w) }))
      .filter((c) => c.ganho > 1 + 2 * taxa)
      .sort((x, y) => y.ganho - x.ganho)
      .slice(0, 2)
    const patrimonio = caixaT
    candidatos.forEach(({ p }) => {
      const alvo = Math.min(patrimonio * g.limitePorMusical, caixaT)
      const qtd = Math.floor(alvo / (p.precos[w] * (1 + taxa)))
      caixaT -= qtd * p.precos[w] * (1 + taxa)
      carteira.push({ p, qtd })
    })
  }
  const teto = caixaT + carteira.reduce((s, { p, qtd }) => s + qtd * p.precos[Math.min(S, p.precos.length - 1)], 0)

  return { naoInvestir: g.saldoInicial, dividirIgual: r2(dividirIgual), teto: r2(teto) }
}

// ─────────────────────────────────────────────────────────────
// Fontes e calendário
// ─────────────────────────────────────────────────────────────
export function conferirFontes(r) {
  return (r.fontes || []).map((f) => {
    const lista = (r.manchetes || []).filter((m) => m.fonte === f.id)
    return { id: f.id, nome: f.nome, total: lista.length, verdadeiras: lista.filter((m) => m.verdadeira).length }
  })
}

export function calendario(r) {
  const rodadas = agendaDaTemporada(r)
  const eventos = [{ quando: new Date(rodadas[0]?.abre ?? Date.parse(r.aberturaMercado)), texto: "Mercado abre (antes da estreia)" }]
  rodadas.forEach((rd, w) => {
    eventos.push({ quando: new Date(rd.plantao), texto: w === 0 ? "Plantão antes da estreia" : `Plantão da semana ${w}` })
    eventos.push({ quando: new Date(rd.fecha), texto: "Mercado fecha" })
    eventos.push({ quando: new Date(rd.resultado), texto: w + 1 === r.semanas ? `Resultado da semana ${w + 1} e fim da temporada` : `Resultado da semana ${w + 1}` })
  })
  return eventos.sort((x, y) => x.quando - y.quando)
}

// ─────────────────────────────────────────────────────────────
// Cartaz público (o que vai para jogoPublico/{id} na publicação)
// Nunca leva: ocupação, semana de fechamento, arco, pista, manchetes
// e críticas futuras, nem a confiabilidade das fontes.
// ─────────────────────────────────────────────────────────────
export function montarPublico(r) {
  const g = r.regras
  const desafio1 = (r.desafios || []).find((d) => d.semana === 1)
  return {
    temporadaId: r.id,
    nome: r.nome,
    modoTeste: r.modoTeste,
    horasPorSemana: r.horasPorSemana ?? null,
    ritmo: r.ritmo || "semanal",
    escalaTempo: r.escalaTempo ?? 1,
    semanas: r.semanas,
    aberturaMercado: new Date(Date.parse(r.aberturaMercado)),
    regras: {
      saldoInicial: g.saldoInicial,
      taxa: g.taxa,
      limitePorMusical: g.limitePorMusical,
      liquidacaoFechamento: g.liquidacaoFechamento,
      bonusDesafio: g.bonusDesafio,
    },
    estado: { semanaAtual: 0, encerrada: false },
    fontes: (r.fontes || []).map(({ id, nome, tipo }) => ({ id, nome, tipo: tipo || "" })),
    criticos: (r.criticos || []).map(({ id, nome, veiculo }) => ({ id, nome, veiculo: veiculo || "" })),
    musicais: r.musicais.map((m) => ({
      id: m.id,
      titulo: m.titulo,
      sinopse: m.sinopse || "",
      poster: m.poster || "",
      teatro: { nome: m.teatro.nome, capacidade: m.teatro.capacidade || null, tamanho: m.teatro.tamanho },
      produtora: m.produtora || "",
      produtoraDescricao: m.produtoraDescricao || "",
      direcao: m.direcao || null,
      equipe: m.equipe || [],
      elenco: m.elenco || [],
      destaques: m.destaques || "",
      precoInicial: r2(m.precoInicial),
      precoAtual: r2(m.precoInicial),
      historico: [],
      fechado: false,
    })),
    criticas: [],
    manchetes: [],
    desafioAtual: desafio1
      ? { semana: 1, tipo: desafio1.tipo, titulo: desafio1.titulo, descricao: desafio1.descricao, metas: desafio1.metas }
      : null,
  }
}
