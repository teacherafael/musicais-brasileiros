// api/_jogo.js
// Regras do jogo "Eu Quero Ser Produtor" usadas pelas funções do servidor.
// Arquivos que começam com "_" não viram rota na Vercel.
// ATENÇÃO: estas contas espelham src/jogo/motor.js e src/jogo/publico.js.
// Se mudar uma fórmula lá, mude aqui também.

const FRACAO_FECHA_ANTES = 10 / 168

// O Rafael cria o roteiro, então joga com informação privilegiada: fica fora do ranking.
const DONO_DO_JOGO = "LFDNXIXywqQrLsDLobaGzOOmok03"

const r2 = (n) => Math.round(n * 100) / 100

function paraMs(x) {
  if (!x) return 0
  if (typeof x.toMillis === "function") return x.toMillis()
  if (typeof x.toDate === "function") return x.toDate().getTime()
  return new Date(x).getTime()
}

// ─────────────────────────────────────────────────────────────
// Agenda das rodadas ("semanas" do jogo)
// ritmo "semanal" (padrão): uma rodada a cada horasPorSemana horas
//   (168 = semana real; valores pequenos = teste acelerado).
// ritmo "segunda-quinta": duas rodadas por semana real, resultados
//   segunda e quinta às 10h. Plantão: terça 20h (rodada seg→qui) e
//   sábado 12h (rodada qui→seg). Mercado fecha 10h antes do resultado
//   (quarta e domingo 23h59). escalaTempo encolhe tudo para teste
//   (ex.: 0.0015 = rodadas de 6 a 9 minutos).
// ESPELHO de src/jogo/motor.js (agendaDaTemporada). Mudou lá, mude aqui.
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

function agendaDaTemporada(t) {
  return agendaDaTemporadaBase(t, paraMs(t.aberturaMercado))
}

// O mercado está aberto entre a liberação da semana atual e o fechamento
// (10h antes do resultado). Antes da estreia, depois do fechamento
// ou com a temporada encerrada, está fechado.
function mercadoAberto(t, agoraMs = Date.now()) {
  if (t.estado?.encerrada) return { aberto: false, motivo: "A temporada já terminou." }
  const w = t.estado?.semanaAtual || 0
  if (w >= t.semanas) return { aberto: false, motivo: "A temporada já terminou." }
  const { abre, fecha } = agendaDaTemporada(t)[w]
  if (agoraMs < abre) return { aberto: false, motivo: "O mercado ainda não abriu." }
  if (agoraMs >= fecha) return { aberto: false, motivo: "O mercado está fechado até o próximo resultado." }
  return { aberto: true, semana: w }
}

function patrimonio(carteira, musicais) {
  const preco = Object.fromEntries(musicais.map((m) => [m.id, m.fechado ? 0 : m.precoAtual]))
  const acoes = carteira.acoes || {}
  return r2((carteira.saldo || 0) + Object.keys(acoes).reduce((s, id) => s + (acoes[id] || 0) * (preco[id] || 0), 0))
}

// Confere o login pelo token do Firebase enviado no cabeçalho Authorization
async function usuarioDoToken(req, auth) {
  const cabecalho = req.headers.authorization || ""
  const token = cabecalho.startsWith("Bearer ") ? cabecalho.slice(7) : ""
  if (!token) return null
  try {
    return await auth().verifyIdToken(token)
  } catch (e) {
    return null
  }
}

class ErroDoJogo extends Error {}

// Aplica uma compra ou venda. Função pura: recebe a temporada e a carteira
// (ou null, se o jogador ainda não tem) e devolve a carteira nova e a operação.
// Lança ErroDoJogo com uma mensagem para o jogador quando a operação não vale.
function aplicarOperacao({ t, carteira, musicalId, tipo, quantidade, agoraMs = Date.now() }) {
  const mercado = mercadoAberto(t, agoraMs)
  if (!mercado.aberto) throw new ErroDoJogo(mercado.motivo)

  const musicais = t.musicais || []
  const m = musicais.find((x) => x.id === musicalId)
  if (!m) throw new ErroDoJogo("Musical não encontrado.")
  if (m.fechado) throw new ErroDoJogo("Este musical fechou e não aceita mais operações.")

  const regras = t.regras || {}
  const c = carteira || {
    saldo: regras.saldoInicial,
    acoes: {},
    custo: {},
    numOperacoes: 0,
    fotoSemana: { semana: mercado.semana, saldo: regras.saldoInicial, acoes: {}, patrimonio: regras.saldoInicial },
  }

  const acoes = { ...(c.acoes || {}) }
  const custo = { ...(c.custo || {}) }
  const tenho = acoes[musicalId] || 0
  const preco = m.precoAtual
  const valor = r2(quantidade * preco)
  const taxa = r2(valor * regras.taxa)
  let saldo = c.saldo
  let total

  if (tipo === "compra") {
    total = r2(valor + taxa)
    if (total > saldo + 1e-9) throw new ErroDoJogo("Saldo insuficiente para essa compra.")
    const limite = regras.limitePorMusical * patrimonio(c, musicais)
    if ((tenho + quantidade) * preco > limite + 1e-9) {
      const maximo = Math.max(0, Math.floor((limite + 1e-9) / preco) - tenho)
      throw new ErroDoJogo(
        `Nenhum musical pode passar de ${Math.round(regras.limitePorMusical * 100)}% do seu patrimônio. ` +
          `Neste momento você pode comprar no máximo ${maximo} ${maximo === 1 ? "ação" : "ações"} dele.`
      )
    }
    saldo = r2(saldo - total)
    acoes[musicalId] = tenho + quantidade
    custo[musicalId] = r2((custo[musicalId] || 0) + total)
  } else {
    if (quantidade > tenho) throw new ErroDoJogo(`Você só tem ${tenho} ${tenho === 1 ? "ação" : "ações"} deste musical.`)
    total = r2(valor - taxa)
    saldo = r2(saldo + total)
    acoes[musicalId] = tenho - quantidade
    custo[musicalId] = r2((custo[musicalId] || 0) * (1 - quantidade / tenho))
    if (acoes[musicalId] === 0) { delete acoes[musicalId]; delete custo[musicalId] }
  }

  return {
    nova: !carteira,
    carteira: { ...c, saldo, acoes, custo, numOperacoes: (c.numOperacoes || 0) + 1 },
    operacao: { tipo, musicalId, titulo: m.titulo, quantidade, preco, valor, taxa, total, semana: mercado.semana },
    patrimonio: patrimonio({ saldo, acoes }, musicais),
  }
}

function lerCorpo(req) {
  if (!req.body) return {}
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body) } catch (e) { return {} }
  }
  return req.body
}

module.exports = { FRACAO_FECHA_ANTES, DONO_DO_JOGO, agendaDaTemporada, r2, paraMs, mercadoAberto, patrimonio, aplicarOperacao, ErroDoJogo, usuarioDoToken, lerCorpo }
