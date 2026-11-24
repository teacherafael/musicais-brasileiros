// api/jogo-operar.js
// Compra e venda de ações do jogo "Eu Quero Ser Produtor".
// O navegador nunca grava a carteira: tudo passa por aqui, dentro de uma
// transação do Firestore, para dois cliques rápidos não gastarem o mesmo saldo.
// As contas ficam em aplicarOperacao (api/_jogo.js).

const { FieldValue } = require("firebase-admin/firestore")
const { db, auth } = require("./_firebaseAdmin")
const { aplicarOperacao, ErroDoJogo, usuarioDoToken, lerCorpo } = require("./_jogo")

const ID_VALIDO = /^[a-z0-9-]+$/

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST." })

  const usuario = await usuarioDoToken(req, auth)
  if (!usuario) return res.status(401).json({ erro: "Faça login para investir." })

  const corpo = lerCorpo(req)
  const { temporadaId, musicalId, tipo } = corpo
  const quantidade = Number(corpo.quantidade)

  if (!ID_VALIDO.test(temporadaId || "") || !ID_VALIDO.test(musicalId || "")) {
    return res.status(400).json({ erro: "Pedido inválido." })
  }
  if (tipo !== "compra" && tipo !== "venda") return res.status(400).json({ erro: "Pedido inválido." })
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 100000) {
    return res.status(400).json({ erro: "A quantidade precisa ser um número inteiro maior que zero." })
  }

  const banco = db()
  const refTemporada = banco.collection("jogoPublico").doc(temporadaId)
  const refCarteira = banco.collection("jogoCarteiras").doc(`${temporadaId}_${usuario.uid}`)

  try {
    const resultado = await banco.runTransaction(async (tx) => {
      const [snapT, snapC, snapU] = await Promise.all([
        tx.get(refTemporada),
        tx.get(refCarteira),
        tx.get(banco.collection("usuarios").doc(usuario.uid)),
      ])
      if (!snapT.exists) throw new ErroDoJogo("Temporada não encontrada.")

      const r = aplicarOperacao({
        t: snapT.data(),
        carteira: snapC.exists ? snapC.data() : null,
        musicalId,
        tipo,
        quantidade,
      })

      const agora = FieldValue.serverTimestamp()
      const c = r.carteira
      const gravar = {
        ...c,
        temporadaId,
        uid: usuario.uid,
        // Nome e foto do perfil do MCDb (o que a pessoa já escolheu mostrar no site)
        nome: (snapU.exists && snapU.data().nome) || usuario.name || c.nome || "Produtor anônimo",
        foto: (snapU.exists && (snapU.data().fotoCustom || snapU.data().foto)) || usuario.picture || c.foto || "",
        primeiraOperacaoEm: c.primeiraOperacaoEm || agora,
        atualizadaEm: agora,
      }
      if (r.nova) gravar.criadaEm = agora
      tx.set(refCarteira, gravar)
      tx.set(refCarteira.collection("operacoes").doc(), { ...r.operacao, criadaEm: agora })

      return { saldo: c.saldo, acoes: c.acoes, patrimonio: r.patrimonio, operacao: r.operacao }
    })

    return res.status(200).json({ ok: true, ...resultado })
  } catch (e) {
    if (e instanceof ErroDoJogo) return res.status(400).json({ erro: e.message })
    console.error("jogo-operar:", e)
    return res.status(500).json({ erro: "Erro no servidor. Tente de novo em instantes." })
  }
}
