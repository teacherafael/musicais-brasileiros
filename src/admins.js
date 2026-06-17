// Lista central de administradores do MBDb.
// >>> Para adicionar ou remover um admin, edite SOMENTE este arquivo. <<<
export const ADMINS = [
  "LFDNXIXywqQrLsDLobaGzOOmok03",
  "ddN3y50zE5X56aQPQzhL17hw8m83",
  "5WGYySuddjR4PhZOiu6g99XdBK33",
]

// Recebe o "user" do Firebase Auth (ou o uid direto) e devolve true se for admin.
export function ehAdmin(user) {
  if (!user) return false
  const uid = typeof user === "string" ? user : user.uid
  return ADMINS.includes(uid)
}