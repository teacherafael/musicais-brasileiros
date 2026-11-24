// api/jogo-atualizar.js
// Faz o jogo "Eu Quero Ser Produtor" andar sozinho:
//   - plantão de quinta: publica as manchetes de quinta da semana;
//   - resultado de segunda: preços novos, críticas e manchetes da semana,
//     fecha musicais (vendendo as ações por 30%), tira a foto das carteiras,
//     publica o próximo desafio e avisa os jogadores pelo sino.
//
// Quem chama:
//   - o próprio site, quando alguém abre o jogo e há algo pendente
//     (/api/jogo-atualizar?temporada=ID), a "liberação preguiçosa";
//   - o agendamento diário da Vercel (sem parâmetro: todas as temporadas ativas).
//
// É seguro chamar quantas vezes for: só faz o que já está no horário e,
// com a trava em transação, nunca processa a mesma coisa duas vezes.

const { FieldValue, Timestamp } = require("firebase-admin/firestore")
const { db } = require("./_firebaseAdmin")
const { proximaAcao, manchetesDoPlantao, montarResultado, aplicarResultadoNaCarteira, montarRanking } = require("./_jogoSemana")

const ID_VALIDO = /^[a-z0-9-]+$/
const TRAVA_MS = 4 * 60 * 1000
const VALIDADE_NOTIFICACAO_DIAS = 14

