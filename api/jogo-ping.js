// api/jogo-ping.js
// Teste da conexão do servidor com o Firestore (etapa 1 do jogo).
// Lê o indices/home pelo firebase-admin e devolve o total de musicais.

const { db } = require("./_firebaseAdmin");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ erro: "Use GET." });
  }

  try {
    const snap = await db().collection("indices").doc("home").get();
    if (!snap.exists) {
      return res.status(404).json({ ok: false, erro: "indices/home não encontrado." });
    }
    const dados = snap.data();
    return res.status(200).json({
      ok: true,
      totalMusicais: dados.total ?? null,
      partes: dados.partes ?? 1,
      atualizadoEm: dados.atualizadoEm?.toDate ? dados.atualizadoEm.toDate().toISOString() : null,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      erro: "Falha ao ler o Firestore pelo servidor.",
      detalhe: String(e.message || e),
    });
  }
};