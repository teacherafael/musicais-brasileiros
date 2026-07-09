// api/upload-imagem.js
// Recebe uma imagem (base64) do admin, gera duas versões otimizadas em WebP
// (grande ~800px e pequena ~400px), sobe as duas pro Cloudflare R2 e devolve
// as URLs públicas. As chaves do R2 ficam nas variáveis de ambiente da Vercel.

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const sharp = require("sharp");

// Aumenta o limite do corpo da requisição (imagens em base64 são grandes)
module.exports.config = {
  api: {
    bodyParser: { sizeLimit: "15mb" },
  },
};

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

// Gera um nome de arquivo único e sem caracteres problemáticos
function gerarNomeBase(nomeOriginal) {
  const semExtensao = (nomeOriginal || "imagem").replace(/\.[^.]+$/, "");
  const limpo = semExtensao
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const sufixo = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  return `${limpo || "imagem"}-${sufixo}`;
}

async function subirParaR2(buffer, chave) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: chave,
    Body: buffer,
    ContentType: "image/webp",
    CacheControl: "public, max-age=31536000, immutable",
  }));
  return `${process.env.R2_PUBLIC_URL}/${chave}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ erro: "Use POST." });
  }

  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    return res.status(500).json({ erro: "Credenciais do R2 não configuradas na Vercel." });
  }

  try {
    const corpo = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { imagemBase64, nomeArquivo, pasta } = corpo;

    if (!imagemBase64) {
      return res.status(400).json({ erro: "Nenhuma imagem enviada." });
    }

    // Remove o prefixo "data:image/...;base64," se vier junto
    const base64Limpo = imagemBase64.replace(/^data:image\/[a-z]+;base64,/i, "");
    const bufferOriginal = Buffer.from(base64Limpo, "base64");

    const nomeBase = gerarNomeBase(nomeArquivo);
    const prefixoPasta = pasta ? `${pasta.replace(/[^a-z0-9-]/gi, "")}/` : "";

    // Versão grande (~800px) — pôster e cartão de compartilhamento
    const grandeBuffer = await sharp(bufferOriginal)
      .rotate() // corrige orientação a partir do EXIF
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    // Versão pequena (~400px) — cards e listas
    const pequenaBuffer = await sharp(bufferOriginal)
      .rotate()
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const chaveGrande = `${prefixoPasta}${nomeBase}-800.webp`;
    const chavePequena = `${prefixoPasta}${nomeBase}-400.webp`;

    const [urlGrande, urlPequena] = await Promise.all([
      subirParaR2(grandeBuffer, chaveGrande),
      subirParaR2(pequenaBuffer, chavePequena),
    ]);

    return res.status(200).json({
      urlGrande,
      urlPequena,
    });
  } catch (e) {
    return res.status(500).json({ erro: "Falha ao processar/subir a imagem.", detalhe: String(e) });
  }
};