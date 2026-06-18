// api/preencher-ia.js
// Recebe um texto-fonte (programa, release, matéria, página de teatro) e devolve
// os campos do musical estruturados em JSON. NÃO inventa: o que não estiver na
// fonte volta vazio. A chave da API fica na variável de ambiente da Vercel.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// Estrutura de resposta esperada (todos os campos do seu formulário)
const CAMPOS = `{
  "titulo": "",
  "sinopse": "",
  "direcao": "",
  "direcaoMusical": "",
  "producao": "",
  "elenco": "",
  "elencoAdicional": "",
  "versionista": "",
  "textoOriginal": "",
  "musicaOriginal": "",
  "ano": "",
  "teatros": []
}`;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Use POST." });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ erro: "ANTHROPIC_API_KEY não configurada na Vercel." });
  }

  try {
    const corpo = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const texto = (corpo.texto || "").trim();

    if (texto.length < 20) {
      return res.status(400).json({ erro: "Cole um texto-fonte com mais conteúdo." });
    }

    const prompt = `Você vai extrair informações de um musical brasileiro a partir do TEXTO-FONTE abaixo e organizá-las em JSON.

REGRAS ABSOLUTAS:
- Use SOMENTE o que está escrito no TEXTO-FONTE. NÃO use conhecimento próprio. NÃO complete por suposição ou memória.
- Se uma informação não estiver clara no texto, deixe o campo vazio ("" para texto, [] para listas). Campo vazio é melhor que campo errado.
- "elenco" e "elencoAdicional": nomes separados por vírgula, em uma única string. Coloque os protagonistas/principais em "elenco" e o restante (ensemble, participações) em "elencoAdicional" só se o texto fizer essa distinção; senão jogue tudo em "elenco".
- "teatros": lista (array) com os nomes dos teatros mencionados. Se houver só um, retorne uma lista com um item. Se nenhum, [].
- "direcao" = diretor(a) geral; "direcaoMusical" = diretor(a) musical; "producao" = produtora/empresa; "versionista" = quem fez a versão em português; "textoOriginal" = autor do livro/texto original; "musicaOriginal" = compositor original; "ano" = ano da montagem (só o número).
- Não invente sinopse: se o texto não trouxer uma, deixe "sinopse" vazia.

Responda APENAS com o JSON, sem nenhum texto antes ou depois, sem markdown, sem crases. Use exatamente estas chaves:
${CAMPOS}

TEXTO-FONTE:
"""
${texto}
"""`;

    const resposta = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      return res.status(502).json({ erro: "Erro na API da Anthropic.", detalhe: dados });
    }

    const textoResposta = (dados.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    const limpo = textoResposta.replace(/```json/gi, "").replace(/```/g, "").trim();

    let json;
    try {
      json = JSON.parse(limpo);
    } catch (e) {
      return res.status(502).json({
        erro: "A IA não devolveu um JSON válido. Tente de novo ou ajuste o texto.",
        bruto: textoResposta,
      });
    }

    return res.status(200).json(json);
  } catch (e) {
    return res.status(500).json({ erro: "Falha interna.", detalhe: String(e) });
  }
};