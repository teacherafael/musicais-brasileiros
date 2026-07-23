import { useState, useEffect } from "react"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { equipeInicial, montarPayload, TIPOS_OBRA } from "../musicalSchema"

function Sugestao() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(null)
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false)

  const [form, setForm] = useState({
    titulo: "",
    tituloOriginal: "",
    tipoObra: "Musical",
    sinopse: "",
    elenco: "",
    elencoAdicional: "",
    ano: "",
    programaDigital: "",
  })
  const [equipe, setEquipe] = useState(equipeInicial())
  const [teatros, setTeatros] = useState([])
  const [musicos, setMusicos] = useState([])
  const [fontes, setFontes] = useState([])

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  // ── Equipe ──────────────────────────────────────────────
  function mudarEquipe(index, texto) {
    setEquipe(prev => prev.map((r, i) => i === index ? { ...r, nomesTexto: texto } : r))
  }
  function mudarCargoLivre(index, texto) {
    setEquipe(prev => prev.map((r, i) => i === index ? { ...r, cargoTexto: texto } : r))
  }
  function adicionarCargoLivre() {
    setEquipe(prev => [...prev, { funcao: "", nomesTexto: "", livre: true, cargoTexto: "" }])
  }
  function removerLinhaEquipe(index) {
    setEquipe(prev => prev.filter((_, i) => i !== index))
  }

  // ── Teatros ─────────────────────────────────────────────
  function adicionarTeatro() { setTeatros(prev => [...prev, { ano: "", teatrosTexto: "" }]) }
  function mudarTeatro(index, campo, valor) {
    setTeatros(prev => prev.map((t, i) => i === index ? { ...t, [campo]: valor } : t))
  }
  function removerTeatro(index) { setTeatros(prev => prev.filter((_, i) => i !== index)) }

  // ── Músicos ─────────────────────────────────────────────
  function adicionarMusico() { setMusicos(prev => [...prev, { local: "", nomesTexto: "" }]) }
  function mudarMusico(index, campo, valor) {
    setMusicos(prev => prev.map((m, i) => i === index ? { ...m, [campo]: valor } : m))
  }
  function removerMusico(index) { setMusicos(prev => prev.filter((_, i) => i !== index)) }

  // ── Fontes ──────────────────────────────────────────────
  function adicionarFonte() { setFontes(prev => [...prev, { descricao: "", link: "" }]) }
  function mudarFonte(index, campo, valor) {
    setFontes(prev => prev.map((f, i) => i === index ? { ...f, [campo]: valor } : f))
  }
  function removerFonte(index) { setFontes(prev => prev.filter((_, i) => i !== index)) }

  async function enviar() {
    if (!form.titulo.trim()) return alert("O título é obrigatório.")
    if (enviando) return
    setEnviando(true)
    try {
      const payload = montarPayload(form, equipe, musicos, teatros, "", fontes)
      await addDoc(collection(db, "sugestoes"), {
        ...payload,
        nome: usuario ? usuario.displayName : "Anônimo",
        userId: usuario ? usuario.uid : null,
        data: serverTimestamp(),
        status: "pendente",
      })
      setEnviado(true)
    } catch (e) {
      alert("Erro ao enviar a sugestão. Tente novamente.")
      setEnviando(false)
    }
  }

  // ── Estilos reutilizados ────────────────────────────────
  const labelStyle = { display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }
  const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none", boxSizing: "border-box" }
  const btnAdicionar = { background: "none", border: "1px dashed #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer", marginTop: "4px" }
  const btnRemover = { background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "16px", padding: "10px 4px", flexShrink: 0 }

  const campo = (label, chave, obrigatorio = false, placeholder = "") => (
    <div style={{ marginBottom: "16px" }}>
      <label style={labelStyle}>
        {label} {obrigatorio && <span style={{ color: "#cc0000" }}>*</span>}
      </label>
      <input type="text" value={form[chave]} onChange={e => atualizar(chave, e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  )

  const campoTexto = (label, chave, placeholder = "") => (
    <div style={{ marginBottom: "16px" }}>
      <label style={labelStyle}>{label}</label>
      <textarea value={form[chave]} onChange={e => atualizar(chave, e.target.value)} placeholder={placeholder} rows={4}
        style={{ ...inputStyle, resize: "vertical" }} />
    </div>
  )

  const divisoria = (titulo) => (
    <div style={{ marginTop: "8px", marginBottom: "24px" }}>
      <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "16px", borderBottom: "1px solid #e8e8e4", paddingBottom: "8px" }}>
        {titulo}
      </p>
    </div>
  )

  const linhaEquipe = (item, i) => (
    <div key={i} style={{ marginBottom: "16px" }}>
      <label style={labelStyle}>{item.funcao}</label>
      <input type="text" value={item.nomesTexto} onChange={e => mudarEquipe(i, e.target.value)}
        placeholder="Nomes separados por vírgula" style={inputStyle} />
    </div>
  )

  const linhaLivre = (item, i) => (
    <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "flex-end" }}>
      <div style={{ width: "150px", flexShrink: 0 }}>
        <label style={labelStyle}>Cargo</label>
        <input type="text" value={item.cargoTexto || ""} onChange={e => mudarCargoLivre(i, e.target.value)}
          placeholder="Cargo" style={inputStyle} />
      </div>
      <div style={{ flex: 1 }}>
        <label style={labelStyle}>Nomes</label>
        <input type="text" value={item.nomesTexto} onChange={e => mudarEquipe(i, e.target.value)}
          placeholder="Nomes separados por vírgula" style={inputStyle} />
      </div>
      <button onClick={() => removerLinhaEquipe(i)} style={btnRemover} title="Remover">✕</button>
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
        Preencha as informações do musical que você quer ver na database. Campos com <span style={{ color: "#cc0000" }}>*</span> são obrigatórios. Não se preocupe se não souber tudo — preencha o que tiver.
      </p>

      <div style={{ background: "#fff8e1", border: "1px solid #f0d98a", borderLeft: "5px solid #f5c518", borderRadius: "8px", padding: "16px 18px", marginBottom: "16px" }}>
        <p style={{ fontSize: "14px", fontWeight: "700", color: "#8a6d00", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
          🔍 Antes de sugerir
        </p>
        <p style={{ fontSize: "14px", color: "#5c4a00", lineHeight: "1.6", margin: 0 }}>
          Por favor, confira na <a href="/" style={{ color: "#8a6d00", fontWeight: "700", textDecoration: "underline" }}>busca da Home</a> se o musical já não está cadastrado antes de enviar. Muitas sugestões recentes são de produções que já existem na database.
        </p>
      </div>

      <div style={{ background: "#fdecea", border: "1px solid #e57373", borderLeft: "5px solid #d32f2f", borderRadius: "8px", padding: "18px 20px", marginBottom: "32px" }}>
        <p style={{ fontSize: "17px", fontWeight: "800", color: "#c62828", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
          ⚠️ Atenção
        </p>
        <p style={{ fontSize: "15px", fontWeight: "500", color: "#7a1515", lineHeight: "1.6", margin: 0 }}>
          O MCDb só adiciona espetáculos produzidos com os direitos autorais devidamente adquiridos. Não incluímos musicais amadores, escolares, de curso livre ou acadêmicos.
        </p>
      </div>

      {campo("Título", "titulo", true)}
      {campo("Título original", "tituloOriginal", false, "Se for uma versão de um musical estrangeiro")}

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Tipo de obra</label>
        <select value={form.tipoObra || "Musical"} onChange={e => atualizar("tipoObra", e.target.value)}
          style={{ ...inputStyle, background: "#fff" }}>
          {TIPOS_OBRA.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <p style={{ fontSize: "13px", color: "#aaa", marginTop: "6px", marginBottom: 0, lineHeight: 1.5 }}>
          <strong>Musical:</strong> as canções fazem parte da narrativa. <strong>Peça musicada:</strong> peça de teatro com música incorporada, sem estrutura de musical.
        </p>
      </div>

      {campoTexto("Sinopse", "sinopse", "Descreva o enredo do musical...")}

      {divisoria("Ficha técnica principal")}
      {equipe.map((item, i) => item.essencial ? linhaEquipe(item, i) : null)}
      {campo("Ano de estreia", "ano")}

      <div style={{ marginBottom: "16px" }}>
        <label style={labelStyle}>Teatro(s)</label>
        <p style={{ fontSize: "13px", color: "#aaa", marginTop: "-2px", marginBottom: "10px" }}>
          O primeiro da lista é considerado a estreia.
        </p>
        {teatros.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input type="text" value={t.ano} onChange={e => mudarTeatro(i, "ano", e.target.value)}
              placeholder="Ano" style={{ ...inputStyle, width: "90px", flexShrink: 0 }} />
            <input type="text" value={t.teatrosTexto} onChange={e => mudarTeatro(i, "teatrosTexto", e.target.value)}
              placeholder="Nome do teatro" style={{ ...inputStyle, flex: 1 }} />
            <button onClick={() => removerTeatro(i)} style={btnRemover} title="Remover">✕</button>
          </div>
        ))}
        <button onClick={adicionarTeatro} style={btnAdicionar}>+ Adicionar teatro</button>
      </div>

      {divisoria("Elenco")}
      {campoTexto("Elenco de estreia (nomes separados por vírgula)", "elenco")}
      {campoTexto("Elenco adicional (nomes separados por vírgula)", "elencoAdicional")}

      <button onClick={() => setMostrarDetalhes(v => !v)} style={{
        width: "100%", background: "#faf9f7", border: "1px solid #e8e8e4", borderRadius: "8px",
        padding: "14px 18px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: "600",
        color: "#1a1a1a", cursor: "pointer", textAlign: "left", marginTop: "8px", marginBottom: "24px",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px"
      }}>
        <span>{mostrarDetalhes ? "− Ocultar detalhes adicionais" : "+ Adicionar mais detalhes da ficha técnica (opcional)"}</span>
        {!mostrarDetalhes && <span style={{ color: "#aaa", fontSize: "12px", flexShrink: 0 }}>equipe criativa · músicos · fontes</span>}
      </button>

      {mostrarDetalhes && (
        <>
          {divisoria("Equipe criativa")}
          <p style={{ fontSize: "13px", color: "#aaa", marginTop: "-12px", marginBottom: "20px" }}>
            Preencha só o que souber. Cada campo aceita vários nomes separados por vírgula.
          </p>
          {equipe.map((item, i) => {
            if (item.essencial) return null
            return item.livre ? linhaLivre(item, i) : linhaEquipe(item, i)
          })}
          <button onClick={adicionarCargoLivre} style={{ ...btnAdicionar, marginBottom: "8px" }}>
            + Adicionar outro cargo
          </button>

          {divisoria("Músicos")}
          <p style={{ fontSize: "13px", color: "#aaa", marginTop: "-12px", marginBottom: "16px" }}>
            Se a banda mudou por cidade, adicione um local para cada uma. Se não souber a cidade, pode deixar o local em branco.
          </p>
          {musicos.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input type="text" value={m.local} onChange={e => mudarMusico(i, "local", e.target.value)}
                placeholder="Local (ex: São Paulo)" style={{ ...inputStyle, width: "150px", flexShrink: 0 }} />
              <input type="text" value={m.nomesTexto} onChange={e => mudarMusico(i, "nomesTexto", e.target.value)}
                placeholder="Nomes separados por vírgula" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => removerMusico(i)} style={btnRemover} title="Remover">✕</button>
            </div>
          ))}
          <button onClick={adicionarMusico} style={btnAdicionar}>+ Adicionar local</button>

          {divisoria("Fontes")}
          <p style={{ fontSize: "13px", color: "#aaa", marginTop: "-12px", marginBottom: "16px" }}>
            De onde você tirou essas informações? Ajuda muito na conferência.
          </p>
          {fontes.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
              <input type="text" value={f.descricao} onChange={e => mudarFonte(i, "descricao", e.target.value)}
                placeholder="Descrição (ex: Folha de S.Paulo, 12/03/1998)" style={{ ...inputStyle, flex: 1 }} />
              <input type="text" value={f.link} onChange={e => mudarFonte(i, "link", e.target.value)}
                placeholder="Link (opcional)" style={{ ...inputStyle, width: "180px", flexShrink: 0 }} />
              <button onClick={() => removerFonte(i)} style={btnRemover} title="Remover">✕</button>
            </div>
          ))}
          <button onClick={adicionarFonte} style={btnAdicionar}>+ Adicionar fonte</button>

          <div style={{ marginTop: "24px" }}>
            {campo("Link do programa digital (opcional)", "programaDigital", false, "https://...")}
          </div>
        </>
      )}

      <button className="btn-comentar" onClick={enviar} disabled={enviando} style={{ marginTop: "16px", opacity: enviando ? 0.6 : 1, cursor: enviando ? "wait" : "pointer" }}>
        {enviando ? "Enviando..." : "Enviar sugestão"}
      </button>
    </main>
  )
}

export default Sugestao
