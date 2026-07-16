import { useEffect, useState } from "react"
import { collection, collectionGroup, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth"
import { ADMINS } from "../admins"
import {
  ESSENCIAIS,
  ESSENCIAL_CAMPO,
  COMPLEMENTARES,
  equipeInicial,
  equipeDeDocumento,
  musicosDeDocumento,
  fontesDeDocumento,
  teatrosDeDocumento,
  montarEquipeDeStrings,
  montarPayload,
} from "../musicalSchema"

const normalizarNome = (texto) =>
  (texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

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
  const itens = snap.docs
    .filter(d => d.data().status !== "rascunho")
    .map(d => montarItemIndice(d.id, d.data()))
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
  const [fontesEdicao, setFontesEdicao] = useState([])
  const [indiceStatus, setIndiceStatus] = useState("")
  const [emAltaVotos, setEmAltaVotos] = useState([])
  const [capasAtuais, setCapasAtuais] = useState({})
  const [janela, setJanela] = useState("7")

  // Aba "Adicionar musical"
  const [formNovo, setFormNovo] = useState({ programaDigital: "" })
  const [capaNovo, setCapaNovo] = useState("")
  const [teatrosNovo, setTeatrosNovo] = useState([])
  const [equipeNovo, setEquipeNovo] = useState(equipeInicial())
  const [musicosNovo, setMusicosNovo] = useState([])
  const [fontesNovo, setFontesNovo] = useState([])
  const [rascunhoId, setRascunhoId] = useState(null)
  const [rascunhosAdmin, setRascunhosAdmin] = useState([])
  const [enviandoCapaNovo, setEnviandoCapaNovo] = useState(false)
  const [enviandoCapaSugestao, setEnviandoCapaSugestao] = useState(null)

  // Aba "Entidades" (perfis enriquecidos de artistas, produtoras e assessorias)
  const [entidades, setEntidades] = useState([])
  const [formEntidade, setFormEntidade] = useState({ tipo: "artista", tipoImagem: "foto" })
  const [extrasEntidade, setExtrasEntidade] = useState([])
  const [editandoEntidadeId, setEditandoEntidadeId] = useState(null)
  const [enviandoImagemEntidade, setEnviandoImagemEntidade] = useState(false)

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  async function carregarAba(qual) {
    if (carregadas.has(qual)) return
    setCarregando(true)
    try {
      if (qual === "sugestoes") {
        const q = query(collection(db, "sugestoes"), where("status", "==", "pendente"), orderBy("data", "desc"))
        const snap = await getDocs(q)
        setSugestoes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } else if (qual === "adicionar") {
        const q = query(collection(db, "sugestoes"), where("status", "==", "rascunho_admin"), orderBy("data", "desc"))
        const snap = await getDocs(q)
        setRascunhosAdmin(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } else if (qual === "relatos") {
        const snap = await getDocs(query(collection(db, "relatorios"), orderBy("data", "desc")))
        setRelatos(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.tipo !== "denuncia_comentario"))
      } else if (qual === "musicais") {
        const snap = await getDocs(query(collection(db, "musicais"), orderBy("dataCriacao", "desc")))
        setMusicais(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } else if (qual === "mensagens") {
        const snap = await getDocs(query(collection(db, "mensagens"), orderBy("data", "desc")))
        setMensagens(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } else if (qual === "emalta") {
        const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const q = query(collectionGroup(db, "votos"), where("data", ">=", trintaDiasAtras))
        const [snap, indiceSnap] = await Promise.all([
          getDocs(q),
          getDoc(doc(db, "indices", "home"))
        ])
        setEmAltaVotos(snap.docs.map(d => d.data()).filter(v => v.data && v.musicalId))
        const mapaCapas = {}
        if (indiceSnap.exists()) {
          (indiceSnap.data().itens || []).forEach(it => { mapaCapas[it.id] = it.capa || "" })
        }
        setCapasAtuais(mapaCapas)
      } else if (qual === "entidades") {
        const snap = await getDocs(collection(db, "entidades"))
        setEntidades(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nome || "").localeCompare(b.nome || "")))
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
      const params = new URLSearchParams(window.location.search)
      const editarNome = params.get("editar")
      if (editarNome) {
        // Veio da página da Pessoa com "?editar=Nome": abre a aba Entidades já editando.
        setAba("entidades")
        ;(async () => {
          const snap = await getDocs(collection(db, "entidades"))
          const lista = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
          setEntidades(lista)
          setCarregadas(prev => new Set(prev).add("entidades"))
          const alvo = lista.find(e => normalizarNome(e.nome) === normalizarNome(editarNome))
          if (alvo) {
            editarEntidade(alvo)
          } else {
            // Não existe ainda: deixa o nome preenchido pra facilitar criar (inofensivo na opção A).
            setFormEntidade({ tipo: "artista", tipoImagem: "foto", nome: decodeURIComponent(editarNome) })
          }
          setCarregando(false)
          window.history.replaceState({}, "", "/admin")
        })()
      } else {
        carregarAba(aba)
      }
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

  // ── montarPayload agora vem de ../musicalSchema (fonte única) ────────────────
async function fazerUploadCapaNovo(arquivo) {
    if (!arquivo) return
    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.")
      return
    }
    setEnviandoCapaNovo(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo"))
        reader.readAsDataURL(arquivo)
      })

      const resposta = await fetch("/api/upload-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagemBase64: base64,
          nomeArquivo: arquivo.name,
          pasta: "capas",
        }),
      })
      const dados = await resposta.json()
      if (!resposta.ok || !dados.urlGrande) {
        throw new Error(dados.erro || "Erro no upload")
      }
      setCapaNovo(dados.urlGrande)
    } catch (e) {
      alert("Erro ao enviar a capa. Tente novamente.")
    }
    setEnviandoCapaNovo(false)
  }

  async function fazerUploadCapaSugestao(arquivo, sugestaoId) {
    if (!arquivo) return
    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.")
      return
    }
    setEnviandoCapaSugestao(sugestaoId)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo"))
        reader.readAsDataURL(arquivo)
      })

      const resposta = await fetch("/api/upload-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagemBase64: base64,
          nomeArquivo: arquivo.name,
          pasta: "capas",
        }),
      })
      const dados = await resposta.json()
      if (!resposta.ok || !dados.urlGrande) {
        throw new Error(dados.erro || "Erro no upload")
      }
      setCapas(prev => ({ ...prev, [sugestaoId]: dados.urlGrande }))
    } catch (e) {
      alert("Erro ao enviar a capa. Tente novamente.")
    }
    setEnviandoCapaSugestao(null)
  }

  async function salvarNovo(status) {
    if (!formNovo.titulo || !formNovo.titulo.trim()) {
      alert("O título é obrigatório.")
      return
    }

    const payload = montarPayload(formNovo, equipeNovo, musicosNovo, teatrosNovo, capaNovo, fontesNovo)

    if (status === "rascunho") {
      if (rascunhoId) {
        await updateDoc(doc(db, "sugestoes", rascunhoId), { ...payload, status: "rascunho_admin" })
        setRascunhosAdmin(prev => prev.map(r => r.id === rascunhoId ? { id: rascunhoId, ...payload, status: "rascunho_admin" } : r))
      } else {
        const novoRef = doc(collection(db, "sugestoes"))
        await setDoc(novoRef, { ...payload, status: "rascunho_admin", data: new Date() })
        setRascunhoId(novoRef.id)
        setRascunhosAdmin(prev => [{ id: novoRef.id, ...payload, status: "rascunho_admin" }, ...prev])
      }
      alert("Rascunho salvo! Ele fica aqui mesmo na aba \"Adicionar musical\" até você publicar.")
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

    await setDoc(doc(db, "musicais", slug), {
      ...payload,
      teatrosAdicionais: [],
      totalVotos: 0,
      somaEstrelas: 0,
      dataCriacao: new Date()
    })

    if (rascunhoId) {
      try { await deleteDoc(doc(db, "sugestoes", rascunhoId)) } catch (e) { /* não bloqueia a publicação */ }
      setRascunhosAdmin(prev => prev.filter(r => r.id !== rascunhoId))
    }

    setMusicais(prev => [{ id: slug, titulo: formNovo.titulo, direcao: payload.direcao, ano: formNovo.ano, capa: capaNovo }, ...prev])
    setFormNovo({ programaDigital: "" })
    setCapaNovo("")
    setTeatrosNovo([])
    setEquipeNovo(equipeInicial())
    setMusicosNovo([])
    setFontesNovo([])
    setRascunhoId(null)
    try { await gerarIndiceHome() } catch (e) { /* não bloqueia a publicação */ }
    alert("Musical publicado!")
    setAba("musicais")
    carregarAba("musicais")
  }

  function continuarRascunho(r) {
    setFormNovo({
      titulo: r.titulo || "",
      tituloOriginal: r.tituloOriginal || "",
      sinopse: r.sinopse || "",
      elenco: r.elenco || "",
      elencoAdicional: r.elencoAdicional || "",
      ano: r.ano || "",
      programaDigital: r.programaDigital || "",
    })
    setEquipeNovo(equipeDeDocumento(r))
    setMusicosNovo(musicosDeDocumento(r))
    setTeatrosNovo(teatrosDeDocumento(r))
    setFontesNovo(fontesDeDocumento(r))
    setCapaNovo(r.capa || "")
    setRascunhoId(r.id)
  }

  async function deletarRascunho(id, titulo) {
    if (!window.confirm(`Deletar o rascunho "${titulo || "sem título"}"? Esta ação não pode ser desfeita.`)) return
    await deleteDoc(doc(db, "sugestoes", id))
    setRascunhosAdmin(prev => prev.filter(r => r.id !== id))
    if (rascunhoId === id) {
      setRascunhoId(null)
      setFormNovo({ programaDigital: "" })
      setCapaNovo("")
      setTeatrosNovo([])
      setEquipeNovo(equipeInicial())
      setMusicosNovo([])
      setFontesNovo([])
    }
  }

  function abrirEdicaoSugestao(s) {
    setFormSugestao({
      titulo: s.titulo || "",
      tituloOriginal: s.tituloOriginal || "",
      sinopse: s.sinopse || "",
      elenco: s.elenco || "",
      elencoAdicional: s.elencoAdicional || "",
      ano: s.ano || "",
      programaDigital: s.programaDigital || "",
    })
    setEquipeEdicao(equipeDeDocumento(s))
    setMusicosEdicao(musicosDeDocumento(s))
    setTeatrosEdicao(teatrosDeDocumento(s))
    setFontesEdicao(fontesDeDocumento(s))
    setCapas(prev => ({ ...prev, [s.id]: s.capa || prev[s.id] || "" }))
    setEditandoSugestao(s.id)
  }

  async function salvarEdicaoSugestao(sugestaoId) {
    const payload = montarPayload(formSugestao, equipeEdicao, musicosEdicao, teatrosEdicao, capas[sugestaoId] || "", fontesEdicao)
    await updateDoc(doc(db, "sugestoes", sugestaoId), payload)
    setSugestoes(prev => prev.map(s => s.id === sugestaoId ? { ...s, ...payload } : s))
    setEditandoSugestao(null)
    setFormSugestao({})
    setEquipeEdicao(equipeInicial())
    setMusicosEdicao([])
    setTeatrosEdicao([])
    setFontesEdicao([])
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

    const existe = await getDoc(doc(db, "musicais", slug))
    if (existe.exists()) {
      if (!window.confirm(`Já existe um musical com esse título ("${sugestao.titulo}"). Publicar vai SOBRESCREVER o existente e zerar as avaliações. Continuar?`)) return
    }

    // Reconstrói tudo via tradutor: lê tanto o formato novo quanto o antigo,
    // resgatando dados de sugestões antigas que se perderiam de outra forma.
    const payload = montarPayload(
      {
        titulo: sugestao.titulo,
        tituloOriginal: sugestao.tituloOriginal,
        sinopse: sugestao.sinopse,
        elenco: sugestao.elenco,
        elencoAdicional: sugestao.elencoAdicional,
        ano: sugestao.ano,
        programaDigital: sugestao.programaDigital,
      },
      equipeDeDocumento(sugestao),
      musicosDeDocumento(sugestao),
      teatrosDeDocumento(sugestao),
      capas[sugestao.id] || sugestao.capa || "",
      fontesDeDocumento(sugestao),
    )

    // Rede de segurança: se por acaso não veio nenhuma equipe, reconstrói a
    // partir das strings de direção antigas.
    if (payload.equipeCriativa.length === 0) {
      payload.equipeCriativa = montarEquipeDeStrings(sugestao.direcao, sugestao.direcaoMusical)
    }

    await setDoc(doc(db, "musicais", slug), {
      ...payload,
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

  async function mandarMensagemParaSugestor(sugestorUid) {
    if (!sugestorUid) return
    const conversasSnap = await getDocs(
      query(collection(db, "conversas"), where("participantes", "array-contains", usuario.uid))
    )
    const conversaExistente = conversasSnap.docs.find(d => d.data().participantes.includes(sugestorUid))
    if (conversaExistente) {
      navigate(`/mensagens/${conversaExistente.id}`)
    } else {
      const novaConversa = await addDoc(collection(db, "conversas"), {
        participantes: [usuario.uid, sugestorUid],
        ultimaMensagem: "",
        ultimaMensagemData: serverTimestamp(),
        naoLidas: { [usuario.uid]: 0, [sugestorUid]: 0 },
      })
      navigate(`/mensagens/${novaConversa.id}`)
    }
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

  // ── Entidades (perfis enriquecidos) ─────────────────────────────────────────

  async function fazerUploadImagemEntidade(arquivo) {
    if (!arquivo) return
    if (!arquivo.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.")
      return
    }
    setEnviandoImagemEntidade(true)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error("Falha ao ler o arquivo"))
        reader.readAsDataURL(arquivo)
      })
      const resposta = await fetch("/api/upload-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagemBase64: base64,
          nomeArquivo: arquivo.name,
          pasta: "entidades",
        }),
      })
      const dados = await resposta.json()
      if (!resposta.ok || !dados.urlGrande) {
        throw new Error(dados.erro || "Erro no upload")
      }
      setFormEntidade(prev => ({ ...prev, imagem: dados.urlGrande }))
    } catch (e) {
      alert("Erro ao enviar a imagem. Tente novamente.")
    }
    setEnviandoImagemEntidade(false)
  }

  function limparFormEntidade() {
    setFormEntidade({ tipo: "artista", tipoImagem: "foto" })
    setExtrasEntidade([])
    setEditandoEntidadeId(null)
  }

  function editarEntidade(e) {
    setFormEntidade({
      tipo: e.tipo || "artista",
      nome: e.nome || "",
      bio: e.bio || "",
      imagem: e.imagem || "",
      tipoImagem: e.tipoImagem || "foto",
      instagram: e.links?.instagram || "",
      site: e.links?.site || "",
      email: e.links?.email || "",
      formacao: e.formacao || "",
      contato: e.contato || "",
      destaques: Array.isArray(e.destaques) ? e.destaques.join(", ") : "",
      publicado: e.publicado === true,
    })
    setExtrasEntidade(Array.isArray(e.links?.extras) ? e.links.extras.map(x => ({ ...x })) : [])
    setEditandoEntidadeId(e.id)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function salvarEntidade() {
    const nome = (formEntidade.nome || "").trim()
    if (!nome) {
      alert("O nome é obrigatório.")
      return
    }
    const novoId = normalizarNome(nome)
    if (!novoId) {
      alert("Nome inválido.")
      return
    }

    const extrasLimpos = extrasEntidade
      .map(x => ({ label: (x.label || "").trim(), url: (x.url || "").trim() }))
      .filter(x => x.label && x.url)

    const destaquesArray = (formEntidade.destaques || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)

    const payload = {
      tipo: formEntidade.tipo || "artista",
      nome,
      bio: (formEntidade.bio || "").trim(),
      imagem: (formEntidade.imagem || "").trim(),
      tipoImagem: formEntidade.tipoImagem || "foto",
      links: {
        instagram: (formEntidade.instagram || "").trim(),
        site: (formEntidade.site || "").trim(),
        email: (formEntidade.email || "").trim(),
        extras: extrasLimpos,
      },
      formacao: (formEntidade.formacao || "").trim(),
      contato: (formEntidade.contato || "").trim(),
      destaques: destaquesArray,
      publicado: formEntidade.publicado === true,
    }

    if (editandoEntidadeId && editandoEntidadeId !== novoId) {
      const jaExiste = await getDoc(doc(db, "entidades", novoId))
      if (jaExiste.exists()) {
        if (!window.confirm(`Já existe uma entidade com o ID "${novoId}". Salvar vai sobrescrevê-la. Continuar?`)) return
      }
      await deleteDoc(doc(db, "entidades", editandoEntidadeId))
    } else if (!editandoEntidadeId) {
      const jaExiste = await getDoc(doc(db, "entidades", novoId))
      if (jaExiste.exists()) {
        if (!window.confirm(`Já existe uma entidade com esse nome ("${nome}"). Salvar vai sobrescrevê-la. Continuar?`)) return
      }
    }

    await setDoc(doc(db, "entidades", novoId), payload)
    setEntidades(prev => {
      const semAntigo = prev.filter(x => x.id !== editandoEntidadeId && x.id !== novoId)
      return [{ id: novoId, ...payload }, ...semAntigo].sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
    })
    limparFormEntidade()
    alert("Entidade salva!")
  }

  async function deletarEntidade(id, nome) {
    if (!window.confirm(`Deletar a entidade "${nome}"? Esta ação não pode ser desfeita.`)) return
    await deleteDoc(doc(db, "entidades", id))
    setEntidades(prev => prev.filter(x => x.id !== id))
    if (editandoEntidadeId === id) limparFormEntidade()
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

  const campoEntidade = (label, chave, multiline = false, placeholder = "") => (
    <div style={{ marginBottom: "12px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
        {label}
      </label>
      {multiline ? (
        <textarea value={formEntidade[chave] || ""} onChange={ev => setFormEntidade(prev => ({ ...prev, [chave]: ev.target.value }))} placeholder={placeholder}
          style={{ width: "100%", height: "90px", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", resize: "vertical" }} />
      ) : (
        <input type="text" value={formEntidade[chave] || ""} onChange={ev => setFormEntidade(prev => ({ ...prev, [chave]: ev.target.value }))} placeholder={placeholder}
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
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "flex-start" }}>
            <input type="text" placeholder="Local (ex: São Paulo)" value={item.local}
              onChange={e => { const novo = [...musicos]; novo[i] = { ...novo[i], local: e.target.value }; setMusicos(novo) }}
              style={{ width: "160px", padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", flexShrink: 0 }} />
            <textarea placeholder="Nomes (separados por vírgula)" value={item.nomesTexto} rows={3}
              onChange={e => { const novo = [...musicos]; novo[i] = { ...novo[i], nomesTexto: e.target.value }; setMusicos(novo) }}
              style={{ flex: 1, padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", resize: "vertical", lineHeight: 1.5 }} />
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

  // Editor de fontes genérico
  function renderEditorFontes(fontes, setFontes) {
    return (
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
          Fontes (de onde a informação foi tirada)
        </label>
        {fontes.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
            <input type="text" placeholder="Descrição (ex: Folha de S.Paulo, 12/03/1998)" value={item.descricao}
              onChange={e => { const novo = [...fontes]; novo[i] = { ...novo[i], descricao: e.target.value }; setFontes(novo) }}
              style={{ flex: 1, padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
            <input type="text" placeholder="Link (opcional)" value={item.link}
              onChange={e => { const novo = [...fontes]; novo[i] = { ...novo[i], link: e.target.value }; setFontes(novo) }}
              style={{ width: "200px", padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", flexShrink: 0 }} />
            <button onClick={() => setFontes(fontes.filter((_, idx) => idx !== i))}
              style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "16px", padding: "10px 4px" }} title="Remover">✕</button>
          </div>
        ))}
        <button onClick={() => setFontes([...fontes, { descricao: "", link: "" }])}
          style={{ background: "none", border: "1px dashed #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}>
          + Adicionar fonte
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

  const cutoffJanela = Date.now() - Number(janela) * 24 * 60 * 60 * 1000
  const rankingEmAlta = (() => {
    const mapa = {}
    emAltaVotos.forEach(v => {
      const quando = v.data?.toDate ? v.data.toDate().getTime() : 0
      if (quando < cutoffJanela) return
      if (!mapa[v.musicalId]) mapa[v.musicalId] = { musicalId: v.musicalId, titulo: v.titulo || v.musicalId, capa: capasAtuais[v.musicalId] || v.capa || "", count: 0, soma: 0 }
      mapa[v.musicalId].count += 1
      mapa[v.musicalId].soma += Number(v.estrelas) || 0
    })
    return Object.values(mapa).sort((a, b) => b.count - a.count)
  })()

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
          ➕ Adicionar musical {carregadas.has("adicionar") && rascunhosAdmin.length > 0 && `(${rascunhosAdmin.length} rascunho${rascunhosAdmin.length > 1 ? "s" : ""})`}
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
        <button onClick={() => trocarAba("emalta")} className={aba === "emalta" ? "btn-comentar" : "btn-sair"}>
          🔥 Em alta
        </button>
        <button onClick={() => trocarAba("entidades")} className={aba === "entidades" ? "btn-comentar" : "btn-sair"}>
          🎭 Entidades {carregadas.has("entidades") && entidades.length > 0 && `(${entidades.length})`}
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
                  {campoSugestao("Link do programa digital (opcional)", "programaDigital")}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                      Capa (opcional)
                    </label>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: enviandoCapaSugestao === s.id ? "#ccc" : "#1a1a1a", color: "#F5C518", borderRadius: "8px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: "600", cursor: enviandoCapaSugestao === s.id ? "wait" : "pointer" }}>
                        {enviandoCapaSugestao === s.id ? "Enviando..." : "📤 Enviar imagem"}
                        <input type="file" accept="image/*" disabled={enviandoCapaSugestao === s.id}
                          onChange={e => { fazerUploadCapaSugestao(e.target.files[0], s.id); e.target.value = "" }}
                          style={{ display: "none" }} />
                      </label>
                      <span style={{ fontSize: "12px", color: "#aaa" }}>ou cole uma URL abaixo</span>
                    </div>
                    <input type="text" placeholder="https://..." value={capas[s.id] || ""}
                      onChange={e => setCapas(prev => ({ ...prev, [s.id]: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", marginBottom: "8px" }} />
                    {capas[s.id] && (
                      <img src={capas[s.id]} alt="Preview" style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e8e4" }} />
                    )}
                  </div>
                  {renderEditorFontes(fontesEdicao, setFontesEdicao)}
                  <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                    <button className="btn-comentar" onClick={() => salvarEdicaoSugestao(s.id)}>Salvar edição</button>
                    <button className="btn-sair" onClick={() => { setEditandoSugestao(null); setFormSugestao({}); setEquipeEdicao(equipeInicial()); setMusicosEdicao([]); setTeatrosEdicao([]); setFontesEdicao([]) }}>Cancelar</button>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "12px", marginBottom: "16px" }}>
                    <p style={{ fontSize: "13px", color: "#888", margin: 0 }}>Sugerido por: {s.nome}</p>
                    {s.userId && s.userId !== usuario.uid && (
                      <button onClick={() => mandarMensagemParaSugestor(s.userId)}
                        style={{ background: "transparent", color: "#555", border: "1px solid #e8e8e4", borderRadius: "20px", padding: "5px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                        💬 Mandar mensagem
                      </button>
                    )}
                  </div>
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
                      Capa (opcional)
                    </label>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: enviandoCapaSugestao === s.id ? "#ccc" : "#1a1a1a", color: "#F5C518", borderRadius: "8px", padding: "10px 18px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: "600", cursor: enviandoCapaSugestao === s.id ? "wait" : "pointer" }}>
                        {enviandoCapaSugestao === s.id ? "Enviando..." : "📤 Enviar imagem"}
                        <input type="file" accept="image/*" disabled={enviandoCapaSugestao === s.id}
                          onChange={e => { fazerUploadCapaSugestao(e.target.files[0], s.id); e.target.value = "" }}
                          style={{ display: "none" }} />
                      </label>
                      <span style={{ fontSize: "13px", color: "#aaa" }}>ou cole uma URL abaixo</span>
                    </div>
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
        <>
          {rascunhosAdmin.length > 0 && (
            <div style={{ background: "#fffbe6", border: "1px solid #F5C518", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", marginBottom: "12px" }}>Rascunhos salvos</h2>
              {rascunhosAdmin.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderTop: "1px solid #f0e6b8" }}>
                  <p style={{ flex: 1, fontSize: "14px", fontWeight: "600", margin: 0 }}>{r.titulo || "(sem título)"}</p>
                  <button className="btn-comentar" onClick={() => continuarRascunho(r)}>✏️ Continuar editando</button>
                  <button onClick={() => deletarRascunho(r.id, r.titulo)}
                    style={{ background: "transparent", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "6px", padding: "7px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer" }}>
                    Deletar
                  </button>
                </div>
              ))}
            </div>
          )}
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

          {campoNovo("Link do programa digital (opcional)", "programaDigital")}

          <div style={{ marginTop: "8px", marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
              Capa (opcional)
            </label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: enviandoCapaNovo ? "#ccc" : "#1a1a1a", color: "#F5C518", borderRadius: "8px", padding: "10px 18px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: "600", cursor: enviandoCapaNovo ? "wait" : "pointer" }}>
                {enviandoCapaNovo ? "Enviando..." : "📤 Enviar imagem"}
                <input
                  type="file"
                  accept="image/*"
                  disabled={enviandoCapaNovo}
                  onChange={e => { fazerUploadCapaNovo(e.target.files[0]); e.target.value = "" }}
                  style={{ display: "none" }}
                />
              </label>
              <span style={{ fontSize: "13px", color: "#aaa" }}>ou cole uma URL abaixo</span>
            </div>
            <input type="text" placeholder="https://..." value={capaNovo} onChange={e => setCapaNovo(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", marginBottom: "8px" }} />
            {capaNovo && (
              <img src={capaNovo} alt="Preview" style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e8e4" }} />
            )}
          </div>

          {renderEditorFontes(fontesNovo, setFontesNovo)}

          {rascunhoId && (
            <div style={{ background: "#fffbe6", border: "1px solid #F5C518", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "13px", color: "#666" }}>
              📝 Editando um rascunho salvo. Publicar ou salvar vai atualizar este mesmo item.
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button className="btn-comentar" onClick={() => salvarNovo("publicado")}>✅ Publicar musical</button>
            <button className="btn-sair" onClick={() => salvarNovo("rascunho")}>💾 Salvar rascunho</button>
            <button className="btn-sair" onClick={() => { setFormNovo({ programaDigital: "" }); setCapaNovo(""); setTeatrosNovo([]); setEquipeNovo(equipeInicial()); setMusicosNovo([]); setFontesNovo([]); setRascunhoId(null) }}>Limpar</button>
          </div>
        </div>
        </>
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
                <Link className="btn-comentar" to={`/musical/${r.musicalId}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>Ver musical</Link>
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
      ) : aba === "emalta" ? (
        <>
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button onClick={() => setJanela("7")} className={janela === "7" ? "btn-comentar" : "btn-sair"}>Últimos 7 dias</button>
            <button onClick={() => setJanela("30")} className={janela === "30" ? "btn-comentar" : "btn-sair"}>Últimos 30 dias</button>
          </div>
          <p style={{ fontSize: "13px", color: "#888", marginBottom: "20px" }}>
            Musicais que mais receberam avaliações no período. Visível só para admins.
          </p>
          {rankingEmAlta.length === 0 ? (
            <p style={{ color: "#888" }}>Nenhuma avaliação registrada nesse período ainda.</p>
          ) : (
            rankingEmAlta.map((m, i) => (
              <div key={m.musicalId} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: "700", color: "#b8960a", width: "28px", textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                {m.capa ? (
                  <img src={m.capa} alt={m.titulo} style={{ width: "48px", height: "64px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: "48px", height: "64px", background: "#1a1a1a", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#F5C518", fontSize: "8px", textAlign: "center", padding: "4px" }}>{m.titulo}</span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", fontWeight: "700", marginBottom: "4px" }}>{m.titulo}</p>
                  <p style={{ fontSize: "13px", color: "#888" }}>
                    {m.count} {m.count === 1 ? "avaliação" : "avaliações"} · média {(m.soma / m.count).toFixed(1)} ★
                  </p>
                </div>
                <button className="btn-comentar" onClick={() => navigate(`/musical/${m.musicalId}`)} style={{ flexShrink: 0 }}>Ver</button>
              </div>
            ))
          )}
        </>
      ) : aba === "entidades" ? (
        <>
          <div style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "8px" }}>
              {editandoEntidadeId ? "Editar entidade" : "Nova entidade"}
            </h2>
            <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px", lineHeight: "1.5" }}>
              Perfil que aparece no topo da página <strong>/pessoa/nome</strong>. O <strong>nome</strong> precisa bater com a grafia usada nos créditos dos musicais.
            </p>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Tipo</label>
              <select value={formEntidade.tipo || "artista"} onChange={ev => setFormEntidade(prev => ({ ...prev, tipo: ev.target.value }))}
                style={{ padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", background: "#fff" }}>
                <option value="artista">Artista</option>
                <option value="produtora">Produtora</option>
                <option value="assessoria">Assessoria de imprensa</option>
              </select>
            </div>

            {campoEntidade("Nome (igual aos créditos)", "nome")}
            {campoEntidade("Bio", "bio", true)}

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Tipo de imagem</label>
              <select value={formEntidade.tipoImagem || "foto"} onChange={ev => setFormEntidade(prev => ({ ...prev, tipoImagem: ev.target.value }))}
                style={{ padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", background: "#fff" }}>
                <option value="foto">Foto (recorta em quadrado)</option>
                <option value="logo">Logo (exibe inteira)</option>
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Imagem</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: enviandoImagemEntidade ? "#ccc" : "#1a1a1a", color: "#F5C518", borderRadius: "8px", padding: "10px 18px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: "600", cursor: enviandoImagemEntidade ? "wait" : "pointer" }}>
                  {enviandoImagemEntidade ? "Enviando..." : "📤 Enviar imagem"}
                  <input type="file" accept="image/*" disabled={enviandoImagemEntidade}
                    onChange={ev => { fazerUploadImagemEntidade(ev.target.files[0]); ev.target.value = "" }}
                    style={{ display: "none" }} />
                </label>
                <span style={{ fontSize: "13px", color: "#aaa" }}>ou cole uma URL abaixo</span>
              </div>
              <input type="text" placeholder="https://..." value={formEntidade.imagem || ""} onChange={ev => setFormEntidade(prev => ({ ...prev, imagem: ev.target.value }))}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", marginBottom: "8px" }} />
              {formEntidade.imagem && (
                formEntidade.tipoImagem === "logo" ? (
                  <img src={formEntidade.imagem} alt="Preview" style={{ maxWidth: "160px", maxHeight: "90px", objectFit: "contain", border: "1px solid #e8e8e4", borderRadius: "6px", padding: "4px", background: "#fafafa" }} />
                ) : (
                  <img src={formEntidade.imagem} alt="Preview" style={{ width: "90px", height: "90px", objectFit: "cover", borderRadius: "8px", border: "1px solid #e8e8e4" }} />
                )
              )}
            </div>

            {campoEntidade("Instagram (@ ou usuário)", "instagram", false, "ex: estamosaqui")}
            {campoEntidade("Site", "site", false, "https://...")}
            {campoEntidade("E-mail", "email")}

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Links extras</label>
              {extrasEntidade.map((ex, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                  <input type="text" placeholder="Rótulo (ex: TikTok)" value={ex.label || ""}
                    onChange={ev => { const novo = [...extrasEntidade]; novo[i] = { ...novo[i], label: ev.target.value }; setExtrasEntidade(novo) }}
                    style={{ width: "160px", padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", flexShrink: 0 }} />
                  <input type="text" placeholder="https://..." value={ex.url || ""}
                    onChange={ev => { const novo = [...extrasEntidade]; novo[i] = { ...novo[i], url: ev.target.value }; setExtrasEntidade(novo) }}
                    style={{ flex: 1, padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
                  <button onClick={() => setExtrasEntidade(extrasEntidade.filter((_, idx) => idx !== i))}
                    style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "16px", padding: "10px 4px" }} title="Remover">✕</button>
                </div>
              ))}
              <button onClick={() => setExtrasEntidade([...extrasEntidade, { label: "", url: "" }])}
                style={{ background: "none", border: "1px dashed #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}>
                + Adicionar link
              </button>
            </div>

            {campoEntidade("Formação (opcional)", "formacao")}
            {campoEntidade("Contato para contratação (opcional)", "contato")}
            {campoEntidade("Destaques (separados por vírgula, opcional)", "destaques", true, "ex: Wicked, O Fantasma da Ópera")}

            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="checkbox" id="publicadoEntidade" checked={formEntidade.publicado === true}
                onChange={ev => setFormEntidade(prev => ({ ...prev, publicado: ev.target.checked }))}
                style={{ width: "18px", height: "18px", cursor: "pointer" }} />
              <label htmlFor="publicadoEntidade" style={{ fontSize: "14px", color: "#333", cursor: "pointer" }}>
                Publicado (visível na página). Desmarque para deixar como rascunho.
              </label>
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button className="btn-comentar" onClick={salvarEntidade}>
                {editandoEntidadeId ? "Salvar alterações" : "Criar entidade"}
              </button>
              <button className="btn-sair" onClick={limparFormEntidade}>
                {editandoEntidadeId ? "Cancelar edição" : "Limpar"}
              </button>
            </div>
          </div>

          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", marginBottom: "12px" }}>Entidades cadastradas</h2>
          {entidades.length === 0 ? (
            <p style={{ color: "#888" }}>Nenhuma entidade cadastrada ainda.</p>
          ) : (
            entidades.map(e => (
              <div key={e.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "16px" }}>
                {e.imagem ? (
                  <img src={e.imagem} alt={e.nome} style={{ width: "56px", height: "56px", objectFit: e.tipoImagem === "logo" ? "contain" : "cover", borderRadius: "8px", flexShrink: 0, background: "#fafafa", border: "1px solid #f0f0f0" }} />
                ) : (
                  <div style={{ width: "56px", height: "56px", background: "#f0f0f0", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: "20px" }}>🎭</div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", fontWeight: "700", marginBottom: "2px" }}>
                    {e.nome} {!e.publicado && <span style={{ fontSize: "11px", fontWeight: "600", color: "#cc7a00", background: "#fff3e0", borderRadius: "4px", padding: "2px 6px", marginLeft: "6px" }}>rascunho</span>}
                  </p>
                  <p style={{ fontSize: "13px", color: "#888", textTransform: "capitalize" }}>{e.tipo}</p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
                  <button className="btn-comentar" onClick={() => navigate(`/pessoa/${encodeURIComponent(e.nome)}`)}>Ver</button>
                  <button onClick={() => editarEntidade(e)}
                    style={{ background: "transparent", color: "#888", border: "1px solid #ccc", borderRadius: "6px", padding: "7px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer" }}>✏️ Editar</button>
                  <button onClick={() => deletarEntidade(e.id, e.nome)}
                    style={{ background: "transparent", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "6px", padding: "7px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer" }}>Deletar</button>
                </div>
              </div>
            ))
          )}
        </>
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
