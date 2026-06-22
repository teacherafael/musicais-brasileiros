import { useEffect, useState } from "react"
import { collection, getDocs, query, doc, setDoc, deleteDoc, getDoc, addDoc, serverTimestamp, where, updateDoc, increment } from "firebase/firestore"
import { db, auth, provider } from "../firebase"
import { useParams, useNavigate } from "react-router-dom"
import { onAuthStateChanged, reauthenticateWithPopup } from "firebase/auth"
import { ehAdmin } from "../admins"

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
      } catch (e) {
        // Nunca deixa a página presa em "Carregando..." se alguma leitura falhar.
        console.error("Erro ao carregar perfil:", e)
      } finally {
        setCarregando(false)
      }
    }

    buscarDados()
  }, [userId])

  // Votos agora são PRIVADOS (Fase 2): pelas regras, só o dono lê o próprio voto.
  // Por isso carregamos as avaliações só quando você está vendo o SEU perfil, lendo
  // diretamente o seu voto em cada musical da sua lista "já vi". Em perfil de outra
  // pessoa, as avaliações ficam vazias (são privadas).
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

  useEffect(() => {
    async function verificarSeguindo() {
      if (!usuarioLogado || usuarioLogado.uid === userId) return
      const ref = doc(db, "usuarios", usuarioLogado.uid, "seguindo", userId)
      const snap = await getDoc(ref)
      setJaSigo(snap.exists())
    }
    verificarSeguindo()
  }, [usuarioLogado, userId])

  async function toggleSeguir() {
    if (!usuarioLogado) return alert("Voce precisa estar logado para seguir alguem.")
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
    if (!usuarioLogado) return alert("Faça login para enviar mensagens.")
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
      if (top3Selecionado.length >= 5) return alert("Voce ja selecionou 5 musicais.")
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
        // apaga comentários (cópia top-level + subcoleção do musical)
        for (const c of comentarios) {
          try { await deleteDoc(doc(db, "comentarios", c.id)) } catch (e) {}
          try { await deleteDoc(doc(db, "musicais", c.musicalId, "comentarios", c.id)) } catch (e) {}
        }
        setComentarios([])

        // remove do feed de atividade recente
        try {
          const ativSnap = await getDocs(query(collection(db, "atividades"), where("userId", "==", userId)))
          for (const d of ativSnap.docs) await deleteDoc(d.ref)
        } catch (e) {}
      }
    } catch (e) {
      alert("Erro ao atualizar o banimento. Tente novamente.")
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
      alert("Não foi possível confirmar sua identidade (login cancelado ou expirado). Tente novamente.")
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
      // Para jaVi e queroVer, decrementa popularidade do musical antes de apagar
      // (cada uma dessas listas representa +1 na contagem).
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
      // (apaga a conversa inteira — não há Cloud Function pra só remover o participante)
      try {
        const conversasSnap = await getDocs(query(collection(db, "conversas"), where("participantes", "array-contains", userId)))
        for (const d of conversasSnap.docs) await deleteDoc(d.ref)
      } catch (e) {}

      // 8. Apaga o documento de usuário
      await deleteDoc(doc(db, "usuarios", userId))

      // 9. Apaga a conta no Firebase Auth
      await usuarioLogado.delete()

      navigate("/")
    } catch (e) {
      alert("Algo deu errado ao deletar a conta. Tente novamente ou entre em contato pelo formulário da Home.")
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

  const cardMusical = (item, extra) => (
    <a key={item.id} href={"/musical/" + item.musicalId} className="card-musical"
      style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <div style={{ width: "100%", aspectRatio: "2/3", marginBottom: "12px" }}>
        {item.capa
          ? <img src={item.capa} alt={item.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
          : <div style={{ width: "100%", height: "100%", background: "#1a1a1a", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{item.titulo}</div>
        }
      </div>
      <div style={{ width: "100%" }}>
        <p className="card-titulo">{item.titulo}</p>
        {extra}
      </div>
    </a>
  )

  const cardJaVi = (item) => {
    const sessoes = sessoesPorMusical[item.musicalId] || []
    const sessoesVisiveis = isProprioPerfil ? sessoes : sessoes.filter(s => s.publico)
    const expandido = sessoesExpandidas[item.musicalId]
    const temSessoes = sessoesVisiveis.length > 0

    return (
      <div key={item.id} style={{ display: "flex", flexDirection: "column" }}>
        <a href={"/musical/" + item.musicalId} className="card-musical"
          style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          <div style={{ width: "100%", height: "280px", marginBottom: "12px" }}>
            {item.capa
              ? <img src={item.capa} alt={item.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
              : <div style={{ width: "100%", height: "100%", background: "#1a1a1a", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C518", fontSize: "12px", padding: "8px", textAlign: "center" }}>{item.titulo}</div>
            }
          </div>
          <div style={{ width: "100%" }}>
            <p className="card-titulo">{item.titulo}</p>
            <p className="card-meta">Direção: {item.direcao || "—"}</p>
          </div>
        </a>
        {temSessoes && (
          <button onClick={() => toggleSessoes(item.musicalId)}
            style={{ marginTop: "6px", background: "none", border: "1px solid #e8e8e4", borderRadius: "6px", padding: "5px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#888", cursor: "pointer", textAlign: "left" }}>
            📅 {sessoesVisiveis.length} {sessoesVisiveis.length === 1 ? "sessão" : "sessões"} {expandido ? "▲" : "▼"}
          </button>
        )}
        {temSessoes && expandido && (
          <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
            {sessoesVisiveis.map(s => (
              <div key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#f5f5f0", border: "1px solid #e8e8e4", borderRadius: "99px", padding: "5px 12px" }}>
                <span style={{ fontSize: "12px", fontWeight: "500", color: "#1a1a1a" }}>{labelChip(s)}</span>
                {isProprioPerfil && (
                  <span style={{ fontSize: "11px", color: s.publico ? "#5a9e6f" : "#aaa" }}>{s.publico ? "🌐" : "🔒"}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
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
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>

      <div style={{ marginBottom: "32px" }}>
        {fotoPerfil && (
          <img src={fotoPerfil} alt={nomePerfil} style={{ width: "96px", height: "96px", borderRadius: "50%", marginBottom: "16px", border: "3px solid #F5C518" }} />
        )}
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px" }}>
          {nomePerfil || "Usuario"}
          {verificado && <SeloVerificado />}
        </h1>
        {isProprioPerfil && <p style={{ color: "#888", fontSize: "14px" }}>Este e o seu perfil</p>}
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
            {/* Bio */}
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

            {/* Redes */}
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

      {/* NAVEGAÇÃO INTERNA */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '0 0 8px 0' }}>
        <a href="#top5" style={{ color: '#1a1a1a', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: '600', padding: '6px 14px', background: '#F5C518', borderRadius: '20px' }}>
          ✦ Top 5
        </a>
        {isProprioPerfil && (
          <a href="#zona-risco" style={{ color: '#cc0000', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: '600', padding: '6px 14px', background: '#fff5f5', border: '1px solid #f0c0c0', borderRadius: '20px' }}>
          🗑 Excluir minha conta
          </a>
        )}
      </div>
      <div style={{ display: 'flex', borderBottom: '2px solid #e8e8e4', marginBottom: '24px', marginTop: '32px', gap: '0' }}>
        {[
          { id: 'avaliacoes', label: `Avaliações (${votos.length})` },
          { id: 'ja-vi', label: `Já vi (${jaVi.length})` },
          { id: 'quero-ver', label: `Quero ver (${queroVer.length})` },
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
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
              <p className="login-aviso"><a href="/" style={{ color: "#F5C518" }}>Explorar musicais →</a></p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
                {votos.map(voto => {
                  const musical = musicais[voto.musicalId]
                  if (!musical) return null
                  return cardMusical({ id: voto.musicalId, musicalId: voto.musicalId, ...musical }, <div className="rating-badge">★ {voto.estrelas}</div>)
                })}
              </div>
            )
          ) : (
            <p className="login-aviso">As avaliações deste usuário são privadas.</p>
          )}
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
                    : <a href="/" style={{ color: "#F5C518" }}>Explorar musicais →</a>)
                : "Este usuário ainda não marcou nenhum musical como visto."}
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
              {jaViExibidos.map(item => cardJaVi(item))}
            </div>
          )}
        </div>
      )}

      {tabAtiva === "quero-ver" && (
        <div>
          {queroVer.length === 0 ? (
            <p className="login-aviso">{isProprioPerfil ? <a href="/" style={{ color: "#F5C518" }}>Explorar musicais →</a> : "Este usuário ainda não tem musicais na lista."}</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
              {queroVer.map(item => cardMusical(item, <p className="card-meta">Direção: {item.direcao || "—"}</p>))}
            </div>
          )}
        </div>
      )}

      {tabAtiva === "comentarios" && (
        <div>
          {comentarios.length === 0 ? (
            <p className="login-aviso">{isProprioPerfil ? <a href="/" style={{ color: "#F5C518" }}>Explorar musicais →</a> : "Este usuário ainda não fez nenhum comentário."}</p>
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
