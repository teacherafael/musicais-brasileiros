import { useEffect, useState } from "react"
import { collection, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { ADMINS } from "../admins"

// Campos que a Home usa (busca, filtros, ordenações, carrosséis). A sinopse NÃO entra
// de propósito: é o campo mais pesado e a Home não usa. Isso mantém o índice pequeno.
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
    totalVotos: Number(m.totalVotos) || 0,
    somaEstrelas: Number(m.somaEstrelas) || 0,
    destaque: m.destaque === true,
    dataCriacao: m.dataCriacao?.seconds
      ? { seconds: m.dataCriacao.seconds }
      : (m.dataCriacao instanceof Date ? { seconds: Math.floor(m.dataCriacao.getTime() / 1000) } : null)
  }
}

// Lê todos os musicais uma vez e grava a lista enxuta em indices/home.
// Retorna a quantidade indexada (pra exibir no status).
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
  const [comentariosPendentes, setComentariosPendentes] = useState([])
  const [aba, setAba] = useState("sugestoes")
  const [carregando, setCarregando] = useState(true)
  const [capas, setCapas] = useState({})
  const [editandoSugestao, setEditandoSugestao] = useState(null)
  const [formSugestao, setFormSugestao] = useState({})

  // Status do índice da Home
  const [indiceStatus, setIndiceStatus] = useState("")

  // --- Aba "Adicionar musical" (cadastro direto pelo painel) ---
  const [formNovo, setFormNovo] = useState({})
  const [capaNovo, setCapaNovo] = useState("")
  const [teatrosNovo, setTeatrosNovo] = useState([])

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  useEffect(() => {
    async function buscarDados() {
      const q = query(collection(db, "sugestoes"), where("status", "==", "pendente"), orderBy("data", "desc"))
      const snap = await getDocs(q)
      setSugestoes(snap.docs.map(d => ({ id: d.id, ...d.data() })))

      const relatosSnap = await getDocs(query(collection(db, "relatorios"), orderBy("data", "desc")))
      setRelatos(relatosSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      const musicaisSnap = await getDocs(query(collection(db, "musicais"), orderBy("dataCriacao", "desc")))
      setMusicais(musicaisSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      const mensagensSnap = await getDocs(query(collection(db, "mensagens"), orderBy("data", "desc")))
      setMensagens(mensagensSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      // Comentários de usuários NÃO verificados aguardando aprovação.
      // Lê da coleção raiz "comentarios" (cada doc já tem musicalId e musicalTitulo).
      const comentariosSnap = await getDocs(query(collection(db, "comentarios"), where("status", "==", "pendente"), orderBy("data", "desc")))
      setComentariosPendentes(comentariosSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      setCarregando(false)
    }
    buscarDados()
  }, [])

  // Botão manual: regenera o índice da Home com o que está hoje na coleção musicais.
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

  // Move um bloco de teatro pra cima/baixo no formulário de adicionar
  function moverTeatroNovo(index, direcao) {
    const destino = index + direcao
    if (destino < 0 || destino >= teatrosNovo.length) return
    const novo = [...teatrosNovo]
    ;[novo[index], novo[destino]] = [novo[destino], novo[index]]
    setTeatrosNovo(novo)
  }

  // Aprova um comentário pendente: marca como "aprovado" na coleção raiz e na
  // subcoleção do musical (que é a lida pela página). Depois registra na Atividade recente.
  async function aprovarComentario(c) {
    await updateDoc(doc(db, "comentarios", c.id), { status: "aprovado" })
    try {
      await updateDoc(doc(db, "musicais", c.musicalId, "comentarios", c.id), { status: "aprovado" })
    } catch (e) {
      // Se o autor já tiver apagado a cópia da subcoleção, não trava a aprovação
    }
    try {
      await addDoc(collection(db, "atividades"), {
        tipo: "comentario",
        userId: c.userId || null,
        nome: c.nome || "Anônimo",
        foto: c.foto || "",
        musicalId: c.musicalId,
        musicalTitulo: c.musicalTitulo || "",
        data: serverTimestamp()
      })
    } catch (e) {
      // Feed é secundário — falha aqui não bloqueia a aprovação
    }
    setComentariosPendentes(prev => prev.filter(x => x.id !== c.id))
  }

  // Rejeita: apaga o comentário nos dois lugares
  async function rejeitarComentario(c) {
    if (!window.confirm("Rejeitar e apagar este comentário?")) return
    await deleteDoc(doc(db, "comentarios", c.id))
    try {
      await deleteDoc(doc(db, "musicais", c.musicalId, "comentarios", c.id))
    } catch (e) {
      // idem: cópia da subcoleção pode já não existir
    }
    setComentariosPendentes(prev => prev.filter(x => x.id !== c.id))
  }

  // Publica um musical novo direto na coleção "musicais"
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

    // Proteção: não sobrescrever um musical já existente (zeraria avaliações)
    const existe = await getDoc(doc(db, "musicais", slug))
    if (existe.exists()) {
      if (!window.confirm(`Já existe um musical com esse título ("${formNovo.titulo}"). Publicar vai SOBRESCREVER o existente e zerar as avaliações. Continuar?`)) return
    }

    // Monta a lista de teatros no mesmo formato da página de musicais
    const teatrosLimpos = teatrosNovo
      .map(item => ({
        ano: item.ano.trim(),
        teatros: item.teatrosTexto.split(",").map(t => t.trim()).filter(Boolean)
      }))
      .filter(item => item.ano && item.teatros.length > 0)

    await setDoc(doc(db, "musicais", slug), {
      titulo: formNovo.titulo || "",
      sinopse: formNovo.sinopse || "",
      direcao: formNovo.direcao || "",
      direcaoMusical: formNovo.direcaoMusical || "",
      producao: formNovo.producao || "",
      elenco: formNovo.elenco || "",
      elencoAdicional: formNovo.elencoAdicional || "",
      versionista: formNovo.versionista || "",
      textoOriginal: formNovo.textoOriginal || "",
      musicaOriginal: formNovo.musicaOriginal || "",
      ano: formNovo.ano || "",
      teatro: teatrosLimpos[0]?.teatros[0] || "",
      teatros: teatrosLimpos,
      teatrosAdicionais: [],
      capa: capaNovo || "",
      programaDigital: formNovo.programaDigital || "",
      totalVotos: 0,
      somaEstrelas: 0,
      dataCriacao: new Date()
    })

    setMusicais(prev => [{ id: slug, titulo: formNovo.titulo, direcao: formNovo.direcao, ano: formNovo.ano, capa: capaNovo }, ...prev])
    setFormNovo({})
    setCapaNovo("")
    setTeatrosNovo([])
    // Mantém o índice da Home em dia
    try { await gerarIndiceHome() } catch (e) { /* não bloqueia a publicação */ }
    alert("Musical publicado!")
    setAba("musicais")
  }

  function abrirEdicaoSugestao(s) {
    setFormSugestao({
      titulo: s.titulo || "",
      sinopse: s.sinopse || "",
      direcao: s.direcao || "",
      direcaoMusical: s.direcaoMusical || "",
      producao: s.producao || "",
      elenco: s.elenco || "",
      elencoAdicional: s.elencoAdicional || "",
      versionista: s.versionista || "",
      textoOriginal: s.textoOriginal || "",
      musicaOriginal: s.musicaOriginal || "",
      ano: s.ano || "",
      teatro: s.teatro || ""
    })
    setEditandoSugestao(s.id)
  }

  async function salvarEdicaoSugestao(sugestaoId) {
    await updateDoc(doc(db, "sugestoes", sugestaoId), formSugestao)
    setSugestoes(prev => prev.map(s => s.id === sugestaoId ? { ...s, ...formSugestao } : s))
    setEditandoSugestao(null)
    setFormSugestao({})
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

await setDoc(doc(db, "musicais", slug), {
      titulo: sugestao.titulo || "",
      sinopse: sugestao.sinopse || "",
      direcao: sugestao.direcao || "",
      direcaoMusical: sugestao.direcaoMusical || "",
      producao: sugestao.producao || "",
      elenco: sugestao.elenco || "",
      elencoAdicional: sugestao.elencoAdicional || "",
      versionista: sugestao.versionista || "",
      textoOriginal: sugestao.textoOriginal || "",
      musicaOriginal: sugestao.musicaOriginal || "",
      ano: sugestao.ano || "",
      teatro: sugestao.teatro || "",
      capa: capas[sugestao.id] || "",
      totalVotos: 0,
      somaEstrelas: 0,
      dataCriacao: new Date()
    })
    await updateDoc(doc(db, "sugestoes", sugestao.id), { status: "aprovado" })
    setSugestoes(prev => prev.filter(s => s.id !== sugestao.id))
    setCapas(prev => { const next = { ...prev }; delete next[sugestao.id]; return next })
    // Mantém o índice da Home em dia
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
    // Mantém o índice da Home em dia
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

  const campoSugestao = (label, chave, multiline = false) => (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={formSugestao[chave] || ""}
          onChange={e => setFormSugestao(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", height: "80px", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", resize: "vertical" }}
        />
      ) : (
        <input
          type="text"
          value={formSugestao[chave] || ""}
          onChange={e => setFormSugestao(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }}
        />
      )}
    </div>
  )

  // Igual ao campoSugestao, mas ligado ao formulário da aba "Adicionar musical"
  const campoNovo = (label, chave, multiline = false) => (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={formNovo[chave] || ""}
          onChange={e => setFormNovo(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", height: "100px", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", resize: "vertical" }}
        />
      ) : (
        <input
          type="text"
          value={formNovo[chave] || ""}
          onChange={e => setFormNovo(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }}
        />
      )}
    </div>
  )

  const naoLidas = mensagens.filter(m => !m.lida).length

  if (!usuario) return <main><p>Carregando...</p></main>
  if (!ADMINS.includes(usuario.uid)) return <main><p>Acesso negado.</p></main>

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">Painel de administração</p>
      <h1 className="page-title">Admin</h1>

      <div style={{ display: "flex", gap: "12px", marginBottom: "32px", flexWrap: "wrap" }}>
        <button onClick={() => setAba("sugestoes")} className={aba === "sugestoes" ? "btn-comentar" : "btn-sair"}>
          Sugestões pendentes {sugestoes.length > 0 && `(${sugestoes.length})`}
        </button>
        <button onClick={() => setAba("adicionar")} className={aba === "adicionar" ? "btn-comentar" : "btn-sair"}>
          ➕ Adicionar musical
        </button>
        <button onClick={() => setAba("comentarios")} className={aba === "comentarios" ? "btn-comentar" : "btn-sair"}>
          Comentários pendentes {comentariosPendentes.length > 0 && `(${comentariosPendentes.length})`}
        </button>
        <button onClick={() => setAba("relatos")} className={aba === "relatos" ? "btn-comentar" : "btn-sair"}>
          Relatos e denúncias {relatos.length > 0 && `(${relatos.length})`}
        </button>
        <button onClick={() => setAba("musicais")} className={aba === "musicais" ? "btn-comentar" : "btn-sair"}>
          Musicais publicados ({musicais.length})
        </button>
        <button onClick={() => setAba("mensagens")} className={aba === "mensagens" ? "btn-comentar" : "btn-sair"}>
          Mensagens {naoLidas > 0 && `(${naoLidas} nova${naoLidas > 1 ? "s" : ""})`}
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
                  {campoSugestao("Sinopse", "sinopse", true)}
                  {campoSugestao("Direção", "direcao")}
                  {campoSugestao("Direção musical", "direcaoMusical")}
                  {campoSugestao("Produção", "producao")}
                  {campoSugestao("Elenco de estreia", "elenco")}
                  {campoSugestao("Elenco adicional", "elencoAdicional")}
                  {campoSugestao("Versionista", "versionista")}
                  {campoSugestao("Texto original", "textoOriginal")}
                  {campoSugestao("Música original", "musicaOriginal")}
                  {campoSugestao("Ano", "ano")}
                  {campoSugestao("Teatro", "teatro")}
                  <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                    <button className="btn-comentar" onClick={() => salvarEdicaoSugestao(s.id)}>Salvar edição</button>
                    <button className="btn-sair" onClick={() => setEditandoSugestao(null)}>Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "12px" }}>{s.titulo}</h2>
                  {s.sinopse && <p style={{ fontSize: "14px", color: "#444", marginBottom: "8px" }}><strong>Sinopse:</strong> {s.sinopse}</p>}
                  {s.direcao && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Direção:</strong> {s.direcao}</p>}
                  {s.direcaoMusical && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Direção musical:</strong> {s.direcaoMusical}</p>}
                  {s.producao && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Produção:</strong> {s.producao}</p>}
                 {s.elenco && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Elenco de estreia:</strong> {s.elenco}</p>}
                  {s.elencoAdicional && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Elenco adicional:</strong> {s.elencoAdicional}</p>}
                  {s.versionista && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Versionista:</strong> {s.versionista}</p>}
                  {s.textoOriginal && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Texto original:</strong> {s.textoOriginal}</p>}
                  {s.musicaOriginal && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Música original:</strong> {s.musicaOriginal}</p>}
                  {s.ano && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Ano:</strong> {s.ano}</p>}
                  {s.teatro && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Teatro:</strong> {s.teatro}</p>}
                  <p style={{ fontSize: "13px", color: "#888", marginTop: "12px", marginBottom: "16px" }}>Sugerido por: {s.nome}</p>

                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                      URL da capa (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={capas[s.id] || ""}
                      onChange={e => setCapas(prev => ({ ...prev, [s.id]: e.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none", marginBottom: "8px" }}
                    />
                    {capas[s.id] && (
                      <img src={capas[s.id]} alt="Preview" style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e8e4" }} />
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button className="btn-comentar" onClick={() => aprovar(s)}>Aprovar e publicar</button>
                    <button
                      onClick={() => abrirEdicaoSugestao(s)}
                      style={{ background: "transparent", color: "#888", border: "1px solid #ccc", borderRadius: "6px", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}
                    >
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
          {campoNovo("Sinopse", "sinopse", true)}
          {campoNovo("Direção", "direcao")}
          {campoNovo("Direção musical", "direcaoMusical")}
          {campoNovo("Produção", "producao")}
          {campoNovo("Versionista", "versionista")}
          {campoNovo("Texto original", "textoOriginal")}
          {campoNovo("Música original", "musicaOriginal")}
          {campoNovo("Elenco de estreia", "elenco", true)}
          {campoNovo("Elenco adicional", "elencoAdicional", true)}
          {campoNovo("Ano", "ano")}
          {campoNovo("Link do programa digital (Google Drive)", "programaDigital")}

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
              Teatros (o primeiro da lista é considerado a estreia)
            </label>
            {teatrosNovo.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button
                    onClick={() => moverTeatroNovo(i, -1)}
                    disabled={i === 0}
                    style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: "4px", padding: "2px 6px", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#ddd" : "#888", fontSize: "12px" }}
                    title="Mover para cima"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moverTeatroNovo(i, 1)}
                    disabled={i === teatrosNovo.length - 1}
                    style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: "4px", padding: "2px 6px", cursor: i === teatrosNovo.length - 1 ? "default" : "pointer", color: i === teatrosNovo.length - 1 ? "#ddd" : "#888", fontSize: "12px" }}
                    title="Mover para baixo"
                  >
                    ▼
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ano"
                  value={item.ano}
                  onChange={e => {
                    const novo = [...teatrosNovo]
                    novo[i] = { ...novo[i], ano: e.target.value }
                    setTeatrosNovo(novo)
                  }}
                  style={{ width: "90px", padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }}
                />
                <input
                  type="text"
                  placeholder="Teatros (separados por vírgula)"
                  value={item.teatrosTexto}
                  onChange={e => {
                    const novo = [...teatrosNovo]
                    novo[i] = { ...novo[i], teatrosTexto: e.target.value }
                    setTeatrosNovo(novo)
                  }}
                  style={{ flex: 1, padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }}
                />
                <button
                  onClick={() => setTeatrosNovo(teatrosNovo.filter((_, idx) => idx !== i))}
                  style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "16px", padding: "10px 4px" }}
                  title="Remover"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setTeatrosNovo([...teatrosNovo, { ano: "", teatrosTexto: "" }])}
              style={{ background: "none", border: "1px dashed #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}
            >
              + Adicionar teatro
            </button>
          </div>

          <div style={{ marginTop: "8px", marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
              URL da capa (opcional)
            </label>
            <input
              type="text"
              placeholder="https://..."
              value={capaNovo}
              onChange={e => setCapaNovo(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", marginBottom: "8px" }}
            />
            {capaNovo && (
              <img src={capaNovo} alt="Preview" style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e8e4" }} />
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button className="btn-comentar" onClick={publicarNovo}>Publicar musical</button>
            <button className="btn-sair" onClick={() => { setFormNovo({}); setCapaNovo(""); setTeatrosNovo([]) }}>Limpar</button>
          </div>
        </div>
      ) : aba === "comentarios" ? (
        comentariosPendentes.length === 0 ? (
          <p style={{ color: "#888" }}>Nenhum comentário pendente.</p>
        ) : (
          comentariosPendentes.map(c => (
            <div key={c.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px", background: "#fff8e1", color: "#8d6e01", borderRadius: "4px", padding: "2px 8px" }}>
                  Aguardando aprovação
                </span>
                <p style={{ fontSize: "13px", fontWeight: "500", color: "#b8960a", margin: 0 }}>{c.musicalTitulo}</p>
              </div>
              <p style={{ fontSize: "15px", color: "#333", marginBottom: "12px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{c.texto}</p>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>Por: {c.nome || "Anônimo"}</p>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button className="btn-comentar" onClick={() => aprovarComentario(c)}>Aprovar</button>
                <button className="btn-sair" onClick={() => navigate(`/musical/${c.musicalId}`)}>Ver musical</button>
                <button
                  onClick={() => rejeitarComentario(c)}
                  style={{ background: "transparent", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "6px", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}
                >
                  Rejeitar
                </button>
              </div>
            </div>
          ))
        )
      ) : aba === "relatos" ? (
        relatos.length === 0 ? (
          <p style={{ color: "#888" }}>Nenhum relato ou denúncia.</p>
        ) : (
          relatos.map(r => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px", background: r.tipo === "denuncia_comentario" ? "#fff0f0" : "#fffbe6", color: r.tipo === "denuncia_comentario" ? "#cc0000" : "#888", borderRadius: "4px", padding: "2px 8px" }}>
                  {r.tipo === "denuncia_comentario" ? "Denúncia de comentário" : "Relato de erro"}
                </span>
                <p style={{ fontSize: "13px", fontWeight: "500", color: "#F5C518" }}>{r.musicalTitulo}</p>
              </div>
              {r.tipo === "denuncia_comentario" && r.comentarioTexto && (
                <div style={{ background: "#f9f9f9", borderLeft: "3px solid #e8e8e4", padding: "8px 12px", marginBottom: "10px", borderRadius: "4px" }}>
                  <p style={{ fontSize: "12px", color: "#888", marginBottom: "2px" }}>Comentário denunciado de {r.comentarioAutor}:</p>
                  <p style={{ fontSize: "13px", color: "#555", fontStyle: "italic" }}>"{r.comentarioTexto}"</p>
                </div>
              )}
              <p style={{ fontSize: "15px", color: "#333", marginBottom: "12px", lineHeight: "1.6" }}>{r.texto}</p>
              <p style={{ fontSize: "13px", color: "#888", marginBottom: "16px" }}>
                {r.tipo === "denuncia_comentario" ? "Denunciado por" : "Reportado por"}: {r.nome}
              </p>
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
            <div key={m.id} style={{
              background: m.lida ? "#fff" : "#fffbe6",
              border: m.lida ? "1px solid #e8e8e4" : "1px solid #F5C518",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "16px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                {!m.lida && (
                  <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", background: "#F5C518", color: "#1a1a1a", borderRadius: "4px", padding: "2px 8px" }}>
                    Nova
                  </span>
                )}
                <p style={{ fontSize: "15px", fontWeight: "700", margin: 0 }}>{m.nome}</p>
                {m.email && (
                  <a href={`mailto:${m.email}`} style={{ fontSize: "13px", color: "#888", textDecoration: "none" }}>
                    {m.email}
                  </a>
                )}
                <p style={{ fontSize: "12px", color: "#bbb", margin: 0, marginLeft: "auto" }}>
                  {m.data?.toDate ? m.data.toDate().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                </p>
              </div>
              <p style={{ fontSize: "15px", color: "#333", lineHeight: "1.6", marginBottom: "16px", whiteSpace: "pre-wrap" }}>
                {m.mensagem}
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {!m.lida && (
                  <button className="btn-comentar" onClick={() => marcarMensagemLida(m.id)}>
                    ✓ Marcar como lida
                  </button>
                )}
                {m.email && (
                  <a
                    href={`mailto:${m.email}`}
                    style={{ display: "inline-block", padding: "10px 20px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#1a1a1a", textDecoration: "none", background: "#fff" }}
                  >
                    Responder por e-mail
                  </a>
                )}
                <button
                  onClick={() => deletarMensagem(m.id)}
                  style={{ background: "transparent", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "6px", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}
                >
                  Deletar
                </button>
              </div>
            </div>
          ))
        )
      ) : (
        <>
          {/* Barra de ação do índice da Home */}
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
            <button className="btn-comentar" onClick={atualizarIndiceManual}>
              🔄 Atualizar índice da Home
            </button>
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
                  <button onClick={() => deletarMusical(m.id, m.titulo)} style={{ background: "transparent", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "6px", padding: "7px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer" }}>
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