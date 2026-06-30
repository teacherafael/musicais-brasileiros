import { useEffect, useState, useCallback } from "react"
import { collection, getDocs, query, doc, setDoc, deleteDoc, getDoc, addDoc, serverTimestamp, where, updateDoc, increment } from "firebase/firestore"
import { db, auth, provider } from "../firebase"
import { useParams, useNavigate } from "react-router-dom"
import { onAuthStateChanged, reauthenticateWithPopup } from "firebase/auth"
import { ehAdmin } from "../admins"
import CardMusical from "../components/CardMusical"
import html2canvas from "html2canvas"

function SeloVerificado() {
  return (
    <span title="Usuário verificado" style={{ marginLeft: "6px", verticalAlign: "middle", display: "inline-flex" }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#1D9BF0" />
        <path d="M7 13l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function Perfil() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [usuarioLogado, setUsuarioLogado] = useState(null)
  const [votos, setVotos] = useState([])
  const [comentarios, setComentarios] = useState([])
  const [queroVer, setQueroVer] = useState([])
  const [jaVi, setJaVi] = useState([])
  const [musicais, setMusicais] = useState({})
  const [nomeUsuario, setNomeUsuario] = useState("")
  const [fotoUsuario, setFotoUsuario] = useState("")
  const [carregando, setCarregando] = useState(true)
  const [top3, setTop3] = useState([])
  const [avaliacoesPublicas, setAvaliacoesPublicas] = useState(true)
const [reacoesPublicas, setReacoesPublicas] = useState(true)
  const [editandoTop3, setEditandoTop3] = useState(false)
  const [top3Selecionado, setTop3Selecionado] = useState([])
  const [buscaTop3, setBuscaTop3] = useState("")
  const [verificado, setVerificado] = useState(false)
  const [banido, setBanido] = useState(false)
  const [processandoConta, setProcessandoConta] = useState(false)

  const [seguindo, setSeguindo] = useState([])
  const [seguidores, setSeguidores] = useState([])
  const [jaSigo, setJaSigo] = useState(false)
  const [carregandoSeguir, setCarregandoSeguir] = useState(false)

  const [mostrarSeguidores, setMostrarSeguidores] = useState(false)
  const [mostrarSeguindo, setMostrarSeguindo] = useState(false)

  const [sessoesPorMusical, setSessoesPorMusical] = useState({})
  const [sessoesExpandidas, setSessoesExpandidas] = useState({})
  const [tabAtiva, setTabAtiva] = useState("avaliacoes")

  // Filtro da aba "Já vi"
  const [filtroJaVi, setFiltroJaVi] = useState("todos") // "todos" | "sem-avaliacao"

  // Redes sociais e bio
  const [redesSociais, setRedesSociais] = useState({ instagram: "", tiktok: "", x: "", site: "" })
  const [bio, setBio] = useState("")
  const [editandoRedes, setEditandoRedes] = useState(false)
  const [redesTemp, setRedesTemp] = useState({ instagram: "", tiktok: "", x: "", site: "" })
  const [bioTemp, setBioTemp] = useState("")

  // Mensagem
  const [enviandoMensagem, setEnviandoMensagem] = useState(false)

  // Listas personalizadas DO DONO DO PERFIL (exibidas na aba "Listas")
  const [listas, setListas] = useState([]) // [{ id, nome, itens:[] }]
  const [editandoListaId, setEditandoListaId] = useState(null)
  const [editandoListaNome, setEditandoListaNome] = useState("")

  // ── Estado para a barra de cartaz (Já vi / Quero ver / + Listas) ──
  // Sempre referente a QUEM ESTÁ LOGADO, não ao dono do perfil.
  const [jaViSet, setJaViSet] = useState(new Set())
  const [queroVerSet, setQueroVerSet] = useState(new Set())
  const [minhasListas, setMinhasListas] = useState([])              // listas de quem está logado
  const [musicaisNasListas, setMusicaisNasListas] = useState({})    // {musicalId: Set(listaId)}
  const [dropdownCardAberto, setDropdownCardAberto] = useState(null)
  const [toast, setToast] = useState(null)
  const [reacoesUsuario, setReacoesUsuario] = useState({ gostei: [], naoGostei: [] })
  const [verMaisGostei, setVerMaisGostei] = useState(false)
  const [verMaisNaoGostei, setVerMaisNaoGostei] = useState(false)

  function mostrarToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuarioLogado(user))
  }, [])

  useEffect(() => {
    async function buscarDados() {
      try {
        const [musicaisSnap, queroVerSnap, jaViSnap, top3Snap, seguindoSnap, seguidoresSnap, usuarioDoc, sessoesSnap] = await Promise.all([
          getDocs(collection(db, "musicais")),
          getDocs(collection(db, "usuarios", userId, "queroVer")),
          getDocs(collection(db, "usuarios", userId, "jaVi")),
          getDocs(collection(db, "usuarios", userId, "top3")),
          getDocs(collection(db, "usuarios", userId, "seguindo")),
          getDocs(collection(db, "usuarios", userId, "seguidores")),
          getDoc(doc(db, "usuarios", userId)),
          getDocs(collection(db, "usuarios", userId, "sessoesAssistidas"))
        ])

        const musicaisMap = {}
        musicaisSnap.docs.forEach(d => {
          musicaisMap[d.id] = { id: d.id, ...d.data() }
        })
        setMusicais(musicaisMap)

        const musicalIds = Object.keys(musicaisMap)

        // Comentários continuam com leitura pública.
        const todosComentarios = await Promise.all(
          musicalIds.map(id => getDocs(query(collection(db, "musicais", id, "comentarios"))))
        )

        const comentariosEncontrados = []
        let nomeEncontrado = ""
        todosComentarios.forEach((snap, i) => {
          const musicalId = musicalIds[i]
          snap.docs.forEach(d => {
            const dados = d.data()
            if (dados.userId === userId) {
              if (!nomeEncontrado && dados.nome) nomeEncontrado = dados.nome
              comentariosEncontrados.push({ id: d.id, musicalId, ...dados })
            }
          })
        })

        if (nomeEncontrado) setNomeUsuario(nomeEncontrado)

        const top3Lista = top3Snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.ordem - b.ordem)

        setTop3(top3Lista)
        setComentarios(comentariosEncontrados)
        setQueroVer(queroVerSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setJaVi(jaViSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setSeguindo(seguindoSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setSeguidores(seguidoresSnap.docs.map(d => ({ id: d.id, ...d.data() })))

        if (usuarioDoc.exists()) {
          const data = usuarioDoc.data()
          setAvaliacoesPublicas(data.avaliacoesPublicas ?? true)
setReacoesPublicas(data.reacoesPublicas ?? true)
          setVerificado(data.verificado ?? false)
          setBanido(data.banido ?? false)
          if (data.nome) setNomeUsuario(data.nome)
          if (data.foto) setFotoUsuario(data.foto)
          setRedesSociais({
            instagram: data.instagram || "",
            tiktok: data.tiktok || "",
            x: data.x || "",
            site: data.site || "",
          })
          setBio(data.bio || "")
        }

        const sessoesPorId = {}
        sessoesSnap.docs.forEach(d => {
          const s = { id: d.id, ...d.data() }
          if (!sessoesPorId[s.musicalId]) sessoesPorId[s.musicalId] = []
          sessoesPorId[s.musicalId].push(s)
        })
        Object.keys(sessoesPorId).forEach(mid => {
          sessoesPorId[mid].sort((a, b) => {
            const da = a.data + (a.horario || "")
            const db2 = b.data + (b.horario || "")
            return da > db2 ? -1 : 1
          })
        })
        setSessoesPorMusical(sessoesPorId)

        // Reações do usuário (gostei / não gostei)
        try {
          const reacoesSnap = await getDocs(collection(db, "usuarios", userId, "reacoes"))
          const gostei = []
          const naoGostei = []
          reacoesSnap.docs.forEach(d => {
            const dados = d.data()
            const item = { musicalId: d.id, titulo: dados.titulo || d.id, capa: dados.capa || "" }
            if (dados.reacao === "gostei") gostei.push(item)
            else if (dados.reacao === "nao_gostei") naoGostei.push(item)
          })
          setReacoesUsuario({ gostei, naoGostei })
        } catch (e) {
          console.error("Erro ao carregar reações:", e)
        }

        // Listas personalizadas DO DONO DO PERFIL (aba "Listas")
        const listasSnap = await getDocs(collection(db, "usuarios", userId, "listas"))
        const listasDados = await Promise.all(
          listasSnap.docs.map(async listaDoc => {
            const itensSnap = await getDocs(collection(db, "usuarios", userId, "listas", listaDoc.id, "itens"))
            const itens = itensSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            return { id: listaDoc.id, nome: listaDoc.data().nome, itens }
          })
        )
        setListas(listasDados)
      } catch (e) {
        // Nunca deixa a página presa em "Carregando..." se alguma leitura falhar.
        console.error("Erro ao carregar perfil:", e)
      } finally {
        setCarregando(false)
      }
    }

    buscarDados()
  }, [userId])

  // ── Carrega o "já vi", "quero ver" e as listas de QUEM ESTÁ LOGADO ──
  // É o que alimenta a barra de cartaz, independente de qual perfil você está vendo.
  useEffect(() => {
    async function carregarMeuEstado() {
      if (!usuarioLogado) {
        setJaViSet(new Set()); setQueroVerSet(new Set()); setMinhasListas([]); setMusicaisNasListas({})
        return
      }
      const uid = usuarioLogado.uid
      try {
        const [jvSnap, qvSnap, listasSnap] = await Promise.all([
          getDocs(collection(db, "usuarios", uid, "jaVi")),
          getDocs(collection(db, "usuarios", uid, "queroVer")),
          getDocs(collection(db, "usuarios", uid, "listas")),
        ])
        setJaViSet(new Set(jvSnap.docs.map(d => d.id)))
        setQueroVerSet(new Set(qvSnap.docs.map(d => d.id)))

        const listasDados = listasSnap.docs.map(d => ({ id: d.id, nome: d.data().nome }))
        setMinhasListas(listasDados)
        const mapa = {}
        for (const lista of listasDados) {
          const itensSnap = await getDocs(collection(db, "usuarios", uid, "listas", lista.id, "itens"))
          itensSnap.docs.forEach(d => {
            if (!mapa[d.id]) mapa[d.id] = new Set()
            mapa[d.id].add(lista.id)
          })
        }
        setMusicaisNasListas(mapa)
      } catch (e) {
        console.error("Erro ao carregar seu estado:", e)
      }
    }
    carregarMeuEstado()
  }, [usuarioLogado])

  // Votos PRIVADOS (Fase 2): só o dono lê o próprio voto.
  useEffect(() => {
    async function carregarMeusVotos() {
      if (!usuarioLogado || usuarioLogado.uid !== userId) {
        setVotos([])
        return
      }
      const candidatos = jaVi.map(item => item.id)
      if (candidatos.length === 0) {
        setVotos([])
        return
      }
      try {
        const snaps = await Promise.all(
          candidatos.map(mid =>
            getDoc(doc(db, "musicais", mid, "votos", userId)).catch(() => null)
          )
        )
        const encontrados = []
        snaps.forEach((snap, i) => {
          if (snap && snap.exists()) {
            encontrados.push({ musicalId: candidatos[i], estrelas: snap.data().estrelas })
          }
        })
        setVotos(encontrados)
      } catch (e) {
        console.error("Erro ao carregar avaliações:", e)
        setVotos([])
      }
    }
    carregarMeusVotos()
  }, [usuarioLogado, userId, jaVi])

  // Fecha o dropdown de listas do cartaz ao clicar fora
  useEffect(() => {
    if (!dropdownCardAberto) return
    function handler(e) {
      if (e.target.closest("[data-listas-dropdown]")) return
      if (e.target.closest(`[data-btn-listas="${dropdownCardAberto}"]`)) return
      setDropdownCardAberto(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [dropdownCardAberto])

  useEffect(() => {
    async function verificarSeguindo() {
      if (!usuarioLogado || usuarioLogado.uid === userId) return
      const ref = doc(db, "usuarios", usuarioLogado.uid, "seguindo", userId)
      const snap = await getDoc(ref)
      setJaSigo(snap.exists())
    }
    verificarSeguindo()
  }, [usuarioLogado, userId])

  // ── Handlers da barra de cartaz (gravam sempre na conta de quem está logado) ──
  const handleToggleJaVi = useCallback(async (e, musical) => {
    e.preventDefault(); e.stopPropagation()
    if (!usuarioLogado) return mostrarToast("Faça login para usar esta função.")
    const uid = usuarioLogado.uid
    const refJaVi = doc(db, "usuarios", uid, "jaVi", musical.id)
    const refQueroVer = doc(db, "usuarios", uid, "queroVer", musical.id)
    const mRef = doc(db, "musicais", musical.id)
    if (jaViSet.has(musical.id)) {
      await deleteDoc(refJaVi)
      try { await updateDoc(mRef, { popularidade: increment(-1) }) } catch (err) { console.error("popularidade", err) }
      setJaViSet(prev => { const next = new Set(prev); next.delete(musical.id); return next })
    } else {
      const entrandoNaContagem = !queroVerSet.has(musical.id)
      await setDoc(refJaVi, { musicalId: musical.id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" })
      await deleteDoc(refQueroVer)
      if (entrandoNaContagem) {
        try { await updateDoc(mRef, { popularidade: increment(1) }) } catch (err) { console.error("popularidade", err) }
      }
      setJaViSet(prev => new Set(prev).add(musical.id))
      setQueroVerSet(prev => { const next = new Set(prev); next.delete(musical.id); return next })
    }
  }, [usuarioLogado, jaViSet, queroVerSet])

  const handleToggleQueroVer = useCallback(async (e, musical) => {
    e.preventDefault(); e.stopPropagation()
    if (!usuarioLogado) return mostrarToast("Faça login para usar esta função.")
    const uid = usuarioLogado.uid
    const refQueroVer = doc(db, "usuarios", uid, "queroVer", musical.id)
    const refJaVi = doc(db, "usuarios", uid, "jaVi", musical.id)
    const mRef = doc(db, "musicais", musical.id)
    if (queroVerSet.has(musical.id)) {
      await deleteDoc(refQueroVer)
      try { await updateDoc(mRef, { popularidade: increment(-1) }) } catch (err) { console.error("popularidade", err) }
      setQueroVerSet(prev => { const next = new Set(prev); next.delete(musical.id); return next })
    } else {
      const entrandoNaContagem = !jaViSet.has(musical.id)
      await setDoc(refQueroVer, { musicalId: musical.id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" })
      await deleteDoc(refJaVi)
      if (entrandoNaContagem) {
        try { await updateDoc(mRef, { popularidade: increment(1) }) } catch (err) { console.error("popularidade", err) }
      }
      setQueroVerSet(prev => new Set(prev).add(musical.id))
      setJaViSet(prev => { const next = new Set(prev); next.delete(musical.id); return next })
    }
  }, [usuarioLogado, queroVerSet, jaViSet])

  const handleAbrirDropdown = useCallback((e, musicalId) => {
    e.preventDefault(); e.stopPropagation()
    if (!usuarioLogado) return mostrarToast("Faça login para usar listas.")
    setDropdownCardAberto(prev => prev === musicalId ? null : musicalId)
  }, [usuarioLogado])

  const handleToggleNaLista = useCallback(async (e, musical, listaId) => {
    e.preventDefault(); e.stopPropagation()
    const uid = usuarioLogado.uid
    const ref = doc(db, "usuarios", uid, "listas", listaId, "itens", musical.id)
    const jaEsta = musicaisNasListas[musical.id]?.has(listaId)
    if (jaEsta) {
      await deleteDoc(ref)
      setMusicaisNasListas(prev => {
        const novo = { ...prev }
        const set = new Set(novo[musical.id])
        set.delete(listaId)
        novo[musical.id] = set
        return novo
      })
    } else {
      await setDoc(ref, { musicalId: musical.id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "", adicionadoEm: serverTimestamp() })
      setMusicaisNasListas(prev => {
        const novo = { ...prev }
        const set = new Set(novo[musical.id] || [])
        set.add(listaId)
        novo[musical.id] = set
        return novo
      })
    }
    // Se estou no MEU perfil, mantém a aba "Listas" em sincronia
    if (usuarioLogado.uid === userId) {
      setListas(prev => prev.map(l => {
        if (l.id !== listaId) return l
        const jaEstaNaAba = l.itens.some(i => i.id === musical.id)
        if (jaEsta && jaEstaNaAba) return { ...l, itens: l.itens.filter(i => i.id !== musical.id) }
        if (!jaEsta && !jaEstaNaAba) return { ...l, itens: [...l.itens, { id: musical.id, musicalId: musical.id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" }] }
        return l
      }))
    }
  }, [usuarioLogado, musicaisNasListas, userId])

  const handleCriarLista = useCallback(async (e, musical, nome, onDone) => {
    e.preventDefault(); e.stopPropagation()
    const nomeLimpo = nome.trim()
    if (!nomeLimpo) return
    const uid = usuarioLogado.uid
    const listaRef = await addDoc(collection(db, "usuarios", uid, "listas"), { nome: nomeLimpo, criadaEm: serverTimestamp(), publica: true })
    const listaId = listaRef.id
    await setDoc(doc(db, "usuarios", uid, "listas", listaId, "itens", musical.id), {
      musicalId: musical.id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "", adicionadoEm: serverTimestamp()
    })
    setMinhasListas(prev => [...prev, { id: listaId, nome: nomeLimpo }])
    setMusicaisNasListas(prev => {
      const novo = { ...prev }
      const set = new Set(novo[musical.id] || [])
      set.add(listaId)
      novo[musical.id] = set
      return novo
    })
    if (usuarioLogado.uid === userId) {
      setListas(prev => [...prev, { id: listaId, nome: nomeLimpo, publica: true, itens: [{ id: musical.id, musicalId: musical.id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" }] }])
    }
    onDone()
    mostrarToast(`Adicionado a "${nomeLimpo}"`)
  }, [usuarioLogado, userId])

  // Props compartilhadas passadas a cada CardMusical
  const cardProps = {
    usuario: usuarioLogado,
    jaViSet, queroVerSet,
    listas: minhasListas,
    musicaisNasListas,
    onToggleJaVi: handleToggleJaVi,
    onToggleQueroVer: handleToggleQueroVer,
    onAbrirDropdown: handleAbrirDropdown,
    onToggleNaLista: handleToggleNaLista,
    onCriarLista: handleCriarLista,
  }

  async function toggleSeguir() {
    if (!usuarioLogado) return mostrarToast("Faça login para seguir alguém.")
    setCarregandoSeguir(true)
    const refMeuSeguindo = doc(db, "usuarios", usuarioLogado.uid, "seguindo", userId)
    const refSeguidorDele = doc(db, "usuarios", userId, "seguidores", usuarioLogado.uid)
    if (jaSigo) {
      await Promise.all([deleteDoc(refMeuSeguindo), deleteDoc(refSeguidorDele)])
      setJaSigo(false)
      setSeguidores(prev => prev.filter(s => s.id !== usuarioLogado.uid))
    } else {
      const dadosAlvo = { userId, nome: nomeUsuario || "Usuario", foto: fotoUsuario || "" }
      const meusDados = { userId: usuarioLogado.uid, nome: usuarioLogado.displayName || "Usuario", foto: usuarioLogado.photoURL || "" }
      await Promise.all([setDoc(refMeuSeguindo, dadosAlvo), setDoc(refSeguidorDele, meusDados)])
      setJaSigo(true)
      setSeguidores(prev => [...prev, { id: usuarioLogado.uid, ...meusDados }])
      try {
        await addDoc(collection(db, "notificacoes", userId, "itens"), {
          tipo: "seguidor",
          de: usuarioLogado.displayName || "Alguém",
          texto: `${usuarioLogado.displayName || "Alguém"} começou a seguir você`,
          link: `/perfil/${usuarioLogado.uid}`,
          lida: false,
          data: serverTimestamp(),
        })
      } catch (e) {}
    }
    setCarregandoSeguir(false)
  }

  async function enviarMensagem() {
    if (!usuarioLogado) return mostrarToast("Faça login para enviar mensagens.")
    setEnviandoMensagem(true)
    const conversasSnap = await getDocs(
      query(collection(db, "conversas"), where("participantes", "array-contains", usuarioLogado.uid))
    )
    const conversaExistente = conversasSnap.docs.find(d => d.data().participantes.includes(userId))
    if (conversaExistente) {
      navigate(`/mensagens/${conversaExistente.id}`)
    } else {
      const novaConversa = await addDoc(collection(db, "conversas"), {
        participantes: [usuarioLogado.uid, userId],
        ultimaMensagem: "",
        ultimaMensagemData: serverTimestamp(),
        naoLidas: { [usuarioLogado.uid]: 0, [userId]: 0 },
      })
      navigate(`/mensagens/${novaConversa.id}`)
    }
    setEnviandoMensagem(false)
  }

  async function salvarRedesSociais() {
    const dados = { ...redesTemp, bio: bioTemp.slice(0, 200) }
    await setDoc(doc(db, "usuarios", userId), dados, { merge: true })
    setRedesSociais(redesTemp)
    setBio(bioTemp.slice(0, 200))
    setEditandoRedes(false)
  }

  async function salvarTop3() {
    const snap = await getDocs(collection(db, "usuarios", userId, "top3"))
    for (const d of snap.docs) await deleteDoc(d.ref)
    for (let i = 0; i < top3Selecionado.length; i++) {
      const m = musicais[top3Selecionado[i]]
      if (m) {
        await setDoc(doc(db, "usuarios", userId, "top3", m.id), {
          musicalId: m.id, titulo: m.titulo, capa: m.capa || null, direcao: m.direcao || "", ordem: i
        })
      }
    }
    const novoTop3 = top3Selecionado.map((id, i) => ({ id, musicalId: id, ordem: i, ...musicais[id] })).filter(Boolean)
    setTop3(novoTop3)
    setEditandoTop3(false)
    setBuscaTop3("")
  }

  function toggleTop3(musicalId) {
    if (top3Selecionado.includes(musicalId)) {
      setTop3Selecionado(prev => prev.filter(id => id !== musicalId))
    } else {
      if (top3Selecionado.length >= 5) return mostrarToast("Você já selecionou 5 musicais.")
      setTop3Selecionado(prev => {
        const novo = [...prev]
        const primeiroVazio = [0, 1, 2, 3, 4].find(i => !novo[i])
        if (primeiroVazio !== undefined) novo[primeiroVazio] = musicalId
        else novo.push(musicalId)
        return novo
      })
    }
  }

  async function toggleAvaliacoesPublicas() {
    const novo = !avaliacoesPublicas
    setAvaliacoesPublicas(novo)
    await setDoc(doc(db, "usuarios", userId), { avaliacoesPublicas: novo }, { merge: true })
  }

  async function toggleReacoesPublicas() {
  const novo = !reacoesPublicas
  setReacoesPublicas(novo)
  await setDoc(doc(db, "usuarios", userId), { reacoesPublicas: novo }, { merge: true })
}

async function toggleVerificado() {
    const novo = !verificado
    setVerificado(novo)
    await setDoc(doc(db, "usuarios", userId), { verificado: novo }, { merge: true })
  }

  // ===== Banimento (admin, perfil de outra pessoa) =====
  async function toggleBanir() {
    const novo = !banido
    if (novo && !window.confirm(`Banir ${nomeUsuario || "este usuário"}? Isso apaga todos os comentários dele e bloqueia novas ações (votar, comentar, seguir, listas).`)) return
    if (!novo && !window.confirm(`Desbanir ${nomeUsuario || "este usuário"}?`)) return

    setProcessandoConta(true)
    try {
      await setDoc(doc(db, "usuarios", userId), { banido: novo, banidoEm: novo ? serverTimestamp() : null }, { merge: true })
      setBanido(novo)

      if (novo) {
        for (const c of comentarios) {
          try { await deleteDoc(doc(db, "comentarios", c.id)) } catch (e) {}
          try { await deleteDoc(doc(db, "musicais", c.musicalId, "comentarios", c.id)) } catch (e) {}
        }
        setComentarios([])

        try {
          const ativSnap = await getDocs(query(collection(db, "atividades"), where("userId", "==", userId)))
          for (const d of ativSnap.docs) await deleteDoc(d.ref)
        } catch (e) {}
      }
    } catch (e) {
      mostrarToast("Erro ao atualizar o banimento. Tente novamente.")
    }
    setProcessandoConta(false)
  }

  // ===== Autodeleção de conta (dono do perfil) =====
  async function deletarPropriaConta() {
    if (!usuarioLogado || usuarioLogado.uid !== userId) return
    if (!window.confirm("Tem certeza que quer deletar sua conta? Suas avaliações, listas, comentários e mensagens serão apagados permanentemente.")) return
    if (!window.confirm("Última confirmação: essa ação não pode ser desfeita. Deletar mesmo assim?")) return

    setProcessandoConta(true)

    try {
      await reauthenticateWithPopup(usuarioLogado, provider)
    } catch (e) {
      mostrarToast("Não foi possível confirmar sua identidade. Tente novamente.")
      setProcessandoConta(false)
      return
    }

    try {
      // 1. Apaga votos e corrige totalVotos/somaEstrelas/distribuicao de cada musical
      for (const v of votos) {
        try {
          await deleteDoc(doc(db, "musicais", v.musicalId, "votos", userId))
          const mRef = doc(db, "musicais", v.musicalId)
          const mSnap = await getDoc(mRef)
          if (mSnap.exists()) {
            const m = mSnap.data()
            const totalVotos = Math.max(0, (Number(m.totalVotos) || 0) - 1)
            const somaEstrelas = Math.max(0, (Number(m.somaEstrelas) || 0) - Number(v.estrelas))
            const dadosUpdate = { totalVotos, somaEstrelas }
            if (m.distribuicao) {
              const faixa = String(Math.floor(Number(v.estrelas)))
              const distribuicao = { ...m.distribuicao }
              if (distribuicao[faixa]) distribuicao[faixa] = Math.max(0, Number(distribuicao[faixa]) - 1)
              dadosUpdate.distribuicao = distribuicao
            }
            await updateDoc(mRef, dadosUpdate)
          }
        } catch (e) {}
      }

      // 2. Anonimiza comentários (mantém texto, data e reações)
      for (const c of comentarios) {
        const dadosAnon = { nome: "Usuário removido", userId: null, foto: "" }
        try { await updateDoc(doc(db, "comentarios", c.id), dadosAnon) } catch (e) {}
        try { await updateDoc(doc(db, "musicais", c.musicalId, "comentarios", c.id), dadosAnon) } catch (e) {}
      }

      // 3. Apaga subcoleções do usuário.
      for (const sub of ["jaVi", "queroVer"]) {
        const snap = await getDocs(collection(db, "usuarios", userId, sub))
        for (const d of snap.docs) {
          const musicalId = d.data().musicalId || d.id
          try { await updateDoc(doc(db, "musicais", musicalId), { popularidade: increment(-1) }) } catch (e) {}
          await deleteDoc(d.ref)
        }
      }
      for (const sub of ["top3", "sessoesAssistidas"]) {
        const snap = await getDocs(collection(db, "usuarios", userId, sub))
        for (const d of snap.docs) await deleteDoc(d.ref)
      }

      // 3b. Apaga listas personalizadas e seus itens (subcoleção aninhada)
      try {
        const listasSnap = await getDocs(collection(db, "usuarios", userId, "listas"))
        for (const listaDoc of listasSnap.docs) {
          const itensSnap = await getDocs(collection(db, "usuarios", userId, "listas", listaDoc.id, "itens"))
          for (const item of itensSnap.docs) await deleteDoc(item.ref)
          await deleteDoc(listaDoc.ref)
        }
      } catch (e) {}

      // 3c. Apaga reações (espelho no usuário + cópia em cada musical)
      try {
        const reacoesSnap = await getDocs(collection(db, "usuarios", userId, "reacoes"))
        for (const r of reacoesSnap.docs) {
          try { await deleteDoc(doc(db, "musicais", r.id, "reacoes", userId)) } catch (e) {}
          await deleteDoc(r.ref)
        }
      } catch (e) {}

      // 4. Desfaz relações de seguir nos dois lados
      for (const s of seguindo) {
        try { await deleteDoc(doc(db, "usuarios", userId, "seguindo", s.id)) } catch (e) {}
        try { await deleteDoc(doc(db, "usuarios", s.id, "seguidores", userId)) } catch (e) {}
      }
      for (const s of seguidores) {
        try { await deleteDoc(doc(db, "usuarios", userId, "seguidores", s.id)) } catch (e) {}
        try { await deleteDoc(doc(db, "usuarios", s.id, "seguindo", userId)) } catch (e) {}
      }

      // 5. Apaga atividades do feed
      try {
        const ativSnap = await getDocs(query(collection(db, "atividades"), where("userId", "==", userId)))
        for (const d of ativSnap.docs) await deleteDoc(d.ref)
      } catch (e) {}

      // 6. Apaga notificações
      try {
        const notifSnap = await getDocs(collection(db, "notificacoes", userId, "itens"))
        for (const d of notifSnap.docs) await deleteDoc(d.ref)
      } catch (e) {}

      // 7. Apaga conversas em que participa
      try {
        const conversasSnap = await getDocs(query(collection(db, "conversas"), where("participantes", "array-contains", userId)))
        for (const d of conversasSnap.docs) {
          const msgsSnap = await getDocs(collection(db, "conversas", d.id, "mensagens"))
          for (const msg of msgsSnap.docs) await deleteDoc(msg.ref)
          await deleteDoc(d.ref)
        }
      } catch (e) {}

      // 8. Apaga o documento de usuário
      await deleteDoc(doc(db, "usuarios", userId))

      // 9. Apaga a conta no Firebase Auth
      await usuarioLogado.delete()

      navigate("/")
    } catch (e) {
      mostrarToast("Algo deu errado ao deletar a conta. Tente novamente ou entre em contato pelo formulário da Home.")
      setProcessandoConta(false)
    }
  }

  function toggleSessoes(musicalId) {
    setSessoesExpandidas(prev => ({ ...prev, [musicalId]: !prev[musicalId] }))
  }

  function formatarData(dataStr) {
    if (!dataStr) return ""
    const [ano, mes, dia] = dataStr.split("-")
    return `${dia}/${mes}/${ano}`
  }

  function labelChip(s) {
    let label = formatarData(s.data)
    if (s.horario) label += ` · ${s.horario}`
    if (s.teatro) label += ` · ${s.teatro}`
    if (s.assento) label += ` · ${s.assento}`
    return label
  }

  function normalizarUrlSite(url) {
    if (!url) return ""
    if (/^https?:\/\//i.test(url)) return url
    return `https://${url}`
  }

  async function gerarCardPerfil() {
    const el = document.getElementById("card-perfil-exportar")
    if (!el) return
    el.style.display = "flex"
    try {
      const canvas = await html2canvas(el, {
        useCORS: true,
        backgroundColor: null,
        scale: 2,
      })

      // gera um Blob a partir do canvas (necessário para o compartilhamento nativo)
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )
      if (!blob) return

      const arquivo = new File([blob], `mcdb-${nomePerfil || "perfil"}.png`, {
        type: "image/png",
      })

      // se o navegador suporta compartilhar arquivos → abre a folha nativa (Instagram, etc.)
      if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        try {
          await navigator.share({ files: [arquivo] })
        } catch (err) {
          if (err.name !== "AbortError") console.error(err) // ignora cancelamento
        }
      } else {
        // fallback: download tradicional (desktop e navegadores sem suporte)
        const link = document.createElement("a")
        link.download = `mcdb-${nomePerfil || "perfil"}.png`
        link.href = canvas.toDataURL("image/png")
        link.click()
      }
    } finally {
      el.style.display = "none"
    }
  }

  const isProprioPerfil = usuarioLogado && usuarioLogado.uid === userId
  const isAdmin = ehAdmin(usuarioLogado)
  const nomePerfil = isProprioPerfil ? usuarioLogado.displayName : nomeUsuario
  const fotoPerfil = isProprioPerfil ? usuarioLogado.photoURL : fotoUsuario

  const mediaVotos = votos.length > 0
    ? (votos.reduce((acc, v) => acc + v.estrelas, 0) / votos.length).toFixed(1)
    : null

  const votosIds = votos.map(v => v.musicalId)
  const jaViSemAvaliacao = jaVi.filter(item => !votosIds.includes(item.musicalId))
  const jaViExibidos = (isProprioPerfil && filtroJaVi === "sem-avaliacao") ? jaViSemAvaliacao : jaVi

  if (carregando) return <main><p>Carregando...</p></main>

  const musicaisFiltradosTop3 = Object.values(musicais).filter(m =>
    m.titulo.toLowerCase().includes(buscaTop3.toLowerCase())
  )

  // Monta o objeto "musical" completo a partir de um item de lista (que tem dados resumidos)
  const musicalDoItem = (item) => {
    const id = item.musicalId || item.id
    return musicais[id] || { id, titulo: item.titulo, capa: item.capa, direcao: item.direcao }
  }

  const cardUsuario = (pessoa) => (
    <a key={pessoa.id} href={"/perfil/" + pessoa.userId}
      style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", background: "#f5f5f0" }}
    >
      {pessoa.foto
      ? <img
          src={pessoa.foto}
          alt={pessoa.nome}
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
          style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        />
      : null}
    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1a1a1a", display: pessoa.foto ? "none" : "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "600", flexShrink: 0 }}>{(pessoa.nome || "U").charAt(0).toUpperCase()}</div>
      <span style={{ fontSize: "14px", fontWeight: "500" }}>{pessoa.nome || "Usuario"}</span>
    </a>
  )

  const estiloContador = {
    background: "none", border: "none", padding: 0, fontSize: "14px", color: "#555",
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline", textDecorationColor: "#ccc"
  }

  const temRedesSociais = redesSociais.instagram || redesSociais.tiktok || redesSociais.x || redesSociais.site

  return (
    <main>
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#F5C518", padding: "12px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: "500", zIndex: 999, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}

      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>

      <div style={{ marginBottom: "32px" }}>
        {fotoPerfil && (
          <img src={fotoPerfil} alt={nomePerfil} style={{ width: "96px", height: "96px", borderRadius: "50%", marginBottom: "16px", border: "3px solid #F5C518" }} />
        )}
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
          {nomePerfil || "Usuario"}
          {verificado && <SeloVerificado />}
        </h1>
        {isProprioPerfil && <p style={{ color: "#888", fontSize: "14px" }}>Este é o seu perfil</p>}
        {banido && (
          <p style={{ color: "#cc0000", fontSize: "13px", fontWeight: "600", marginTop: "4px" }}>
            🚫 Esta conta está banida{isProprioPerfil ? " — você não pode votar, comentar, seguir ou usar listas." : "."}
          </p>
        )}

        {/* Bio */}
        {bio && (
          <p style={{ fontSize: "14px", color: "#444", marginTop: "8px", maxWidth: "480px", lineHeight: "1.5" }}>{bio}</p>
        )}

        {isAdmin && !isProprioPerfil && (
          <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
            <button onClick={toggleVerificado} style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "12px", border: "1px solid #1D9BF0", background: verificado ? "#1D9BF0" : "transparent", color: verificado ? "#fff" : "#1D9BF0", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              {verificado ? "✓ Verificado — Remover selo" : "Verificar usuário"}
            </button>
            <button onClick={toggleBanir} disabled={processandoConta}
              style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "12px", border: "1px solid #cc0000", background: banido ? "#cc0000" : "transparent", color: banido ? "#fff" : "#cc0000", cursor: processandoConta ? "not-allowed" : "pointer", opacity: processandoConta ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
              {processandoConta ? "..." : banido ? "🚫 Banido — Desbanir" : "Banir usuário"}
            </button>
          </div>
        )}

        {/* Redes sociais */}
        {(temRedesSociais || isProprioPerfil) && (
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {redesSociais.instagram && (
              <a href={`https://instagram.com/${redesSociais.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#E1306C", textDecoration: "none", background: "#fff0f5", border: "1px solid #f0c0d0", borderRadius: "99px", padding: "4px 12px" }}>
                📸 @{redesSociais.instagram.replace("@", "")}
              </a>
            )}
            {redesSociais.tiktok && (
              <a href={`https://tiktok.com/@${redesSociais.tiktok.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#1a1a1a", textDecoration: "none", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "99px", padding: "4px 12px" }}>
                🎵 @{redesSociais.tiktok.replace("@", "")}
              </a>
            )}
            {redesSociais.x && (
              <a href={`https://x.com/${redesSociais.x.replace("@", "")}`} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#1a1a1a", textDecoration: "none", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "99px", padding: "4px 12px" }}>
                𝕏 @{redesSociais.x.replace("@", "")}
              </a>
            )}
            {redesSociais.site && (
              <a href={normalizarUrlSite(redesSociais.site)} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "13px", color: "#1a1a1a", textDecoration: "none", background: "#f0f0f0", border: "1px solid #ddd", borderRadius: "99px", padding: "4px 12px" }}>
                🔗 {redesSociais.site.replace(/^https?:\/\//i, "")}
              </a>
            )}
            {isProprioPerfil && !editandoRedes && (
              <button onClick={() => { setRedesTemp({ ...redesSociais }); setBioTemp(bio); setEditandoRedes(true) }}
                style={{ background: "none", border: "1px dashed #ccc", borderRadius: "99px", padding: "4px 12px", fontSize: "12px", color: "#aaa", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                {(temRedesSociais || bio) ? "✏️ Editar perfil" : "+ Editar perfil"}
              </button>
            )}
          </div>
        )}

        {/* Formulário de redes sociais e bio */}
        {editandoRedes && (
          <div style={{ marginTop: "14px", background: "#f5f5f0", border: "1px solid #e8e8e4", borderRadius: "10px", padding: "16px", maxWidth: "360px" }}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>Bio</label>
              <textarea
                value={bioTemp}
                onChange={e => setBioTemp(e.target.value.slice(0, 200))}
                placeholder="Conte um pouco sobre você..."
                rows={3}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", resize: "vertical", boxSizing: "border-box" }}
              />
              <p style={{ fontSize: "11px", color: bioTemp.length >= 200 ? "#c0392b" : "#aaa", textAlign: "right", marginTop: "2px" }}>
                {bioTemp.length}/200
              </p>
            </div>

            {[
              { chave: "instagram", label: "Instagram", placeholder: "@seunome" },
              { chave: "tiktok", label: "TikTok", placeholder: "@seunome" },
              { chave: "x", label: "X (Twitter)", placeholder: "@seunome" },
              { chave: "site", label: "Site", placeholder: "seusite.com.br" },
            ].map(({ chave, label, placeholder }) => (
              <div key={chave} style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>{label}</label>
                <input type="text" value={redesTemp[chave]}
                  onChange={e => setRedesTemp(prev => ({ ...prev, [chave]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button className="btn-comentar" onClick={salvarRedesSociais} style={{ fontSize: "13px", padding: "7px 16px" }}>Salvar</button>
              <button className="btn-sair" onClick={() => setEditandoRedes(false)} style={{ fontSize: "13px", padding: "7px 16px" }}>Cancelar</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
          <button style={estiloContador} onClick={() => { setMostrarSeguidores(prev => !prev); setMostrarSeguindo(false) }}>
            <strong>{seguidores.length}</strong> {seguidores.length === 1 ? "seguidor" : "seguidores"}
          </button>
          <button style={estiloContador} onClick={() => { setMostrarSeguindo(prev => !prev); setMostrarSeguidores(false) }}>
            <strong>{seguindo.length}</strong> seguindo
          </button>
          {!isProprioPerfil && usuarioLogado && (
            <>
              <button onClick={toggleSeguir} disabled={carregandoSeguir}
                style={{ padding: "6px 18px", borderRadius: "20px", border: jaSigo ? "1px solid #ccc" : "none", background: jaSigo ? "transparent" : "#F5C518", color: jaSigo ? "#555" : "#1a1a1a", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: "600", cursor: carregandoSeguir ? "not-allowed" : "pointer", opacity: carregandoSeguir ? 0.6 : 1 }}>
                {carregandoSeguir ? "..." : jaSigo ? "Seguindo" : "Seguir"}
              </button>
              <button onClick={enviarMensagem} disabled={enviandoMensagem}
                style={{ padding: "6px 18px", borderRadius: "20px", border: "1px solid #e8e8e4", background: "transparent", color: "#555", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                ✉️ Mensagem
              </button>
            </>
          )}
          {isProprioPerfil && (
            <button onClick={() => navigate("/mensagens")}
              style={{ padding: "6px 18px", borderRadius: "20px", border: "1px solid #e8e8e4", background: "transparent", color: "#555", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
              ✉️ Mensagens
            </button>
          )}
        </div>

        {isProprioPerfil && (
          <button
            onClick={gerarCardPerfil}
            style={{ padding: "6px 18px", borderRadius: "20px", border: "1px solid #e8e8e4", background: "transparent", color: "#555", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: "600", cursor: "pointer", marginTop: "4px" }}>
            📷 Compartilhar card do perfil
          </button>
        )}

        {/* Card oculto para exportação — proporção Stories (9:16) */}
        <div id="card-perfil-exportar" style={{
          display: "none",
          position: "fixed", top: "-9999px", left: "-9999px",
          width: "400px",
          height: "711px",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a1a",
          fontFamily: "'DM Sans', sans-serif",
          gap: "0",
        }}>
          {/* Logo */}
          <img
            src="https://res.cloudinary.com/drk7o6h0p/image/upload/v1782171496/copy_of_mcdb_sembirlho_utr4xp.png"
            alt="MCDb"
            crossOrigin="anonymous"
            style={{ width: "120px", marginBottom: "40px" }}
          />

          {/* Foto de perfil */}
          {fotoPerfil && (
            <img
              src={fotoPerfil}
              alt={nomePerfil}
              crossOrigin="anonymous"
              style={{ width: "100px", height: "100px", borderRadius: "50%", border: "4px solid #F5C518", objectFit: "cover", marginBottom: "20px" }}
            />
          )}

          {/* Nome */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <p style={{ fontSize: "26px", fontWeight: "700", color: "#fff", margin: 0 }}>
              {nomePerfil || "Usuário"}
            </p>
            {verificado && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#1D9BF0" />
                <path d="M7 13l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          {/* Média */}
          {mediaVotos && (
            <p style={{ fontSize: "18px", color: "#F5C518", margin: "0 0 48px", fontWeight: "600" }}>
              ★ {mediaVotos} <span style={{ color: "#666", fontWeight: "400", fontSize: "14px" }}>· {votos.length} {votos.length === 1 ? "avaliação" : "avaliações"}</span>
            </p>
          )}

          {/* ME SIGA + área de link */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <p style={{ fontSize: "19px", fontWeight: "700", color: "#F5C518", letterSpacing: "3px", textTransform: "uppercase", margin: 0 }}>
              ME SIGA
            </p>
            {/* Área reservada para o selo de link do Instagram */}
            <div style={{
              width: "180px",
              height: "48px",
              borderRadius: "24px",
              border: "2px dashed #444",
              background: "#222",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span style={{ fontSize: "13px", color: "#555" }}>adicionar link</span>
            </div>
          </div>
        </div>

        {mostrarSeguidores && (
          <div style={{ marginTop: "16px", padding: "16px", border: "1px solid #e8e8e4", borderRadius: "8px", background: "#fafafa" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px", color: "#333" }}>Seguidores ({seguidores.length})</p>
            {seguidores.length === 0
              ? <p style={{ fontSize: "13px", color: "#888" }}>Nenhum seguidor ainda.</p>
              : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>{seguidores.map(cardUsuario)}</div>
            }
          </div>
        )}

        {mostrarSeguindo && (
          <div style={{ marginTop: "16px", padding: "16px", border: "1px solid #e8e8e4", borderRadius: "8px", background: "#fafafa" }}>
            <p style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px", color: "#333" }}>Seguindo ({seguindo.length})</p>
            {seguindo.length === 0
              ? <p style={{ fontSize: "13px", color: "#888" }}>Nao esta seguindo ninguem ainda.</p>
              : <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>{seguindo.map(cardUsuario)}</div>
            }
          </div>
        )}

        {votos.length > 0 && (
          <div style={{ display: "flex", gap: "16px", marginTop: "16px", flexWrap: "wrap" }}>
            <div style={{ background: "#1a1a1a", color: "#F5C518", borderRadius: "8px", padding: "10px 18px", display: "inline-flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "22px", fontWeight: "700" }}>★ {mediaVotos}</span>
              <span style={{ fontSize: "12px", color: "#888" }}>media pessoal</span>
            </div>
            <div style={{ background: "#f5f5f0", border: "1px solid #e8e8e4", borderRadius: "8px", padding: "10px 18px", display: "inline-flex", alignItems: "baseline", gap: "8px" }}>
              <span style={{ fontSize: "22px", fontWeight: "700" }}>{votos.length}</span>
              <span style={{ fontSize: "12px", color: "#888" }}>{votos.length === 1 ? "avaliacao" : "avaliacoes"}</span>
            </div>
          </div>
        )}
      </div>

      {/* NAVEGAÇÃO INTERNA — botão excluir conta acima do Top 5 */}
      {isProprioPerfil && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '0 0 8px 0' }}>
          <a href="#zona-risco" style={{ color: '#cc0000', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: '600', padding: '6px 14px', background: '#fff5f5', border: '1px solid #f0c0c0', borderRadius: '20px' }}>
            🗑 Excluir minha conta
          </a>
        </div>
      )}

      {/* TOP 5 */}
      <div id="top5" style={{ marginBottom: "40px", background: "#1a1a1a", borderRadius: "16px", padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "#F5C518", letterSpacing: "1px" }}>✦ Meu Top 5</h2>
          {isProprioPerfil && !editandoTop3 && (
            <button onClick={() => { setTop3Selecionado(top3.map(t => t.musicalId)); setEditandoTop3(true) }} style={{ background: "none", border: "none", fontSize: "13px", color: "#666", cursor: "pointer", padding: 0 }}>
              ✏️ Editar
            </button>
          )}
        </div>
        {editandoTop3 ? (
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              {[0, 1, 2, 3, 4].map(pos => {
                const id = top3Selecionado[pos]
                const m = id ? musicais[id] : null
                return (
                  <div key={pos} style={{ flex: "1 1 140px", background: "#2a2a2a", border: "2px solid #F5C518", borderRadius: "8px", padding: "8px", minHeight: "60px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ background: "#F5C518", color: "#1a1a1a", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", flexShrink: 0 }}>{pos + 1}</span>
                    {m ? (
                      <>
                        <span style={{ fontSize: "12px", color: "#fff", flex: 1, lineHeight: "1.3" }}>{m.titulo}</span>
                        <button onClick={() => setTop3Selecionado(prev => prev.filter((_, i) => i !== pos))} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "14px", padding: 0, flexShrink: 0 }}>✕</button>
                      </>
                    ) : (
                      <span style={{ fontSize: "12px", color: "#555", fontStyle: "italic" }}>vazio</span>
                    )}
                  </div>
                )
              })}
            </div>
            <p style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>Selecione até 5 musicais favoritos ({top3Selecionado.length}/5)</p>
            <input type="text" placeholder="Buscar musical..." value={buscaTop3} onChange={e => setBuscaTop3(e.target.value)}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", marginBottom: "12px" }}
            />
            <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #333", borderRadius: "8px", marginBottom: "16px" }}>
              {musicaisFiltradosTop3.map(m => (
                <div key={m.id} onClick={() => toggleTop3(m.id)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", cursor: "pointer", background: top3Selecionado.includes(m.id) ? "#2a2a1a" : "#222", borderBottom: "1px solid #333" }}
                >
                  {m.capa
                    ? <img src={m.capa} alt={m.titulo} style={{ width: "32px", height: "44px", objectFit: "cover", borderRadius: "3px", flexShrink: 0 }} />
                    : <div style={{ width: "32px", height: "44px", background: "#333", borderRadius: "3px", flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "14px", fontWeight: "500", color: "#fff" }}>{m.titulo}</p>
                    <p style={{ fontSize: "12px", color: "#666" }}>{m.direcao || "—"}</p>
                  </div>
                  {top3Selecionado.includes(m.id) && (
                    <span style={{ background: "#F5C518", color: "#1a1a1a", borderRadius: "50%", width: "20px", height: "20px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700" }}>
                      {top3Selecionado.indexOf(m.id) + 1}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-comentar" onClick={salvarTop3}>Salvar</button>
              <button className="btn-sair" onClick={() => { setEditandoTop3(false); setBuscaTop3("") }}>Cancelar</button>
            </div>
          </div>
        ) : top3.length === 0 ? (
          <p style={{ fontSize: "14px", color: "#666", fontStyle: "italic" }}>
            {isProprioPerfil ? "Clique em editar para escolher seus 5 musicais favoritos." : "Nenhum favorito definido ainda."}
          </p>
        ) : (
          <div className="top5-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "12px" }}>
            {top3.map((item, i) => (
              <a key={item.id} href={"/musical/" + item.musicalId} className="card-musical"
                style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", border: "2px solid #F5C518", padding: "8px" }}
              >
                <div style={{ position: "absolute", top: "6px", left: "6px", background: "#F5C518", color: "#1a1a1a", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", zIndex: 1 }}>
                  {i + 1}
                </div>
                <div style={{ width: "100%", aspectRatio: "2/3", marginBottom: "8px" }}>
                  {item.capa
                    ? <img src={item.capa} alt={item.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "4px" }} />
                    : <div style={{ width: "100%", height: "100%", background: "#333", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{item.titulo}</div>
                  }
                </div>
                <div style={{ width: "100%" }}>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "12px", fontWeight: "700", marginBottom: "2px", lineHeight: "1.3" }}>{item.titulo}</p>
                  <p style={{ fontSize: "11px", color: "#666" }}>Dir. {item.direcao || "—"}</p>
                </div>
              </a>
            ))}
          </div>
        )}

      </div>

      {/* ABAS — agora abaixo do Top 5, deslizáveis no mobile */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e4', marginBottom: '24px', marginTop: '32px', gap: '0', overflowX: 'auto', overflowY: 'hidden', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
        {[
          { id: 'avaliacoes', label: `Avaliações (${votos.length})` },
          ...(reacoesPublicas || isProprioPerfil ? [{ id: 'reacoes', label: `Gostei / Não gostei` }] : []),
          { id: 'ja-vi', label: `Já vi (${jaVi.length})` },
          { id: 'quero-ver', label: `Quero ver (${queroVer.length})` },
          { id: 'listas', label: `Listas (${listas.length})` },
          { id: 'sessoes', label: `Minhas Sessões` },
          { id: 'comentarios', label: `Comentários (${comentarios.length})` },
        ].map(tab => (
          <button key={tab.id} onClick={() => setTabAtiva(tab.id)} style={{
            background: 'none', border: 'none', borderBottom: tabAtiva === tab.id ? '2px solid #F5C518' : '2px solid transparent',
            marginBottom: '-2px', padding: '10px 16px', fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px', fontWeight: tabAtiva === tab.id ? '600' : '400',
            color: tabAtiva === tab.id ? '#1a1a1a' : '#888', cursor: 'pointer', whiteSpace: 'nowrap'
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TABS */}
      {tabAtiva === "avaliacoes" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
            {isProprioPerfil && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", color: "#888" }}>Suas avaliações são privadas — só você vê.</span>
              </div>
            )}
          </div>
          {isProprioPerfil ? (
            votos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: "32px", marginBottom: "8px" }}>⭐</p>
                <p style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Você ainda não avaliou nenhum musical</p>
                <p style={{ fontSize: "14px", color: "#888", marginBottom: "16px" }}>Suas notas ficam guardadas aqui, só pra você.</p>
                <a href="/" style={{ color: "#b8960a", fontWeight: "600", textDecoration: "none" }}>Explorar musicais →</a>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
                {votos.map(voto => {
                  const musical = musicais[voto.musicalId]
                  if (!musical) return null
                  return (
                    <CardMusical
                      key={voto.musicalId}
                      musical={musical}
                      dropdownAberto={dropdownCardAberto === musical.id}
                      metaExtra={<p style={{ fontSize: "12px", color: "#b8960a", fontWeight: "700", margin: 0 }}>★ {voto.estrelas}</p>}
                      {...cardProps}
                    />
                  )
                })}
              </div>
            )
          ) : (
            <p className="login-aviso">As avaliações deste usuário são privadas.</p>
          )}
        </div>
      )}

      {tabAtiva === "reacoes" && (
        <div>
          {isProprioPerfil && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", padding: "12px 16px", background: "#f5f5f0", border: "1px solid #e8e8e4", borderRadius: "8px" }}>
              <span style={{ fontSize: "13px", color: "#555", flex: 1 }}>
                {reacoesPublicas ? "Suas reações são visíveis no seu perfil público." : "Suas reações estão ocultas para outros visitantes."}
              </span>
              <button onClick={toggleReacoesPublicas} style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", border: "1px solid #e8e8e4", background: reacoesPublicas ? "#F5C518" : "transparent", color: reacoesPublicas ? "#1a1a1a" : "#888", cursor: "pointer", fontWeight: "600", whiteSpace: "nowrap" }}>
                {reacoesPublicas ? "🌐 Públicas" : "🔒 Ocultas"}
              </button>
            </div>
          )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#b8960a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>
              👍 Gostei ({reacoesUsuario.gostei.length})
            </h3>
            {reacoesUsuario.gostei.length === 0
              ? <p style={{ fontSize: "13px", color: "#888", fontStyle: "italic" }}>Nenhum ainda.</p>
              : <>
                  <ol style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(verMaisGostei ? reacoesUsuario.gostei : reacoesUsuario.gostei.slice(0, 10)).map(item => (
                      <li key={item.musicalId}>
                        <a href={"/musical/" + item.musicalId} style={{ fontSize: "14px", color: "#1a1a1a", textDecoration: "none", lineHeight: "1.4" }}
                          onMouseOver={e => e.currentTarget.style.color = "#b8960a"}
                          onMouseOut={e => e.currentTarget.style.color = "#1a1a1a"}>
                          {item.titulo || item.musicalId}
                        </a>
                      </li>
                    ))}
                  </ol>
                  {reacoesUsuario.gostei.length > 10 && (
                    <button onClick={() => setVerMaisGostei(p => !p)} style={{ marginTop: "12px", background: "none", border: "none", color: "#b8960a", fontSize: "13px", cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif", textDecoration: "underline" }}>
                      {verMaisGostei ? "Ver menos" : `Ver mais ${reacoesUsuario.gostei.length - 10} musicais`}
                    </button>
                  )}
                </>
            }
          </div>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#b8960a", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "14px" }}>
              👎 Não gostei ({reacoesUsuario.naoGostei.length})
            </h3>
            {reacoesUsuario.naoGostei.length === 0
              ? <p style={{ fontSize: "13px", color: "#888", fontStyle: "italic" }}>Nenhum ainda.</p>
              : <>
                  <ol style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {(verMaisNaoGostei ? reacoesUsuario.naoGostei : reacoesUsuario.naoGostei.slice(0, 10)).map(item => (
                      <li key={item.musicalId}>
                        <a href={"/musical/" + item.musicalId} style={{ fontSize: "14px", color: "#1a1a1a", textDecoration: "none", lineHeight: "1.4" }}
                          onMouseOver={e => e.currentTarget.style.color = "#b8960a"}
                          onMouseOut={e => e.currentTarget.style.color = "#1a1a1a"}>
                          {item.titulo || item.musicalId}
                        </a>
                      </li>
                    ))}
                  </ol>
                  {reacoesUsuario.naoGostei.length > 10 && (
                    <button onClick={() => setVerMaisNaoGostei(p => !p)} style={{ marginTop: "12px", background: "none", border: "none", color: "#b8960a", fontSize: "13px", cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif", textDecoration: "underline" }}>
                      {verMaisNaoGostei ? "Ver menos" : `Ver mais ${reacoesUsuario.naoGostei.length - 10} musicais`}
                    </button>
                  )}
                </>
            }
          </div>
        </div>
        </div>
      )}

      {tabAtiva === "ja-vi" && (
        <div>
          {isProprioPerfil && jaVi.length > 0 && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
              <button onClick={() => setFiltroJaVi("todos")}
                style={{
                  padding: "6px 16px", borderRadius: "20px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: "600",
                  border: filtroJaVi === "todos" ? "none" : "1px solid #e8e8e4",
                  background: filtroJaVi === "todos" ? "#F5C518" : "transparent",
                  color: filtroJaVi === "todos" ? "#1a1a1a" : "#555",
                  cursor: "pointer"
                }}>
                Todos ({jaVi.length})
              </button>
              <button onClick={() => setFiltroJaVi("sem-avaliacao")} disabled={jaViSemAvaliacao.length === 0}
                style={{
                  padding: "6px 16px", borderRadius: "20px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: "600",
                  border: filtroJaVi === "sem-avaliacao" ? "none" : "1px solid #e8e8e4",
                  background: filtroJaVi === "sem-avaliacao" ? "#F5C518" : "transparent",
                  color: filtroJaVi === "sem-avaliacao" ? "#1a1a1a" : (jaViSemAvaliacao.length === 0 ? "#ccc" : "#555"),
                  cursor: jaViSemAvaliacao.length === 0 ? "not-allowed" : "pointer"
                }}>
                Ainda não avaliei ({jaViSemAvaliacao.length})
              </button>
            </div>
          )}
          {jaViExibidos.length === 0 ? (
            <p className="login-aviso">
              {isProprioPerfil
                ? (filtroJaVi === "sem-avaliacao"
                    ? "Você já avaliou tudo que marcou como visto! 🎉"
                   : <span><span style={{ fontSize: "20px" }}>🎭</span><br />Você ainda não marcou nenhum musical como visto.<br /><a href="/" style={{ color: "#b8960a", fontWeight: "600", textDecoration: "none" }}>Explorar musicais →</a></span>)
                : "Este usuário ainda não marcou nenhum musical como visto."}
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
              {jaViExibidos.map(item => {
                const m = musicalDoItem(item)
                const sessoes = sessoesPorMusical[item.musicalId] || []
                const sessoesVisiveis = isProprioPerfil ? sessoes : sessoes.filter(s => s.publico)
                const temSessoes = sessoesVisiveis.length > 0
                return (
                  <CardMusical
                    key={item.id}
                    musical={m}
                    dropdownAberto={dropdownCardAberto === m.id}
                    metaExtra={
                      temSessoes
                        ? <p style={{ fontSize: "12px", color: "#888", margin: 0 }}>📅 {sessoesVisiveis.length} {sessoesVisiveis.length === 1 ? "sessão" : "sessões"}</p>
                        : <p style={{ fontSize: "12px", color: "#888", margin: 0 }}>Direção: {m.direcao || "—"}</p>
                    }
                    {...cardProps}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {tabAtiva === "quero-ver" && (
        <div>
          {queroVer.length === 0 ? (
            <p className="login-aviso">{isProprioPerfil ? <span><span style={{ fontSize: "20px" }}>🍿</span><br />Sua lista de desejos está vazia.<br /><a href="/" style={{ color: "#b8960a", fontWeight: "600", textDecoration: "none" }}>Descobrir musicais →</a></span> : "Este usuário ainda não tem musicais na lista."}</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
              {queroVer.map(item => {
                const m = musicalDoItem(item)
                return (
                  <CardMusical
                    key={item.id}
                    musical={m}
                    dropdownAberto={dropdownCardAberto === m.id}
                    metaExtra={<p style={{ fontSize: "12px", color: "#888", margin: 0 }}>Direção: {m.direcao || "—"}</p>}
                    {...cardProps}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {tabAtiva === "comentarios" && (
        <div>
          {comentarios.length === 0 ? (
            <p className="login-aviso">{isProprioPerfil ? <span><span style={{ fontSize: "20px" }}>💬</span><br />Você ainda não comentou em nenhum musical.<br /><a href="/" style={{ color: "#b8960a", fontWeight: "600", textDecoration: "none" }}>Explorar musicais →</a></span> : "Este usuário ainda não fez nenhum comentário."}</p>
          ) : (
            comentarios.map(c => {
              const musical = musicais[c.musicalId]
              return (
                <a key={c.id} href={"/musical/" + c.musicalId} className="comentario-item"
                  style={{ display: "block", textDecoration: "none", color: "inherit", cursor: "pointer" }}>
                  <p style={{ fontSize: "13px", fontWeight: "500", color: "#F5C518", marginBottom: "4px" }}>{musical?.titulo}</p>
                  <p className="comentario-texto">{c.texto}</p>
                </a>
              )
            })
          )}
        </div>
      )}

      {/* LISTAS PERSONALIZADAS (do dono do perfil) */}
      {tabAtiva === "listas" && (
        <div>
          {(() => {
            const listasVisiveis = isProprioPerfil ? listas : listas.filter(l => l.publica !== false)
            return listasVisiveis.length === 0 ? (
            <p className="login-aviso">
              {isProprioPerfil
                ? 'Você ainda não criou nenhuma lista. Use o botão "+ Listas" nos cartazes para criar.'
                : listas.length > 0 ? 'Este usuário não tem listas públicas.' : 'Este usuário ainda não criou nenhuma lista.'}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {listasVisiveis.map(lista => (
                <div key={lista.id} style={{ border: "1px solid #e8e8e4", borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "#f9f9f9", borderBottom: lista.itens.length > 0 ? "1px solid #e8e8e4" : "none" }}>
                    {isProprioPerfil && editandoListaId === lista.id ? (
                      <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                        <input
                          autoFocus
                          type="text"
                          value={editandoListaNome}
                          onChange={e => setEditandoListaNome(e.target.value)}
                          onKeyDown={async e => {
                            if (e.key === "Enter") {
                              const nome = editandoListaNome.trim()
                              if (!nome) return
                              await setDoc(doc(db, "usuarios", userId, "listas", lista.id), { nome }, { merge: true })
                              setListas(prev => prev.map(l => l.id === lista.id ? { ...l, nome } : l))
                              setEditandoListaId(null)
                            }
                            if (e.key === "Escape") setEditandoListaId(null)
                          }}
                          style={{ flex: 1, padding: "6px 10px", border: "1px solid #F5C518", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: "600", outline: "none" }}
                        />
                        <button
                          onClick={async () => {
                            const nome = editandoListaNome.trim()
                            if (!nome) return
                            await setDoc(doc(db, "usuarios", userId, "listas", lista.id), { nome }, { merge: true })
                            setListas(prev => prev.map(l => l.id === lista.id ? { ...l, nome } : l))
                            setEditandoListaId(null)
                          }}
                          style={{ background: "#F5C518", border: "none", borderRadius: "6px", padding: "6px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>
                          Salvar
                        </button>
                        <button onClick={() => setEditandoListaId(null)} style={{ background: "none", border: "1px solid #ddd", borderRadius: "6px", padding: "6px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", cursor: "pointer", color: "#888" }}>Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "17px", fontWeight: "700", margin: 0, color: "#1a1a1a" }}>{lista.nome}</p>
                          <p style={{ fontSize: "12px", color: "#888", margin: "2px 0 0" }}>{lista.itens.length} {lista.itens.length === 1 ? "musical" : "musicais"}</p>
                        </div>
                        {isProprioPerfil && (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={async () => {
                                const nova = lista.publica === false ? true : false
                                await setDoc(doc(db, "usuarios", userId, "listas", lista.id), { publica: nova }, { merge: true })
                                setListas(prev => prev.map(l => l.id === lista.id ? { ...l, publica: nova } : l))
                              }}
                              style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: "6px", padding: "5px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: lista.publica === false ? "#888" : "#5a9e6f", cursor: "pointer" }}>
                              {lista.publica === false ? "🔒 Privada" : "🌐 Pública"}
                            </button>
                            <button
                              onClick={() => { setEditandoListaId(lista.id); setEditandoListaNome(lista.nome) }}
                              style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: "6px", padding: "5px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#888", cursor: "pointer" }}>
                              ✏️ Renomear
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm(`Deletar a lista "${lista.nome}"? Os musicais não serão apagados.`)) return
                                for (const item of lista.itens) {
                                  await deleteDoc(doc(db, "usuarios", userId, "listas", lista.id, "itens", item.id))
                                }
                                await deleteDoc(doc(db, "usuarios", userId, "listas", lista.id))
                                setListas(prev => prev.filter(l => l.id !== lista.id))
                                setMinhasListas(prev => prev.filter(l => l.id !== lista.id))
                              }}
                              style={{ background: "none", border: "1px solid #f0c0c0", borderRadius: "6px", padding: "5px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#cc0000", cursor: "pointer" }}>
                              🗑 Deletar
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {lista.itens.length === 0 ? (
                    <p style={{ fontSize: "13px", color: "#aaa", padding: "16px", fontStyle: "italic" }}>Nenhum musical nesta lista ainda.</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "12px", padding: "16px" }}>
                      {lista.itens.map(item => {
                        const m = musicalDoItem(item)
                        return (
                          <CardMusical
                            key={item.id}
                            musical={m}
                            dropdownAberto={dropdownCardAberto === m.id}
                            esconderDirecao
                            {...cardProps}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
          })()}
        </div>
      )}

      {tabAtiva === "sessoes" && (() => {
        const musicaisComSessoes = Object.entries(sessoesPorMusical)
          .map(([mid, sessoes]) => {
            const visiveis = isProprioPerfil ? sessoes : sessoes.filter(s => s.publico)
            return { mid, sessoes: visiveis }
          })
          .filter(({ sessoes }) => sessoes.length > 0)
          .sort((a, b) => {
            const aData = a.sessoes[0].data + (a.sessoes[0].horario || "")
            const bData = b.sessoes[0].data + (b.sessoes[0].horario || "")
            return aData > bData ? -1 : 1
          })

        if (musicaisComSessoes.length === 0) return (
          <p className="login-aviso">
            {isProprioPerfil
              ? "Você ainda não registrou nenhuma sessão. Na página de um musical, marque como \"Já vi\" e clique em \"+ Adicionar sessão\"."
              : "Este usuário não tem sessões públicas."}
          </p>
        )

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {musicaisComSessoes.map(({ mid, sessoes }) => {
              const m = musicais[mid] || { id: mid, titulo: mid }
              return (
                <div key={mid} style={{ borderBottom: "1px solid #e8e8e4", padding: "14px 0" }}>
                  <a href={"/musical/" + mid} style={{ fontFamily: "'Playfair Display', serif", fontSize: "16px", fontWeight: "700", color: "#1a1a1a", textDecoration: "none" }}
                    onMouseOver={e => e.currentTarget.style.color = "#b8960a"}
                    onMouseOut={e => e.currentTarget.style.color = "#1a1a1a"}>
                    {m.titulo}
                  </a>
                  <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {sessoes.map(s => (
                      <p key={s.id} style={{ fontSize: "13px", color: "#555", margin: 0 }}>
                        • {formatarData(s.data)}{s.horario ? ` às ${s.horario}` : ""}{s.teatro ? ` · ${s.teatro}` : ""}{s.assento ? ` · 🪑 ${s.assento}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ZONA DE RISCO — apenas no próprio perfil */}
      {isProprioPerfil && (
        <div id="zona-risco" style={{ marginTop: "60px", padding: "20px", border: "1px solid #f0c0c0", borderRadius: "8px", background: "#fff5f5", scrollMarginTop: "20px" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#cc0000", marginBottom: "8px" }}>Zona de risco</p>
          <p style={{ fontSize: "13px", color: "#888", marginBottom: "12px", lineHeight: "1.5" }}>
            Deletar sua conta apaga permanentemente suas avaliações, listas ("já vi", "quero ver", top 5), conexões de seguir e mensagens. Seus comentários são mantidos, mas ficam anônimos ("Usuário removido"). Essa ação não pode ser desfeita.
          </p>
          <button onClick={deletarPropriaConta} disabled={processandoConta}
            style={{ background: "transparent", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "6px", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: processandoConta ? "not-allowed" : "pointer", opacity: processandoConta ? 0.6 : 1 }}>
            {processandoConta ? "Processando..." : "Deletar minha conta"}
          </button>
        </div>
      )}
    </main>
  )
}

export default Perfil
