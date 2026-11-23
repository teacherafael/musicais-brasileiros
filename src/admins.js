// Lista central de administradores do MBDb.
// >>> Para adicionar ou remover um admin, edite SOMENTE este arquivo. <<<
export const ADMINS = [
  "LFDNXIXywqQrLsDLobaGzOOmok03",
  "ddN3y50zE5X56aQPQzhL17hw8m83",
]

// Recebe o "user" do Firebase Auth (ou o uid direto) e devolve true se for admin.
export function ehAdmin(user) {
  if (!user) return false
  const uid = typeof user === "string" ? user : user.uid
  return ADMINS.includes(uid)
}

// Dono do jogo "Eu Quero Ser Produtor": só ele vê a aba Produtor do /admin
// e o roteiro secreto. O outro admin também joga, então NÃO usar ADMINS aqui.
// A mesma restrição está nas regras do Firestore (função ehDonoDoJogo).
export const DONO_DO_JOGO = "LFDNXIXywqQrLsDLobaGzOOmok03"

export function ehDonoDoJogo(user) {
  if (!user) return false
  const uid = typeof user === "string" ? user : user.uid
  return uid === DONO_DO_JOGO
}
