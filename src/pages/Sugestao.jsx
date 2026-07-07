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
    teatro: "",
    coreografia: "",
    cenografia: "",
    designDeLuz: "",
    designDeSom: "",
    visagismo: "",
    perucaria: "",
    figurino: "",
    regencia: "",
    musicos: "",
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

  const campo = (label, chave, obrigatorio = false, placeholder = "") => (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
        {label} {obrigatorio && <span style={{ color: "#cc0000" }}>*</span>}
      </label>
      <input
        type="text"
        value={form[chave]}
        onChange={e => atualizar(chave, e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none" }}
      />
    </div>
  )

  const campoTexto = (label, chave, placeholder = "") => (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
        {label}
      </label>
      <textarea
        value={form[chave]}
        onChange={e => atualizar(chave, e.target.value)}
        placeholder={placeholder}
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

  const divisoria = (titulo) => (
    <div style={{ marginTop: "8px", marginBottom: "24px" }}>
      <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px", borderBottom: "1px solid #e8e8e4", paddingBottom: "8px" }}>
        {titulo}
      </p>
    </div>
  )

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">Musicais Brasileiros Database</p>
      <h1 className="page-title">Sugerir um musical</h1>
      <p style={{ color: "#888", fontSize: "14px", marginBottom: "32px" }}>
        Preencha as informações do musical que você quer ver na database. Campos com <span style={{ color: "#cc0000" }}>*</span> são obrigatórios. Não se preocupe se não souber tudo — preencha o que tiver.
      </p>

      <div style={{ background: "#fff8e1", border: "1px solid #f0d98a", borderRadius: "8px", padding: "16px 18px", marginBottom: "16px" }}>
        <p style={{ fontSize: "13px", fontWeight: "700", color: "#8a6d00", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
          Antes de sugerir
        </p>
        <p style={{ fontSize: "14px", color: "#5c4a00", lineHeight: "1.6", margin: 0 }}>
          Por favor, confira na <a href="/" style={{ color: "#8a6d00", fontWeight: "700", textDecoration: "underline" }}>busca da Home</a> se o musical já não está cadastrado antes de enviar. Muitas sugestões recentes são de produções que já existem na database.
        </p>
      </div>

      <div style={{ background: "#fff8e1", border: "1px solid #f0d98a", borderRadius: "8px", padding: "16px 18px", marginBottom: "32px" }}>
        <p style={{ fontSize: "13px", fontWeight: "700", color: "#8a6d00", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
          Atenção
        </p>
        <p style={{ fontSize: "14px", color: "#5c4a00", lineHeight: "1.6", margin: 0 }}>
          O MCDb só adiciona espetáculos produzidos com os direitos autorais devidamente adquiridos. Não incluímos musicais escolares, de curso livre ou acadêmicos.
        </p>
      </div>

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

      {divisoria("Ficha técnica principal")}
      {campo("Direção", "direcao")}
      {campo("Direção musical", "direcaoMusical")}
      {campo("Versionista", "versionista")}
      {campo("Texto original", "textoOriginal")}
      {campo("Música original", "musicaOriginal")}
      {campo("Produção", "producao")}
      {campo("Ano de estreia", "ano")}
      {campo("Teatro de estreia", "teatro")}

      {divisoria("Elenco")}
      {campoTexto("Elenco de estreia (nomes separados por vírgula)", "elenco")}
      {campoTexto("Elenco adicional (nomes separados por vírgula)", "elencoAdicional")}

      {divisoria("Equipe criativa")}
      {campo("Coreografia", "coreografia", false, "Nomes separados por vírgula")}
      {campo("Cenografia", "cenografia", false, "Nomes separados por vírgula")}
      {campo("Design de luz", "designDeLuz", false, "Nomes separados por vírgula")}
      {campo("Design de som", "designDeSom", false, "Nomes separados por vírgula")}
      {campo("Visagismo", "visagismo", false, "Nomes separados por vírgula")}
      {campo("Perucaria", "perucaria", false, "Nomes separados por vírgula")}
      {campo("Figurino", "figurino", false, "Nomes separados por vírgula")}
      {campo("Regência", "regencia", false, "Nomes separados por vírgula")}
      {campoTexto("Músicos", "musicos", "Nomes separados por vírgula. Se houver bandas diferentes por cidade, indique: ex: São Paulo: Nome1, Nome2 / Rio de Janeiro: Nome3, Nome4")}

      <button className="btn-comentar" onClick={enviar} style={{ marginTop: "8px" }}>
        Enviar sugestão
      </button>
    </main>
  )
}

export default Sugestao