const bravos = (n) => Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (x) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(1).replace(".", ",")}%`

function notificacao(texto, link) {
  return {
    tipo: "jogo",
    texto,
    link,
    lida: false,
    data: FieldValue.serverTimestamp(),
    expiraEm: Timestamp.fromMillis(Date.now() + VALIDADE_NOTIFICACAO_DIAS * 24 * 3600 * 1000),
    origem: "jogo",
  }
}

async function processarTemporada(banco, temporadaId) {
  const refPublico = banco.collection("jogoPublico").doc(temporadaId)
  const feitos = []
  let roteiro = null
  let motor = null

  for (let volta = 0; volta < 12; volta++) {
    // 1) Reserva a próxima ação pendente (transação = só uma chamada executa)
    const reserva = await banco.runTransaction(async (tx) => {
      const snap = await tx.get(refPublico)
      if (!snap.exists) return { fim: "temporada não encontrada" }
      const t = snap.data()
      const acao = proximaAcao(t)
      if (!acao) return { fim: "nada pendente" }
      const trava = t.estado?.processando
      if (trava && Date.now() - trava.desde < TRAVA_MS) return { fim: "já está sendo processada" }
      tx.update(refPublico, { "estado.processando": { ...acao, desde: Date.now() } })
      return { acao, t }
    })
    if (reserva.fim) {
      feitos.push(reserva.fim)
      break
    }

    const { acao, t } = reserva
    const link = t.modoTeste ? `/produtor?temporada=${temporadaId}` : "/produtor"

    try {
      if (!roteiro) {
        const secreto = await banco.collection("jogoSecreto").doc(temporadaId).get()
        if (!secreto.exists) throw new Error("Roteiro secreto não encontrado.")
        roteiro = secreto.data().roteiro
      }
      const carteiras = await banco.collection("jogoCarteiras").where("temporadaId", "==", temporadaId).get()
      const escritor = banco.bulkWriter()

      if (acao.tipo === "plantao") {
        const novas = manchetesDoPlantao(roteiro, acao.semana)
        if (novas.length) {
          carteiras.forEach((doc) => {
            const uid = doc.data().uid
            if (!uid) return
            escritor.create(
              banco.collection("notificacoes").doc(uid).collection("itens").doc(),
              notificacao("Plantão no Eu Quero Ser Produtor: tem manchete nova no cartaz. Será verdade?", link)
            )
          })
        }
        await escritor.close()
        await refPublico.update({
          manchetes: [...(t.manchetes || []), ...novas],
          "estado.plantaoLiberado": acao.semana,
          "estado.processando": FieldValue.delete(),
        })
        feitos.push(`plantão da semana ${acao.semana} (${novas.length} manchete(s))`)
      } else {
        if (!motor) motor = await import("../src/jogo/motor.js")
        const s = acao.semana
        const resultado = montarResultado(t, roteiro, motor.calcularPrecos(roteiro), s)

        let processadas = 0
        const paraRanking = []
        carteiras.forEach((doc) => {
          const out = aplicarResultadoNaCarteira(doc.data(), resultado, s)
          paraRanking.push(out ? out.carteira : doc.data())
          if (!out) return
          processadas++
          escritor.set(doc.ref, { ...out.carteira, atualizadaEm: FieldValue.serverTimestamp() })
          out.operacoes.forEach((op) => {
            escritor.create(doc.ref.collection("operacoes").doc(), { ...op, criadaEm: FieldValue.serverTimestamp() })
          })
          const uid = out.carteira.uid
          if (uid) {
            // Selo do desafio da semana
            if (out.selo) {
              escritor.create(
                banco.collection("notificacoes").doc(uid).collection("itens").doc(),
                notificacao(`Desafio "${out.selo.titulo}": você ganhou o selo de ${out.selo.nivel}!${out.selo.bonus ? ` +${bravos(out.selo.bonus)} Bravos na carteira.` : ""}`, link)
              )
            }
            // Aviso próprio para cada musical que fechou com ações do jogador
            out.operacoes.filter((op) => op.tipo === "liquidacao").forEach((op) => {
              escritor.create(
                banco.collection("notificacoes").doc(uid).collection("itens").doc(),
                notificacao(`${op.titulo} fechou. Suas ${op.quantidade} ações foram vendidas por ${bravos(op.preco)} cada (total ${bravos(op.total)} Bravos).`, link)
              )
            })
            const texto = resultado.final
              ? `A temporada do Eu Quero Ser Produtor terminou! Seu patrimônio final: ${bravos(out.patrimonio)} Bravos.`
              : `Saiu o resultado da semana ${s} no Eu Quero Ser Produtor! Seu patrimônio: ${bravos(out.patrimonio)} Bravos (${pct(out.variacaoSemana)}).`
            escritor.create(banco.collection("notificacoes").doc(uid).collection("itens").doc(), notificacao(texto, link))
          }
        })
        await escritor.close()

        // Ranking da temporada (ranking geral e Hall da Fama ficam para a etapa 7)
        await banco.collection("jogoRanking").doc(temporadaId).set({
          ...montarRanking(paraRanking, s, t.regras?.saldoInicial || 0, !!t.modoTeste),
          final: resultado.final,
          atualizadoEm: FieldValue.serverTimestamp(),
        })

        await refPublico.update({
          musicais: resultado.musicais,
          criticas: resultado.criticas,
          manchetes: resultado.manchetes,
          desafioAtual: resultado.desafioAtual,
          "estado.semanaAtual": s,
          "estado.encerrada": resultado.final,
          "estado.ultimaLiberacao": FieldValue.serverTimestamp(),
          "estado.processando": FieldValue.delete(),
        })
        feitos.push(`resultado da semana ${s} (${processadas} carteira(s)${resultado.fecharam.length ? `, fecharam: ${resultado.fecharam.join(", ")}` : ""})`)
      }
    } catch (e) {
      // Solta a trava para a próxima chamada tentar de novo
      await refPublico.update({ "estado.processando": FieldValue.delete() }).catch(() => {})
      throw e
    }
  }
  return { temporadaId, feitos }
}

module.exports = async (req, res) => {
  const banco = db()
  const pedida = req.query?.temporada

  try {
    let ids
    if (pedida) {
      if (!ID_VALIDO.test(pedida)) return res.status(400).json({ erro: "Temporada inválida." })
      ids = [pedida]
    } else {
      const ativas = await banco.collection("jogoPublico").where("estado.encerrada", "==", false).get()
      ids = ativas.docs.map((d) => d.id)
    }

    const resultados = []
    for (const id of ids) resultados.push(await processarTemporada(banco, id))
    return res.status(200).json({ ok: true, resultados })
  } catch (e) {
    console.error("jogo-atualizar:", e)
    return res.status(500).json({ erro: "Erro ao atualizar o jogo." })
  }
}
