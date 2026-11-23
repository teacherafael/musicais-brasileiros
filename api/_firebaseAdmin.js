// api/_firebaseAdmin.js
// Conexão do servidor com o Firestore, usada pelas funções do jogo.
// A chave fica na variável de ambiente FIREBASE_SERVICE_ACCOUNT da Vercel,
// nunca no código. O "_" no nome impede a Vercel de expor este arquivo como rota.

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

function iniciar() {
  if (getApps().length) return getApps()[0];
  const bruto = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!bruto) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT não configurada na Vercel.");
  }
  return initializeApp({ credential: cert(JSON.parse(bruto)) });
}

module.exports = {
  db: () => getFirestore(iniciar()),
  auth: () => getAuth(iniciar()),
};