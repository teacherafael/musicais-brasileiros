import { useState } from "react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "../firebase"

function ReportarErro({ musicalId, musicalTitulo, usuario }) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState("")
  const [enviado, setEnviado] = useState(false)

  async function enviar() {
    if (!texto.trim()) return
    await addDoc(collection(db, "relatorios"), {
      musicalId,
      musicalTitulo,
      texto,
      nome: usuario ? usuario.displayName : "Anônimo",
      userId: usuario ? usuario.uid : null,
      data: serverTimestamp()
    })
    setTexto("")
    setEnviado(true)
    setTimeout(() => {
      setEnviado(false)
      setAberto(false)
    }, 3000)
  }

  return (
    <div style={{ marginBottom: "24px" }}>
      {!aberto ? (
        <button
          onClick={() => setAberto(true)}
          style={{ background: "none", border: "none", fontSize: "13px", color: "#888", cursor: "pointer", padding: 0, textDecoration: "underline" }}
        >
          Reportar erro nesta página
        </button>
      ) : (
        <div style={{ background: "#fff8f8", border: "1px solid #f0e0e0", borderRadius: "8px", padding: "16px" }}>
          <p style={{ fontSize: "14px", fontWeight: "500", marginBottom: "8px" }}>Reportar erro em {musicalTitulo}</p>
          {enviado ? (
            <p style={{ fontSize: "14px", color: "#888" }}>Obrigado! Seu relatório foi enviado.</p>
          ) : (
            <>
              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Descreva o erro encontrado..."
                style={{ width: "100%", height: "80px", padding: "8px", borderRadius: "6px", border: "1px solid #e8e8e4", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", marginBottom: "8px" }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn-comentar" onClick={enviar}>Enviar</button>
                <button className="btn-sair" onClick={() => setAberto(false)}>Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ReportarErro