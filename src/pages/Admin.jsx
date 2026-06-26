import { useEffect, useState } from "react"
import { collection, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { ADMINS } from "../admins"

// Essenciais: gravam nos campos planos do Firestore (busca/Home/Pessoa dependem deles)
const ESSENCIAIS = ["Direção", "Direção Musical", "Versionista", "Texto Original", "Música Original", "Produtora"]
const ESSENCIAL_CAMPO = {
  "Direção": "direcao",
  "Direção Musical": "direcaoMusical",
  "Versionista": "versionista",
  "Texto Original": "textoOriginal",
  "Música Original": "musicaOriginal",
  "Produtora": "producao",
}
// Complementares: gravam dentro do array equipeCriativa
const COMPLEMENTARES = [
  "Direção Residente", "Assistência de Direção", "Direção de Movimento", "Coordenação Artística",
  "Supervisão Musical", "Assistência de Direção Musical", "Regência", "Preparação Vocal", "Arranjos/Orquestração",
  "Coreografia", "Assistência de Coreografia",
  "Cenografia", "Figurino", "Design de Luz", "Design de Som", "Visagismo", "Perucaria",
  "Direção de Produção", "Produção Geral", "Produção Executiva", "Produtor Associado",
]

function equipeInicial() {
  return [
    ...ESSENCIAIS.map(funcao => ({ funcao, nomesTexto: "", essencial: true })),
    ...COMPLEMENTARES.map(funcao => ({ funcao, nomesTexto: "", essencial: false })),
  ]
}

// Preenche equipeInicial() com dados vindos de um documento (sugestão ou musical)
function equipeDeDocumento(doc) {
  const base = equipeInicial()
  // Preenche essenciais dos campos planos
  if (doc.direcao) base.find(r => r.funcao === "Direção").nomesTexto = doc.direcao
  if (doc.direcaoMusical) base.find(r => r.funcao === "Direção Musical").nomesTexto = doc.direcaoMusical
  if (doc.versionista) base.find(r => r.funcao === "Versionista").nomesTexto = doc.versionista
  if (doc.textoOriginal) base.find(r => r.funcao === "Texto Original").nomesTexto = doc.textoOriginal
  if (doc.musicaOriginal) base.find(r => r.funcao === "Música Original").nomesTexto = doc.musicaOriginal
  if (doc.producao) base.find(r => r.funcao === "Produtora").nomesTexto = doc.producao
  // Preenche complementares do equipeCriativa
  if (Array.isArray(doc.equipeCriativa)) {
    doc.equipeCriativa.forEach(item => {
      const row = base.find(r => !r.essencial && !r.livre && r.funcao === item.funcao)
      if (row) {
        row.nomesTexto = Array.isArray(item.nomes) ? item.nomes.join(", ") : (item.nomes || "")
      } else if (item.funcao) {
        // cargo livre não listado nos COMPLEMENTARES
        base.push({ funcao: item.funcao, nomesTexto: Array.isArray(item.nomes) ? item.nomes.join(", ") : (item.nomes || ""), livre: true, cargoTexto: item.funcao })
      }
    })
  }
  return base
}

function musicosDeDocumento(doc) {
  if (!Array.isArray(doc.musicos)) return []
  return doc.musicos.map(m => ({
    local: m.local || "",
    nomesTexto: Array.isArray(m.nomes) ? m.nomes.join(", ") : (m.nomes || "")
  }))
}

function teatrosDeDocumento(doc) {
  if (!Array.isArray(doc.teatros)) return []
  return doc.teatros.map(t => ({
    ano: t.ano || "",
    teatrosTexto: Array.isArray(t.teatros) ? t.teatros.join(", ") : (t.teatros || "")
  }))
}

function montarEquipeDeStrings(direcao, direcaoMusical) {
  const equipe = []
  const d = (direcao || "").split(",").map(n => n.trim()).filter(Boolean)
  const dm = (direcaoMusical || "").split(",").map(n => n.trim()).filter(Boolean)
  if (d.length > 0) equipe.push({ funcao: "Direção", nomes: d })
  if (dm.length > 0) equipe.push({ funcao: "Direção Musical", nomes: dm })
  return equipe
}

function montarItemIndice(id, m) {
  return {
    id,
    titulo: m.titulo || "",
    capa: m.capa || "",
    ano: m.ano || "",
    direcao: m.direcao || "",
    direcaoMusical: m.direcaoMusical || "",
    producao: m.producao || "",
    elenco: m.elenco || "",
    elencoAdicional: m.elencoAdicional || "",
    versionista: m.versionista || "",
    textoOriginal: m.textoOriginal || "",
    musicaOriginal: m.musicaOriginal || "",
    equipeCriativa: Array.isArray(m.equipeCriativa) ? m.equipeCriativa : [],
    musicos: Array.isArray(m.musicos) ? m.musicos : [],
    teatro: m.teatro || "",
    teatros: Array.isArray(m.teatros) ? m.teatros : [],
    totalVotos: Number(m.totalVotos) || 0,
    somaEstrelas: Number(m.somaEstrelas) || 0,
    popularidade: Number(m.popularidade) || 0,
    totalLikes: Number(m.totalLikes) || 0,
    destaque: m.destaque === true,
    dataCriacao: m.dataCriacao?.seconds
      ? { seconds: m.dataCriacao.seconds }
      : (m.dataCriacao instanceof Date ? { seconds: Math.floor(m.dataCriacao.getTime() / 1000) } : null)
  }
}

async function gerarIndiceHome() {
  const snap = await getDocs(collection(db, "musicais"))
  const itens = snap.docs.map(d => montarItemIndice(d.id, d.data()))
  await setDoc(doc(db, "indices", "home"), {
    itens,
    total: itens.length,
    atualizadoEm: new Date()
  })
  return itens.length
}

function Admin() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(null)
  const [sugestoes, setSugestoes] = useState([])
  const [relatos, setRelatos] = useState([])
  const [musicais, setMusicais] = useState([])
  const [mensagens, setMensagens] = useState([])
  const [aba, setAba] = useState("sugestoes")
  const [carregando, setCarregando] = useState(true)
  const [carregadas, setCarregadas] = useState(new Set())
  const [capas, setCapas] = useState({})
  const [editandoSugestao, setEditandoSugestao] = useState(null)
  const [formSugestao, setFormSugestao] = useState({})
  const [equipeEdicao, setEquipeEdicao] = useState(equipeInicial())
  const [musicosEdicao, setMusicosEdicao] = useState([])
  const [teatrosEdicao, setTeatrosEdicao] = useState([])
  const [indiceStatus, setIndiceStatus] = useState("")

  // Aba "Adicionar musical"
  const [formNovo, setFormNovo] = useState({})
  const [capaNovo, setCapaNovo] = useState("")
  const [teatrosNovo, setTeatrosNovo] = useState([])
  const [equipeNovo, setEquipeNovo] = useState(equipeInicial())
  const [musicosNovo, setMusicosNovo] = useState([])

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  async function carregarAba(qual) {
    if (qual === "adicionar" || carregadas.has(qual)) return
    setCarregando(true)
    try {
      if (qual === "sugestoes") {
        const q = query(collection(db, "sugestoes"), where("status", "==", "pendente"), orderBy("data", "desc"))
        const snap = await getDocs(q)
        setSugestoes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } else if (qual === "relatos") {
        const snap = await getDocs(query(collection(db, "relatorios"), orderBy("data", "desc")))
        setRelatos(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.tipo !== "denuncia_comentario"))
      } else if (qual === "musicais") {
        const snap = await getDocs(query(collection(db, "musicais"), orderBy("dataCriacao", "desc")))
        setMusicais(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } else if (qual === "mensagens") {
        const snap = await getDocs(query(collection(db, "mensagens"), orderBy("data", "desc")))
        setMensagens(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      }
      setCarregadas(prev => new Set(prev).add(qual))
    } catch (e) {
      console.error("Erro ao carregar aba:", qual, e)
    }
    setCarregando(false)
  }

  function trocarAba(qual) {
    setAba(qual)
    carregarAba(qual)
  }

  useEffect(() => {
    if (usuario && ADMINS.includes(usuario.uid)) {
      carregarAba(aba)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  async function atualizarIndiceManual() {
    setIndiceStatus("Gerando índice...")
    try {
      const qtd = await gerarIndiceHome()
      setIndiceStatus(`Índice atualizado ✓ (${qtd} musicais)`)
    } catch (e) {
      setIndiceStatus("Erro ao gerar índice. Tente novamente.")
    }
    setTimeout(() => setIndiceStatus(""), 4000)
  }

  // ── Helpers compartilhados para o editor de equipe ──────────────────────────

  function adicionarCargoLivreEm(equipe, setEquipe) {
    setEquipe([...equipe, { funcao: "", nomesTexto: "", livre: true, cargoTexto: "" }])
  }

  function mudarNomesEm(equipe, setEquipe, index, texto) {
    const novo = [...equipe]
    novo[index] = { ...novo[index], nomesTexto: texto }
    setEquipe(novo)
  }

  function mudarCargoLivreEm(equipe, setEquipe, index, texto) {
    const novo = [...equipe]
    novo[index] = { ...novo[index], cargoTexto: texto }
    setEquipe(novo)
  }

  function removerLinhaEquipeEm(equipe, setEquipe, index) {
    setEquipe(equipe.filter((_, i) => i !== index))
  }

  // ── Helpers originais que delegam para o estado de "Adicionar" ───────────────

  function adicionarCargoLivre() { adicionarCargoLivreEm(equipeNovo, setEquipeNovo) }
  function mudarNomes(index, texto) { mudarNomesEm(equipeNovo, setEquipeNovo, index, texto) }
  function mudarCargoLivre(index, texto) { mudarCargoLivreEm(equipeNovo, setEquipeNovo, index, texto) }
  function removerLinhaEquipe(index) { removerLinhaEquipeEm(equipeNovo, setEquipeNovo, index) }

  function moverTeatroNovo(index, direcao) {
    const destino = index + direcao
    if (destino < 0 || destino >= teatrosNovo.length) return
    const novo = [...teatrosNovo]
    ;[novo[index], novo[destino]] = [novo[destino], novo[index]]
    setTeatrosNovo(novo)
  }

  function moverTeatroEdicao(index, direcao) {
    const destino = index + direcao
    if (destino < 0 || destino >= teatrosEdicao.length) return
    const novo = [...teatrosEdicao]
    ;[novo[index], novo[destino]] = [novo[destino], novo[index]]
    setTeatrosEdicao(novo)
  }

  // ── Monta o payload final a partir dos estados do editor ────────────────────

  function montarPayload(form, equipe, musicos, teatros, capa) {
    const teatrosLimpos = teatros
      .map(item => ({
        ano: item.ano.trim(),
        teatros: item.teatrosTexto.split(",").map(t => t.trim()).filter(Boolean)
      }))
      .filter(item => item.ano && item.teatros.length > 0)

    const planos = {}
    ESSENCIAIS.forEach(funcao => {
      const row = equipe.find(r => r.essencial && r.funcao === funcao)
      const nomes = row ? row.nomesTexto.split(",").map(n => n.trim()).filter(Boolean) : []
      planos[ESSENCIAL_CAMPO[funcao]] = nomes.join(", ")
    })

    const equipeCriativa = equipe
      .filter(r => !r.essencial)
      .map(r => ({
        funcao: r.livre ? (r.cargoTexto || "").trim() : r.funcao,
        nomes: r.nomesTexto.split(",").map(n => n.trim()).filter(Boolean)
      }))
      .filter(e => e.funcao && e.nomes.length > 0)

    const musicosLimpos = musicos
      .map(item => ({ local: item.local.trim(), nomes: item.nomesTexto.split(",").map(n => n.trim()).filter(Boolean) }))
      .filter(item => item.local && item.nomes.length > 0)

    return {
      titulo: form.titulo || "",
      tituloOriginal: form.tituloOriginal || "",
      sinopse: form.sinopse || "",
      direcao: planos.direcao,
      direcaoMusical: planos.direcaoMusical,
      versionista: planos.versionista,
      textoOriginal: planos.textoOriginal,
      musicaOriginal: planos.musicaOriginal,
      producao: planos.producao,
      equipeCriativa,
      elenco: form.elenco || "",
      elencoAdicional: form.elencoAdicional || "",
      ano: form.ano || "",
      teatro: teatrosLimpos[0]?.teatros[0] || "",
      teatros: teatrosLimpos,
      musicos: musicosLimpos,
      capa: capa || "",
    }
  }

  async function publicarNovo() {
    if (!formNovo.titulo || !formNovo.titulo.trim()) {
      alert("O título é obrigatório.")
      return
    }
    const slug = (formNovo.titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
    ) || "musical-" + Date.now()

    const existe = await getDoc(doc(db, "musicais", slug))
    if (existe.exists()) {
      if (!window.confirm(`Já existe um musical com esse título ("${formNovo.titulo}"). Publicar vai SOBRESCREVER o existente e zerar as avaliações. Continuar?`)) return
    }

    const payload = montarPayload(formNovo, equipeNovo, musicosNovo, teatrosNovo, capaNovo)

    await setDoc(doc(db, "musicais", slug), {
      ...payload,
      teatrosAdicionais: [],
      totalVotos: 0,
      somaEstrelas: 0,
      dataCriacao: new Date()
    })

    setMusicais(prev => [{ id: slug, titulo: formNovo.titulo, direcao: payload.direcao, ano: formNovo.ano, capa: capaNovo }, ...prev])
    setFormNovo({})
    setCapaNovo("")
    setTeatrosNovo([])
    setEquipeNovo(equipeInicial())
    setMusicosNovo([])
    try { await gerarIndiceHome() } catch (e) { /* não bloqueia a publicação */ }
    alert("Musical publicado!")
    setAba("musicais")
    carregarAba("musicais")
  }

  function abrirEdicaoSugestao(s) {
    setFormSugestao({
      titulo: s.titulo || "",
      tituloOriginal: s.tituloOriginal || "",
      sinopse: s.sinopse || "",
      elenco: s.elenco || "",
      elencoAdicional: s.elencoAdicional || "",
      ano: s.ano || "",
    })
    setEquipeEdicao(equipeDeDocumento(s))
    setMusicosEdicao(musicosDeDocumento(s))
    setTeatrosEdicao(teatrosDeDocumento(s))
    setCapas(prev => ({ ...prev, [s.id]: s.capa || prev[s.id] || "" }))
    setEditandoSugestao(s.id)
  }

  async function salvarEdicaoSugestao(sugestaoId) {
    const payload = montarPayload(formSugestao, equipeEdicao, musicosEdicao, teatrosEdicao, capas[sugestaoId] || "")
    await updateDoc(doc(db, "sugestoes", sugestaoId), payload)
    setSugestoes(prev => prev.map(s => s.id === sugestaoId ? { ...s, ...payload } : s))
    setEditandoSugestao(null)
    setFormSugestao({})
    setEquipeEdicao(equipeInicial())
    setMusicosEdicao([])
    setTeatrosEdicao([])
  }

  async function aprovar(sugestao) {
    const slug = (sugestao.titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "")
    ) || "musical-" + Date.now()

    // Monta equipeCriativa a partir dos campos já salvos na sugestão
    const equipeCriativaFinal = Array.isArray(sugestao.equipeCriativa) && sugestao.equipeCriativa.length > 0
      ? sugestao.equipeCriativa
      : montarEquipeDeStrings(sugestao.direcao, sugestao.direcaoMusical)

    await setDoc(doc(db, "musicais", slug), {
      titulo: sugestao.titulo || "",
      tituloOriginal: sugestao.tituloOriginal || "",
      sinopse: sugestao.sinopse || "",
      direcao: sugestao.direcao || "",
      direcaoMusical: sugestao.direcaoMusical || "",
      equipeCriativa: equipeCriativaFinal,
      producao: sugestao.producao || "",
      elenco: sugestao.elenco || "",
      elencoAdicional: sugestao.elencoAdicional || "",
      versionista: sugestao.versionista || "",
      textoOriginal: sugestao.textoOriginal || "",
      musicaOriginal: sugestao.musicaOriginal || "",
      ano: sugestao.ano || "",
      teatro: sugestao.teatro || (Array.isArray(sugestao.teatros) && sugestao.teatros[0]?.teatros?.[0]) || "",
      teatros: Array.isArray(sugestao.teatros) ? sugestao.teatros : [],
      musicos: Array.isArray(sugestao.musicos) ? sugestao.musicos : [],
      capa: capas[sugestao.id] || sugestao.capa || "",
      totalVotos: 0,
      somaEstrelas: 0,
      dataCriacao: new Date()
    })
    await updateDoc(doc(db, "sugestoes", sugestao.id), { status: "aprovado" })
    setSugestoes(prev => prev.filter(s => s.id !== sugestao.id))
    setCapas(prev => { const next = { ...prev }; delete next[sugestao.id]; return next })
    try { await gerarIndiceHome() } catch (e) { /* não bloqueia a aprovação */ }
  }

  async function rejeitar(sugestaoId) {
    await updateDoc(doc(db, "sugestoes", sugestaoId), { status: "rejeitado" })
    setSugestoes(prev => prev.filter(s => s.id !== sugestaoId))
  }

  async function resolverRelato(relatoId) {
    await deleteDoc(doc(db, "relatorios", relatoId))
    setRelatos(prev => prev.filter(r => r.id !== relatoId))
  }

  async function deletarMusical(musicalId, titulo) {
    if (!window.confirm(`Tem certeza que quer deletar "${titulo}"? Esta ação não pode ser desfeita.`)) return
    await deleteDoc(doc(db, "musicais", musicalId))
    setMusicais(prev => prev.filter(m => m.id !== musicalId))
    try { await gerarIndiceHome() } catch (e) { /* não bloqueia a deleção */ }
  }

  async function marcarMensagemLida(mensagemId) {
    await updateDoc(doc(db, "mensagens", mensagemId), { lida: true })
    setMensagens(prev => prev.map(m => m.id === mensagemId ? { ...m, lida: true } : m))
  }

  async function deletarMensagem(mensagemId) {
    if (!window.confirm("Deletar esta mensagem?")) return
    await deleteDoc(doc(db, "mensagens", mensagemId))
    setMensagens(prev => prev.filter(m => m.id !== mensagemId))
  }

  // ── Renderizadores de campos ─────────────────────────────────────────────────

  const campoSugestao = (label, chave, multiline = false) => (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
        {label}
      </label>
      {multiline ? (
        <textarea value={formSugestao[chave] || ""} onChange={e => setFormSugestao(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", height: "80px", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", resize: "vertical" }} />
      ) : (
        <input type="text" value={formSugestao[chave] || ""} onChange={e => setFormSugestao(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
      )}
    </div>
  )

  const campoNovo = (label, chave, multiline = false) => (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
        {label}
      </label>
      {multiline ? (
        <textarea value={formNovo[chave] || ""} onChange={e => setFormNovo(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", height: "100px", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", resize: "vertical" }} />
      ) : (
        <input type="text" value={formNovo[chave] || ""} onChange={e => setFormNovo(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
      )}
    </div>
  )

  const inputEquipeStyle = { flex: 1, padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }
  const cargoLivreStyle = { width: "150px", padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", flexShrink: 0 }

  // Editor de equipe genérico — recebe os estados como parâmetro
  function renderEditorEquipe(equipe, setEquipe) {
    return (
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
          Equipe
        </label>
        {equipe.map((item, i) => {
          const mostrarDivisor = i === ESSENCIAIS.length
          if (item.livre) {
            return (
              <div key={i}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                  <input type="text" placeholder="Cargo" value={item.cargoTexto || ""} onChange={e => mudarCargoLivreEm(equipe, setEquipe, i, e.target.value)} style={cargoLivreStyle} />
                  <input type="text" placeholder="Nomes (separados por vírgula)" value={item.nomesTexto} onChange={e => mudarNomesEm(equipe, setEquipe, i, e.target.value)} style={inputEquipeStyle} />
                  <button onClick={() => removerLinhaEquipeEm(equipe, setEquipe, i)} style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "16px", padding: "10px 4px" }} title="Remover">✕</button>
                </div>
              </div>
            )
          }
          return (
            <div key={i}>
              {mostrarDivisor && <div style={{ borderTop: "1px solid #eee", margin: "14px 0 12px" }} />}
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                <span style={{ width: "150px", fontSize: "14px", fontWeight: item.essencial ? "600" : "400", color: item.essencial ? "#1a1a1a" : "#444", flexShrink: 0 }}>{item.funcao}</span>
                <input type="text" placeholder="Nomes (separados por vírgula)" value={item.nomesTexto} onChange={e => mudarNomesEm(equipe, setEquipe, i, e.target.value)} style={inputEquipeStyle} />
              </div>
            </div>
          )
        })}
        <button onClick={() => adicionarCargoLivreEm(equipe, setEquipe)} style={{ background: "none", border: "1px dashed #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer", marginTop: "4px" }}>
          + Adicionar cargo
        </button>
      </div>
    )
  }

  // Editor de músicos genérico
  function renderEditorMusicos(musicos, setMusicos) {
    return (
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
          Músicos (por local)
        </label>
        {musicos.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
            <input type="text" placeholder="Local (ex: São Paulo)" value={item.local}
              onChange={e => { const novo = [...musicos]; novo[i] = { ...novo[i], local: e.target.value }; setMusicos(novo) }}
              style={{ width: "160px", padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", flexShrink: 0 }} />
            <input type="text" placeholder="Nomes (separados por vírgula)" value={item.nomesTexto}
              onChange={e => { const novo = [...musicos]; novo[i] = { ...novo[i], nomesTexto: e.target.value }; setMusicos(novo) }}
              style={{ flex: 1, padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
            <button onClick={() => setMusicos(musicos.filter((_, idx) => idx !== i))}
              style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "16px", padding: "10px 4px" }} title="Remover">✕</button>
          </div>
        ))}
        <button onClick={() => setMusicos([...musicos, { local: "", nomesTexto: "" }])}
          style={{ background: "none", border: "1px dashed #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}>
          + Adicionar local
        </button>
      </div>
    )
  }

  // Editor de teatros genérico
  function renderEditorTeatros(teatros, setTeatros, moverTeatro) {
    return (
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
          Teatros (o primeiro da lista é considerado a estreia)
        </label>
        {teatros.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <button onClick={() => moverTeatro(i, -1)} disabled={i === 0}
                style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: "4px", padding: "2px 6px", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#ddd" : "#888", fontSize: "12px" }} title="Mover para cima">▲</button>
              <button onClick={() => moverTeatro(i, 1)} disabled={i === teatros.length - 1}
                style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: "4px", padding: "2px 6px", cursor: i === teatros.length - 1 ? "default" : "pointer", color: i === teatros.length - 1 ? "#ddd" : "#888", fontSize: "12px" }} title="Mover para baixo">▼</button>
            </div>
            <input type="text" placeholder="Ano" value={item.ano}
              onChange={e => { const novo = [...teatros]; novo[i] = { ...novo[i], ano: e.target.value }; setTeatros(novo) }}
              style={{ width: "90px", padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
            <input type="text" placeholder="Teatros (separados por vírgula)" value={item.teatrosTexto}
              onChange={e => { const novo = [...teatros]; novo[i] = { ...novo[i], teatrosTexto: e.target.value }; setTeatros(novo) }}
              style={{ flex: 1, padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
            <button onClick={() => setTeatros(teatros.filter((_, idx) => idx !== i))}
              style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "16px", padding: "10px 4px" }} title="Remover">✕</button>
          </div>
        ))}
        <button onClick={() => setTeatros([...teatros, { ano: "", teatrosTexto: "" }])}
          style={{ background: "none", border: "1px dashed #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}>
          + Adicionar teatro
        </button>
      </div>
    )
  }

  const editorEquipe = renderEditorEquipe(equipeNovo, setEquipeNovo)
  const editorMusicos = renderEditorMusicos(musicosNovo, setMusicosNovo)

  const naoLidas = mensagens.filter(m => !m.lida).length

  if (!usuario) return <main><p>Carregando...</p></main>
  if (!ADMINS.includes(usuario.uid)) return <main><p>Acesso negado.</p></main>

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">Painel de administração</p>
      <h1 className="page-title">Admin</h1>

      <div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" }}>
        <button onClick={() => trocarAba("sugestoes")} className={aba === "sugestoes" ? "btn-comentar" : "btn-sair"}>
          Sugestões pendentes {carregadas.has("sugestoes") && sugestoes.length > 0 && `(${sugestoes.length})`}
        </button>
        <button onClick={() => trocarAba("adicionar")} className={aba === "adicionar" ? "btn-comentar" : "btn-sair"}>
          ➕ Adicionar musical
        </button>
        <button onClick={() => trocarAba("relatos")} className={aba === "relatos" ? "btn-comentar" : "btn-sair"}>
          Relatos de erro {carregadas.has("relatos") && relatos.length > 0 && `(${relatos.length})`}
        </button>
        <button onClick={() => trocarAba("musicais")} className={aba === "musicais" ? "btn-comentar" : "btn-sair"}>
          Musicais publicados {carregadas.has("musicais") && `(${musicais.length})`}
        </button>
        <button onClick={() => trocarAba("mensagens")} className={aba === "mensagens" ? "btn-comentar" : "btn-sair"}>
          Mensagens {carregadas.has("mensagens") && naoLidas > 0 && `(${naoLidas} nova${naoLidas > 1 ? "s" : ""})`}
        </button>
      </div>

      {carregando ? (
        <p style={{ color: "#888" }}>Carregando...</p>
      ) : aba === "sugestoes" ? (
        sugestoes.length === 0 ? (
          <p style={{ color: "#888" }}>Nenhuma sugestão pendente.</p>
        ) : (
          sugestoes.map(s => (
            <div key={s.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              {editandoSugestao === s.id ? (
                <>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", marginBottom: "16px" }}>Editando sugestão</h2>
                  {campoSugestao("Título", "titulo")}
                  {campoSugestao("Título original", "tituloOriginal")}
                  {campoSugestao("Sinopse", "sinopse", true)}
                  {renderEditorEquipe(equipeEdicao, setEquipeEdicao)}
                  {campoSugestao("Elenco de estreia", "elenco", true)}
                  {campoSugestao("Elenco adicional", "elencoAdicional", true)}
                  {renderEditorMusicos(musicosEdicao, setMusicosEdicao)}
                  {campoSugestao("Ano", "ano")}
                  {renderEditorTeatros(teatrosEdicao, setTeatrosEdicao, moverTeatroEdicao)}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                      URL da capa (opcional)
                    </label>
                    <input type="text" placeholder="https://..." value={capas[s.id] || ""}
                      onChange={e => setCapas(prev => ({ ...prev, [s.id]: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", marginBottom: "8px" }} />
                    {capas[s.id] && (
                      <img src={capas[s.id]} alt="Preview" style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e8e4" }} />
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                    <button className="btn-comentar" onClick={() => salvarEdicaoSugestao(s.id)}>Salvar edição</button>
                    <button className="btn-sair" onClick={() => { setEditandoSugestao(null); setFormSugestao({}); setEquipeEdicao(equipeInicial()); setMusicosEdicao([]); setTeatrosEdicao([]) }}>Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "12px" }}>{s.titulo}</h2>
                  {s.tituloOriginal && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Título original:</strong> {s.tituloOriginal}</p>}
                  {s.sinopse && <p style={{ fontSize: "14px", color: "#444", marginBottom: "8px" }}><strong>Sinopse:</strong> {s.sinopse}</p>}
                  {s.direcao && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Direção:</strong> {s.direcao}</p>}
                  {s.direcaoMusical && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Direção musical:</strong> {s.direcaoMusical}</p>}
                  {s.producao && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Produtora:</strong> {s.producao}</p>}
                  {s.elenco && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Elenco:</strong> {s.elenco}</p>}
                  {s.elencoAdicional && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Elenco adicional:</strong> {s.elencoAdicional}</p>}
                  {s.versionista && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Versionista:</strong> {s.versionista}</p>}
                  {s.textoOriginal && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Texto original:</strong> {s.textoOriginal}</p>}
                  {s.musicaOriginal && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Música original:</strong> {s.musicaOriginal}</p>}
                  {s.ano && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Ano:</strong> {s.ano}</p>}
                  {s.teatro && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Teatro:</strong> {s.teatro}</p>}
                  {Array.isArray(s.equipeCriativa) && s.equipeCriativa.length > 0 && (
                    <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}>
                      <strong>Equipe criativa:</strong> {s.equipeCriativa.map(e => `${e.funcao}: ${Array.isArray(e.nomes) ? e.nomes.join(", ") : e.nomes}`).join(" · ")}
                    </p>
                  )}
                  {Array.isArray(s.musicos) && s.musicos.length > 0 && (
                    <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}>
                      <strong>Músicos:</strong> {s.musicos.map(m => `${m.local}: ${Array.isArray(m.nomes) ? m.nomes.join(", ") : m.nomes}`).join(" · ")}
                    </p>
                  )}
                  <p style={{ fontSize: "13px", color: "#888", marginTop: "12px", marginBottom: "16px" }}>Sugerido por: {s.nome}</p>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                      URL da capa (opcional)
                    </label>
                    <input type="text" placeholder="https://..." value={capas[s.id] || ""}
                      onChange={e => setCapas(prev => ({ ...prev, [s.id]: e.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none", marginBottom: "8px" }} />
                    {capas[s.id] && (
                      <img src={capas[s.id]} alt="Preview" style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e8e4" }} />
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button className="btn-comentar" onClick={() => aprovar(s)}>Aprovar e publicar</button>
                    <button onClick={() => abrirEdicaoSugestao(s)}
                      style={{ background: "transparent", color: "#888", border: "1px solid #ccc", borderRadius: "6px", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>
                      ✏️ Editar
                    </button>
                    <button className="btn-sair" onClick={() => rejeitar(s.id)}>Rejeitar</button>
                  </div>
                </>
              )}
            </div>
          ))
        )
      ) : aba === "adicionar" ? (
        <div style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "8px" }}>Adicionar musical</h2>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px", lineHeight: "1.5" }}>
            Preencha os campos abaixo e clique em <strong>Publicar musical</strong> para adicionar direto na database, sem passar pelo formulário de sugestão.
          </p>

          {campoNovo("Título", "titulo")}
          {campoNovo("Título original", "tituloOriginal")}
          {campoNovo("Sinopse", "sinopse", true)}
          {editorEquipe}
          {campoNovo("Elenco de estreia", "elenco", true)}
          {campoNovo("Elenco adicional", "elencoAdicional", true)}
          {editorMusicos}
          {campoNovo("Ano", "ano")}
          {renderEditorTeatros(teatrosNovo, setTeatrosNovo, moverTeatroNovo)}

          <div style={{ marginTop: "8px", marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
              URL da capa (opcional)
            </label>
            <input type="text" placeholder="https://..." value={capaNovo} onChange={e => setCapaNovo(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", marginBottom: "8px" }} />
            {capaNovo && (
              <img src={capaNovo} alt="Preview" style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e8e4" }} />
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button className="btn-comentar" onClick={publicarNovo}>Publicar musical</button>
            <button className="btn-sair" onClick={() => { setFormNovo({}); setCapaNovo(""); setTeatrosNovo([]); setEquipeNovo(equipeInicial()); setMusicosNovo([]) }}>Limpar</button>
          </div>
        </div>
      ) : aba === "relatos" ? (
        relatos.length === 0 ? (
          <p style={{ color: "#888" }}>Nenhum relato de erro.</p>
        ) : (
          relatos.map(r => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px", background: "#fffbe6", color: "#888", borderRadius: "4px", padding: "2px 8px" }}>
                  Relato de erro
                </span>
                <p style={{ fontSize: "13px", fontWeight: "500", color: "#F5C518" }}>{r.musicalTitulo}</p>
              </div>
              <p style={{ fontSize: "15px", color: "#333", marginBottom: "12px", lineHeight: "1.6" }}>{r.texto}</p>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>Reportado por: {r.nome}</p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button className="btn-comentar" onClick={() => navigate(`/musical/${r.musicalId}`)}>Ver musical</button>
                <button className="btn-sair" onClick={() => resolverRelato(r.id)}>Marcar como resolvido</button>
              </div>
            </div>
          ))
        )
      ) : aba === "mensagens" ? (
        mensagens.length === 0 ? (
          <p style={{ color: "#888" }}>Nenhuma mensagem ainda.</p>
        ) : (
          mensagens.map(m => (
            <div key={m.id} style={{ background: m.lida ? "#fff" : "#fffbe6", border: m.lida ? "1px solid #e8e8e4" : "1px solid #F5C518", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                {!m.lida && (
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", background: "#F5C518", color: "#1a1a1a", borderRadius: "4px", padding: "2px 8px" }}>Nova</span>
                )}
                <p style={{ fontSize: "15px", fontWeight: "700", margin: 0 }}>{m.nome}</p>
                {m.email && (
                  <a href={`mailto:${m.email}`} style={{ fontSize: "13px", color: "#888", textDecoration: "none" }}>{m.email}</a>
                )}
                <p style={{ fontSize: "12px", color: "#bbb", margin: 0, marginLeft: "auto" }}>
                  {m.data?.toDate ? m.data.toDate().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </p>
              </div>
              <p style={{ fontSize: "15px", color: "#333", lineHeight: "1.6", marginBottom: "16px", whiteSpace: "pre-wrap" }}>{m.mensagem}</p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {!m.lida && (
                  <button className="btn-comentar" onClick={() => marcarMensagemLida(m.id)}>✓ Marcar como lida</button>
                )}
                {m.email && (
                  <a href={`mailto:${m.email}`} style={{ display: "inline-block", padding: "10px 20px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#1a1a1a", textDecoration: "none", background: "#fff" }}>
                    Responder por e-mail
                  </a>
                )}
                <button onClick={() => deletarMensagem(m.id)}
                  style={{ background: "transparent", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "6px", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>
                  Deletar
                </button>
              </div>
            </div>
          ))
        )
      ) : (
        <>
          <div style={{ background: "#fffbe6", border: "1px solid #F5C518", borderRadius: "12px", padding: "16px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "220px" }}>
              <p style={{ fontSize: "14px", fontWeight: "700", margin: "0 0 2px" }}>Índice da Home</p>
              <p style={{ fontSize: "13px", color: "#666", margin: 0, lineHeight: "1.4" }}>
                A Home lê este índice em vez de carregar todos os musicais. Ele se atualiza sozinho ao publicar, aprovar ou deletar. Use o botão se precisar forçar a atualização.
              </p>
              {indiceStatus && (
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", margin: "8px 0 0" }}>{indiceStatus}</p>
              )}
            </div>
            <button className="btn-comentar" onClick={atualizarIndiceManual}>🔄 Atualizar índice da Home</button>
          </div>

          {musicais.length === 0 ? (
            <p style={{ color: "#888" }}>Nenhum musical publicado.</p>
          ) : (
            musicais.map(m => (
              <div key={m.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "16px" }}>
                {m.capa ? (
                  <img src={m.capa} alt={m.titulo} style={{ width: "48px", height: "64px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: "48px", height: "64px", background: "#1a1a1a", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#F5C518", fontSize: "8px", textAlign: "center", padding: "4px" }}>{m.titulo}</span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>{m.titulo}</p>
                  <p style={{ fontSize: "13px", color: "#888" }}>{m.direcao || "—"} · {m.ano || "—"}</p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <button className="btn-comentar" onClick={() => navigate(`/musical/${m.id}`)}>Ver</button>
                  <button onClick={() => deletarMusical(m.id, m.titulo)}
                    style={{ background: "transparent", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "6px", padding: "7px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer" }}>
                    Deletar
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </main>
  )
}

export default Admin
