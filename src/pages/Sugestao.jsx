import { useState } from "react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { useEffect } from "react"

function Sugestao() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(null)
  const [enviado, setEnviado] = useState(false)
  const [form, setForm] = useState({
    titulo: "",
    sinopse: "",
    direcao: "",
    direcaoMusical: "",
    producao: "",
    elenco: "",
    elencoAdicional: "",
    versionista: "",
    textoOriginal: "",
    musicaOriginal: "",
    ano: "",
    teatro: ""
  })

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function enviar() {
    if (!form.titulo.trim()) return alert("O título é obrigatório.")
    await addDoc(collection(db, "sugestoes"), {
      ...form,
      nome: usuario ? usuario.displayName : "Anônimo",
      userId: usuario ? usuario.uid : null,
      data: serverTimestamp(),
      status: "pendente"
    })
    setEnviado(true)
  }

  const campo = (label, chave, obrigatorio = false) => (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
        {label} {obrigatorio && <span style={{ color: "#cc0000" }}>*</span>}
      </label>
      <input
        type="text"
        value={form[chave]}
        onChange={e => atualizar(chave, e.target.value)}
        style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none" }}
      />
    </div>
  )

  const campoTexto = (label, chave) => (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
        {label}
      </label>
      <textarea
        value={form[chave]}
        onChange={e => atualizar(chave, e.target.value)}
        rows={4}
        style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none", resize: "vertical" }}
      />
    </div>
  )

  if (enviado) return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <h1 className="page-title">Obrigado pela sugestão!</h1>
      <p style={{ color: "#888", fontSize: "15px" }}>Sua sugestão foi enviada e será analisada em breve.</p>
    </main>
  )

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">Musicais Brasileiros Database</p>
      <h1 className="page-title">Sugerir um musical</h1>
      <p style={{ color: "#888", fontSize: "14px", marginBottom: "32px" }}>
        Preencha as informações do musical que você quer ver na database. Campos com * são obrigatórios.
      </p>

      {campo("Título", "titulo", true)}

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
          Sinopse
        </label>
        <textarea
          value={form.sinopse}
          onChange={e => atualizar("sinopse", e.target.value)}
          placeholder="Descreva o enredo do musical..."
          style={{ width: "100%", height: "100px", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none", resize: "vertical" }}
        />
      </div>

      {campo("Direção", "direcao")}
      {campo("Direção musical", "direcaoMusical")}
      {campo("Produção", "producao")}
      {campoTexto("Elenco (nomes separados por vírgula)", "elenco")}
      {campoTexto("Elenco adicional (nomes separados por vírgula)", "elencoAdicional")}
      {campo("Versionista", "versionista")}
      {campo("Texto original", "textoOriginal")}
      {campo("Música original", "musicaOriginal")}
      {campo("Ano de estreia", "ano")}
      {campo("Teatro de estreia", "teatro")}

      <button className="btn-comentar" onClick={enviar} style={{ marginTop: "8px" }}>
        Enviar sugestão
      </button>
    </main>
  )
}

export default Sugestao
