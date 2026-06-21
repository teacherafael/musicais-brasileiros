import { Helmet } from "react-helmet-async"
import { useEffect, useState, useRef } from "react"
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, getDocs, deleteDoc, orderBy, query, serverTimestamp } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useParams, useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import ReportarErro from "../components/ReportarErro"
import html2canvas from "html2canvas"
import { Link } from "react-router-dom";
import { encontrarTeatroPorNome } from "../data/teatros";
import { ehAdmin } from "../admins";

function SeloVerificado() {
  return (
    <span title="Usuário verificado" style={{ marginLeft: "5px", verticalAlign: "middle", display: "inline-flex" }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="#1D9BF0" />
        <path d="M7 13l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function nomesClicaveis(texto) {
  if (!texto) return null
  return texto.split(",").map((nome, i, arr) => (
    <span key={i}>
      <a
        href={"/pessoa/" + encodeURIComponent(nome.trim())}
        style={{ color: "#444", borderBottom: "1px dotted #aaa", textDecoration: "none" }}
      >
        {nome.trim()}
      </a>
      {i < arr.length - 1 ? ", " : ""}
    </span>
  ))
}

const LABELS = {
  0.5: "Horrível", 1: "Muito ruim", 1.5: "Ruim", 2: "Regular",
  2.5: "Razoável", 3: "Bom", 3.5: "Muito bom", 4: "Ótimo",
  4.5: "Excelente", 5: "Obra-prima"
}

function Estrelas({ votoAtual, onVotar }) {
  const [hover, setHover] = useState(0)

  function calcularValor(e, estrela) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    return x < rect.width / 2 ? estrela - 0.5 : estrela
  }

  const valorAtivo = hover || votoAtual || 0

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", gap: "2px", marginBottom: "8px" }}>
        {[1, 2, 3, 4, 5].map(estrela => {
          const cheia = valorAtivo >= estrela
          const meia = valorAtivo >= estrela - 0.5 && valorAtivo < estrela
          return (
            <span
              key={estrela}
              onClick={e => onVotar(calcularValor(e, estrela))}
              onMouseMove={e => setHover(calcularValor(e, estrela))}
              onMouseLeave={() => setHover(0)}
              style={{
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                fontSize: "40px",
                userSelect: "none",
                lineHeight: 1,
                cursor: "pointer",
                transition: "transform 0.1s ease",
                transform: valorAtivo >= estrela - 0.5 ? "scale(1.1)" : "scale(1)"
              }}
            >
              {meia ? (
                <span style={{ position: "relative", display: "inline-block" }}>
                  <span style={{ color: "#ddd" }}>★</span>
                  <span style={{ position: "absolute", left: 0, top: 0, width: "50%", overflow: "hidden", color: "#F5C518" }}>★</span>
                </span>
              ) : (
                <span style={{ color: cheia ? "#F5C518" : "#ddd", transition: "color 0.1s ease" }}>★</span>
              )}
            </span>
          )
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", minHeight: "28px" }}>
        {hover ? (
          <>
            <span style={{ fontSize: "22px", fontWeight: "700", color: "#F5C518", lineHeight: 1 }}>{hover}</span>
            <span style={{ fontSize: "15px", color: "#444", fontWeight: "500" }}>{LABELS[hover]}</span>
          </>
        ) : votoAtual ? (
          <>
            <span style={{ fontSize: "22px", fontWeight: "700", color: "#F5C518", lineHeight: 1 }}>{votoAtual}</span>
            <span style={{ fontSize: "15px", color: "#888" }}>{LABELS[votoAtual]}</span>
          </>
        ) : (
          <span style={{ fontSize: "14px", color: "#bbb" }}>Passe o mouse para avaliar</span>
        )}
      </div>
    </div>
  )
}

function Musical() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [musical, setMusical] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [votoAtual, setVotoAtual] = useState(null)
  const [queroVer, setQueroVer] = useState(false)
  const [jaVi, setJaVi] = useState(false)
  const [comentarios, setComentarios] = useState([])
  const [textoComentario, setTextoComentario] = useState("")
  const [editandoComentario, setEditandoComentario] = useState(null)
  const [textoEdicao, setTextoEdicao] = useState("")
  const [editandoMusical, setEditandoMusical] = useState(false)
  const [formEdicao, setFormEdicao] = useState({})
  const [teatrosAdicionais, setTeatrosAdicionais] = useState([])
  const [gerando, setGerando] = useState(false)
  const [denunciandoComentario, setDenunciandoComentario] = useState(null)
  const [textoDenuncia, setTextoDenuncia] = useState("")
  const [denunciaEnviada, setDenunciaEnviada] = useState(null)
  const [toast, setToast] = useState(null)
  const [usuariosVerificados, setUsuariosVerificados] = useState({})
  const [reacoes, setReacoes] = useState({})
  const [minhaReacao, setMinhaReacao] = useState({})
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false)
  const [tooltipHistograma, setTooltipHistograma] = useState(null)
  const cartaoRef = useRef(null)
  const avaliacaoRef = useRef(null)

  // Estados das sessões
  const [sessoes, setSessoes] = useState([])
  const [mostrarFormSessao, setMostrarFormSessao] = useState(false)
  const [novaData, setNovaData] = useState("")
  const [novoHorario, setNovoHorario] = useState("")
  const [novoAssento, setNovoAssento] = useState("")
  const [novoTeatro, setNovoTeatro] = useState("")
  const [novaSessaoPublica, setNovaSessaoPublica] = useState(true)
  const [salvandoSessao, setSalvandoSessao] = useState(false)

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  useEffect(() => {
    if (!musical) return
    const media = musical.totalVotos > 0
      ? (musical.somaEstrelas / musical.totalVotos).toFixed(1)
      : null
    document.title = `${musical.titulo}${media ? ` — ★ ${media}` : ""} | MBDb`
    return () => { document.title = "MBDb" }
  }, [musical])

  useEffect(() => {
    async function buscarMusical() {
      const docSnap = await getDoc(doc(db, "musicais", id))
      if (docSnap.exists()) setMusical({ id: docSnap.id, ...docSnap.data() })
    }
    async function buscarComentarios() {
      const q = query(collection(db, "musicais", id, "comentarios"), orderBy("data", "desc"))
      const snap = await getDocs(q)
      const lista = await Promise.all(snap.docs.map(async d => {
        const dados = { id: d.id, ...d.data() }
        if (dados.userId) {
          const votoSnap = await getDoc(doc(db, "musicais", id, "votos", dados.userId))
          if (votoSnap.exists()) dados.estrelasComentario = votoSnap.data().estrelas
        }
        return dados
      }))
      setComentarios(lista)

      const userIds = [...new Set(lista.map(c => c.userId).filter(Boolean))]
      const verificados = {}
      await Promise.all(userIds.map(async uid => {
        const userSnap = await getDoc(doc(db, "usuarios", uid))
        if (userSnap.exists()) verificados[uid] = userSnap.data().verificado ?? false
      }))
      setUsuariosVerificados(verificados)

      const reacoesPorComentario = {}
      const minhaReacaoPorComentario = {}
      await Promise.all(lista.map(async c => {
        const reacoesSnap = await getDocs(collection(db, "musicais", id, "comentarios", c.id, "reacoes"))
        const contagem = {}
        reacoesSnap.docs.forEach(r => {
          const emoji = r.data().emoji
          contagem[emoji] = (contagem[emoji] || 0) + 1
        })
        reacoesPorComentario[c.id] = contagem
        if (usuario) {
          const minhaSnap = reacoesSnap.docs.find(r => r.id === usuario?.uid)
          if (minhaSnap) minhaReacaoPorComentario[c.id] = minhaSnap.data().emoji
        }
      }))
      setReacoes(reacoesPorComentario)
      setMinhaReacao(minhaReacaoPorComentario)
    }
    buscarMusical()
    buscarComentarios()
  }, [id])

  useEffect(() => {
    async function buscarEstados() {
      if (!usuario) return
      const votoSnap = await getDoc(doc(db, "musicais", id, "votos", usuario.uid))
      if (votoSnap.exists()) setVotoAtual(votoSnap.data().estrelas)
      const queroVerSnap = await getDoc(doc(db, "usuarios", usuario.uid, "queroVer", id))
      setQueroVer(queroVerSnap.exists())
      const jaViSnap = await getDoc(doc(db, "usuarios", usuario.uid, "jaVi", id))
      setJaVi(jaViSnap.exists())
    }
    buscarEstados()
  }, [usuario, id])

  useEffect(() => {
    async function buscarSessoes() {
      if (!usuario) return
      const snap = await getDocs(collection(db, "usuarios", usuario.uid, "sessoesAssistidas"))
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.musicalId === id)
        .sort((a, b) => {
          const da = a.data + (a.horario || "")
          const db2 = b.data + (b.horario || "")
          return da > db2 ? -1 : 1
        })
      setSessoes(lista)
    }
    buscarSessoes()
  }, [usuario, id])

  function mostrarToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function abrirEdicao() {
    setFormEdicao({
      titulo: musical.titulo || "",
      sinopse: musical.sinopse || "",
      direcao: musical.direcao || "",
      direcaoMusical: musical.direcaoMusical || "",
      producao: musical.producao || "",
      elenco: musical.elenco || "",
      elencoAdicional: musical.elencoAdicional || "",
      versionista: musical.versionista || "",
      textoOriginal: musical.textoOriginal || "",
      musicaOriginal: musical.musicaOriginal || "",
      ano: musical.ano || "",
      teatro: musical.teatro || "",
      capa: musical.capa || "",
      programaDigital: musical.programaDigital || ""
    })
    let listaTeatros = musical.teatros || []
    if (listaTeatros.length === 0 && musical.teatro) {
      listaTeatros = [{ ano: musical.ano || "", teatros: [musical.teatro] }]
      if (musical.teatrosAdicionais) {
        musical.teatrosAdicionais.forEach(item => listaTeatros.push({ ano: item.ano, teatros: item.teatros }))
      }
    }
    setTeatrosAdicionais(
      listaTeatros.map(item => ({ ...item, teatrosTexto: item.teatros.join(", ") }))
    )
    setEditandoMusical(true)
    
  }

  async function salvarEdicaoMusical() {
    const teatrosLimpos = teatrosAdicionais
      .map(item => ({
        ano: item.ano.trim(),
        teatros: item.teatrosTexto.split(",").map(t => t.trim()).filter(Boolean)
      }))
      .filter(item => item.ano && item.teatros.length > 0)
    const dadosFinais = {
      ...formEdicao,
      teatro: teatrosLimpos[0]?.teatros[0] || "",
      teatros: teatrosLimpos,
      teatrosAdicionais: [],
    }
    await updateDoc(doc(db, "musicais", id), dadosFinais)
    setMusical(prev => ({ ...prev, ...dadosFinais }))
    setEditandoMusical(false)
  }

  function moverTeatro(index, direcao) {
    const destino = index + direcao
    if (destino < 0 || destino >= teatrosAdicionais.length) return
    const novo = [...teatrosAdicionais]
    ;[novo[index], novo[destino]] = [novo[destino], novo[index]]
    setTeatrosAdicionais(novo)
  }

  async function toggleDestaque() {
    const novoValor = !musical.destaque
    await updateDoc(doc(db, "musicais", id), { destaque: novoValor })
    setMusical(prev => ({ ...prev, destaque: novoValor }))
    mostrarToast(novoValor ? "Musical adicionado ao destaque!" : "Musical removido do destaque.")
  }

  async function votar(estrelas) {
    if (!usuario) return mostrarToast("Faça login para votar.")

    const chaveNova = String(estrelas)

    if (votoAtual) {
      const chaveAntiga = String(votoAtual)

      const musicalRef = doc(db, "musicais", id)
      const snap = await getDoc(musicalRef)
      const dist = snap.data()?.distribuicao || {}

      const novaDistribuicao = {}
      for (const k of Object.keys(dist)) {
        novaDistribuicao[k] = Number(dist[k]) || 0
      }
      novaDistribuicao[chaveAntiga] = Math.max((novaDistribuicao[chaveAntiga] || 0) - 1, 0)
      novaDistribuicao[chaveNova] = (novaDistribuicao[chaveNova] || 0) + 1

      await updateDoc(musicalRef, {
        somaEstrelas: increment(estrelas - votoAtual),
        distribuicao: novaDistribuicao,
      })
      await setDoc(doc(db, "musicais", id, "votos", usuario.uid), { estrelas })

      setMusical(prev => ({
        ...prev,
        somaEstrelas: prev.somaEstrelas + (estrelas - votoAtual),
        distribuicao: novaDistribuicao,
      }))
    } else {
      const musicalRef = doc(db, "musicais", id)
      const snap = await getDoc(musicalRef)
      const dist = snap.data()?.distribuicao || {}

      const novaDistribuicao = {}
      for (const k of Object.keys(dist)) {
        novaDistribuicao[k] = Number(dist[k]) || 0
      }
      novaDistribuicao[chaveNova] = (novaDistribuicao[chaveNova] || 0) + 1

      await setDoc(doc(db, "musicais", id, "votos", usuario.uid), { estrelas })
      await updateDoc(musicalRef, {
        totalVotos: increment(1),
        somaEstrelas: increment(estrelas),
        distribuicao: novaDistribuicao,
      })
      const perfilSnap = await getDoc(doc(db, "usuarios", usuario.uid))
      const avaliacoesPublicas = perfilSnap.exists() ? (perfilSnap.data().avaliacoesPublicas ?? true) : true
      if (avaliacoesPublicas) {
        await setDoc(doc(db, "atividades", `${usuario.uid}_${id}`), {
          tipo: "avaliacao",
          userId: usuario.uid,
          nome: usuario.displayName || "Anônimo",
          foto: usuario.photoURL || "",
          musicalId: id,
          musicalTitulo: musical.titulo,
          estrelas,
          data: serverTimestamp()
        })
      }

      setMusical(prev => ({
        ...prev,
        totalVotos: prev.totalVotos + 1,
        somaEstrelas: prev.somaEstrelas + estrelas,
        distribuicao: novaDistribuicao,
      }))
    }

    await setDoc(doc(db, "usuarios", usuario.uid, "jaVi", id), {
      musicalId: id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || ""
    })
    await deleteDoc(doc(db, "usuarios", usuario.uid, "queroVer", id))

    setVotoAtual(estrelas)
    setJaVi(true)
    setQueroVer(false)
    mostrarToast("Avaliação salva!")
  }

  async function removerVoto() {
    const chave = String(votoAtual)

    const musicalRef = doc(db, "musicais", id)
    const snap = await getDoc(musicalRef)
    const dist = snap.data()?.distribuicao || {}

    const novaDistribuicao = {}
    for (const k of Object.keys(dist)) {
      novaDistribuicao[k] = Number(dist[k]) || 0
    }
    novaDistribuicao[chave] = Math.max((novaDistribuicao[chave] || 0) - 1, 0)

    await deleteDoc(doc(db, "musicais", id, "votos", usuario.uid))
    await deleteDoc(doc(db, "atividades", `${usuario.uid}_${id}`))
    await updateDoc(musicalRef, {
      totalVotos: increment(-1),
      somaEstrelas: increment(-votoAtual),
      distribuicao: novaDistribuicao,
    })

    setMusical(prev => ({
      ...prev,
      totalVotos: prev.totalVotos - 1,
      somaEstrelas: prev.somaEstrelas - votoAtual,
      distribuicao: novaDistribuicao,
    }))
    setVotoAtual(null)
    setConfirmandoRemocao(false)
    mostrarToast("Avaliação removida.")
  }

  async function toggleQueroVer() {
    if (!usuario) return mostrarToast("Faça login para usar esta função.")
    const refQueroVer = doc(db, "usuarios", usuario.uid, "queroVer", id)
    const refJaVi = doc(db, "usuarios", usuario.uid, "jaVi", id)
    if (queroVer) {
      await deleteDoc(refQueroVer)
      setQueroVer(false)
    } else {
      await setDoc(refQueroVer, { musicalId: id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" })
      await deleteDoc(refJaVi)
      setQueroVer(true)
      setJaVi(false)
    }
  }

  async function toggleJaVi() {
    if (!usuario) return mostrarToast("Faça login para usar esta função.")
    const refJaVi = doc(db, "usuarios", usuario.uid, "jaVi", id)
    const refQueroVer = doc(db, "usuarios", usuario.uid, "queroVer", id)
    if (jaVi) {
      await deleteDoc(refJaVi)
      setJaVi(false)
    } else {
      await setDoc(refJaVi, { musicalId: id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" })
      await deleteDoc(refQueroVer)
      setJaVi(true)
      setQueroVer(false)
      setTimeout(() => {
        avaliacaoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      }, 100)
    }
  }

  async function salvarSessao() {
    if (!usuario) return
    if (!novaData) return mostrarToast("Informe a data da sessão.")
    setSalvandoSessao(true)
    const novaSessao = {
      musicalId: id,
      titulo: musical.titulo,
      capa: musical.capa || null,
      direcao: musical.direcao || "",
      data: novaData,
      horario: novoHorario.trim(),
      assento: novoAssento.trim(),
      teatro: novoTeatro.trim(),
      publico: novaSessaoPublica,
    }
    const docRef = await addDoc(collection(db, "usuarios", usuario.uid, "sessoesAssistidas"), novaSessao)
    setSessoes(prev =>
      [{ id: docRef.id, ...novaSessao }, ...prev].sort((a, b) => {
        const da = a.data + (a.horario || "")
        const db2 = b.data + (b.horario || "")
        return da > db2 ? -1 : 1
      })
    )
    setNovaData("")
    setNovoAssento("")
    setNovoTeatro("")
    setNovaSessaoPublica(true)
    setMostrarFormSessao(false)
    setSalvandoSessao(false)
    mostrarToast("Sessão registrada!")
  }

  async function deletarSessao(sessaoId) {
    if (!window.confirm("Remover este registro de sessão?")) return
    await deleteDoc(doc(db, "usuarios", usuario.uid, "sessoesAssistidas", sessaoId))
    setSessoes(prev => prev.filter(s => s.id !== sessaoId))
    mostrarToast("Sessão removida.")
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

  async function gerarImagem() {
    if (!cartaoRef.current) return
    setGerando(true)
    try {
      const canvas = await html2canvas(cartaoRef.current, { useCORS: true, scale: 2, backgroundColor: null })
      const link = document.createElement("a")
      link.download = `${musical.titulo}-mbdb.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
    } catch (e) {
      alert("Erro ao gerar imagem. Tente novamente.")
    }
    setGerando(false)
  }

  async function enviarComentario() {
    if (!usuario) return alert("Faça login para comentar.")
    if (!textoComentario.trim()) return
    const confirmado = window.confirm("Lembre-se de manter sua crítica respeitosa e sem ataques à produção. Deseja publicar o comentário?")
    if (!confirmado) return

    const novoComentario = {
      nome: usuario.displayName || "Anônimo",
      userId: usuario.uid,
      texto: textoComentario,
      data: new Date()
    }

    const docRef = await addDoc(collection(db, "musicais", id, "comentarios"), novoComentario)

    await setDoc(doc(db, "comentarios", docRef.id), {
      ...novoComentario,
      musicalId: id,
      musicalTitulo: musical.titulo,
      musicalCapa: musical.capa || null,
      data: serverTimestamp()
    })
    await addDoc(collection(db, "atividades"), {
      tipo: "comentario",
      userId: usuario.uid,
      nome: usuario.displayName || "Anônimo",
      foto: usuario.photoURL || "",
      musicalId: id,
      musicalTitulo: musical.titulo,
      data: serverTimestamp()
    })

    const votoSnap = await getDoc(doc(db, "musicais", id, "votos", usuario.uid))
    const estrelasComentario = votoSnap.exists() ? votoSnap.data().estrelas : null

    const userSnap = await getDoc(doc(db, "usuarios", usuario.uid))
    const eVerificado = userSnap.exists() ? (userSnap.data().verificado ?? false) : false
    setUsuariosVerificados(prev => ({ ...prev, [usuario.uid]: eVerificado }))

    setComentarios(prev => [{ id: docRef.id, ...novoComentario, estrelasComentario }, ...prev])
    setTextoComentario("")
  }

  async function deletarComentario(comentarioId) {
    if (!window.confirm("Apagar este comentário?")) return
    await deleteDoc(doc(db, "musicais", id, "comentarios", comentarioId))
    await deleteDoc(doc(db, "comentarios", comentarioId))
    setComentarios(prev => prev.filter(c => c.id !== comentarioId))
  }

  async function salvarEdicao(comentarioId) {
    if (!textoEdicao.trim()) return
    await updateDoc(doc(db, "musicais", id, "comentarios", comentarioId), { texto: textoEdicao })
    await updateDoc(doc(db, "comentarios", comentarioId), { texto: textoEdicao })
    setComentarios(prev => prev.map(c => c.id === comentarioId ? { ...c, texto: textoEdicao } : c))
    setEditandoComentario(null)
    setTextoEdicao("")
  }

  async function reagir(comentarioId, emoji) {
    if (!usuario) return alert("Faça login para reagir.")
    const ref = doc(db, "musicais", id, "comentarios", comentarioId, "reacoes", usuario.uid)
    const jaReagiu = minhaReacao[comentarioId]

    if (jaReagiu === emoji) {
      // Remove reação existente — sem notificação
      await deleteDoc(ref)
      setMinhaReacao(prev => { const next = { ...prev }; delete next[comentarioId]; return next })
      setReacoes(prev => {
        const next = { ...prev, [comentarioId]: { ...prev[comentarioId] } }
        next[comentarioId][emoji] = Math.max((next[comentarioId][emoji] || 1) - 1, 0)
        return next
      })
    } else {
      // Troca ou adiciona reação
      if (jaReagiu) {
        setReacoes(prev => {
          const next = { ...prev, [comentarioId]: { ...prev[comentarioId] } }
          next[comentarioId][jaReagiu] = Math.max((next[comentarioId][jaReagiu] || 1) - 1, 0)
          return next
        })
      }
      await setDoc(ref, { emoji })
      setMinhaReacao(prev => ({ ...prev, [comentarioId]: emoji }))
      setReacoes(prev => {
        const next = { ...prev, [comentarioId]: { ...prev[comentarioId] } }
        next[comentarioId][emoji] = (next[comentarioId][emoji] || 0) + 1
        return next
      })

      // Notifica o dono do comentário (só se não for a própria pessoa)
      const comentario = comentarios.find(c => c.id === comentarioId)
      if (comentario && comentario.userId && comentario.userId !== usuario.uid) {
        try {
          await addDoc(collection(db, "notificacoes", comentario.userId, "itens"), {
            tipo: "reacao",
            emoji,
            de: usuario.displayName || "Alguém",
            texto: `${usuario.displayName || "Alguém"} reagiu ${emoji} ao seu comentário em ${musical.titulo}`,
            link: `/musical/${id}`,
            lida: false,
            data: serverTimestamp(),
          })
        } catch (e) {
          // Notificação é silenciosa — falha não bloqueia a reação
        }
      }
    }
  }

  async function enviarDenuncia(comentario) {
    if (!textoDenuncia.trim()) return
    await addDoc(collection(db, "relatorios"), {
      tipo: "denuncia_comentario",
      musicalId: id,
      musicalTitulo: musical.titulo,
      comentarioId: comentario.id,
      comentarioTexto: comentario.texto,
      comentarioAutor: comentario.nome,
      texto: textoDenuncia,
      nome: usuario ? (usuario.displayName || "Anônimo") : "Anônimo",
      userId: usuario ? usuario.uid : null,
      data: serverTimestamp()
    })
    setDenunciaEnviada(comentario.id)
    setDenunciandoComentario(null)
    setTextoDenuncia("")
    setTimeout(() => setDenunciaEnviada(null), 3000)
  }

  if (!musical) return <main><p>Carregando...</p></main>

  const media = musical.totalVotos > 0
    ? (musical.somaEstrelas / musical.totalVotos).toFixed(1)
    : null

  const estrelasSVG = (nota) => {
    return [1, 2, 3, 4, 5].map(i => {
      const cheia = nota >= i
      const meia = nota >= i - 0.5 && nota < i
      const cor = (cheia || meia) ? "#F5C518" : "rgba(255,255,255,0.15)"
      return <span key={i} style={{ color: cor, fontSize: "24px" }}>★</span>
    })
  }

  const campo = (label, chave, multiline = false) => (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={formEdicao[chave] || ""}
          onChange={e => setFormEdicao(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", height: "100px", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none", resize: "vertical" }}
        />
      ) : (
        <input
          type="text"
          value={formEdicao[chave] || ""}
          onChange={e => setFormEdicao(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none" }}
        />
      )}
    </div>
  )

  return (
    <main>
      <Helmet>
        <title>{musical.titulo} — MBDb</title>
        <meta name="description" content={musical.sinopse || `Veja avaliações e informações sobre ${musical.titulo} no MBDb.`} />
        <meta property="og:title" content={musical.titulo} />
        <meta property="og:description" content={musical.sinopse || `Veja avaliações e informações sobre ${musical.titulo} no MBDb.`} />
        {musical.capa && <meta property="og:image" content={musical.capa} />}
        <meta property="og:url" content={`https://musicais-brasileiros.vercel.app/musical/${id}`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          background: "#1a1a1a", color: "#F5C518", padding: "12px 24px",
          borderRadius: "8px", fontSize: "14px", fontWeight: "500",
          zIndex: 999, boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
        }}>
          {toast}
        </div>
      )}

      <button className="voltar" onClick={() => navigate(-1)}>← Voltar</button>

      {editandoMusical ? (
        <div style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", marginBottom: "24px" }}>Editar musical</h2>
          {campo("Título", "titulo")}
          {campo("Sinopse", "sinopse", true)}
          {campo("Direção", "direcao")}
          {campo("Direção musical", "direcaoMusical")}
          {campo("Produção", "producao")}
          {campo("Elenco de estreia", "elenco")}
          {campo("Elenco adicional", "elencoAdicional")}
          {campo("Versionista", "versionista")}
          {campo("Texto original", "textoOriginal")}
          {campo("Música original", "musicaOriginal")}
          {campo("Ano", "ano")}
          {campo("Teatro de estreia", "teatro")}
          {campo("URL da capa", "capa")}
          {campo("Link do programa digital (Google Drive)", "programaDigital")}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
              Teatros (o primeiro da lista é considerado a estreia)
            </label>
            {teatrosAdicionais.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button
                    onClick={() => moverTeatro(i, -1)}
                    disabled={i === 0}
                    style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: "4px", padding: "2px 6px", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#ddd" : "#888", fontSize: "12px" }}
                    title="Mover para cima"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moverTeatro(i, 1)}
                    disabled={i === teatrosAdicionais.length - 1}
                    style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: "4px", padding: "2px 6px", cursor: i === teatrosAdicionais.length - 1 ? "default" : "pointer", color: i === teatrosAdicionais.length - 1 ? "#ddd" : "#888", fontSize: "12px" }}
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
                    const novo = [...teatrosAdicionais]
                    novo[i] = { ...novo[i], ano: e.target.value }
                    setTeatrosAdicionais(novo)
                  }}
                  style={{ width: "90px", padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }}
                />
                <input
                  type="text"
                  placeholder="Teatros (separados por vírgula)"
                  value={item.teatrosTexto}
                  onChange={e => {
                    const novo = [...teatrosAdicionais]
                    novo[i] = { ...novo[i], teatrosTexto: e.target.value }
                    setTeatrosAdicionais(novo)
                  }}
                  style={{ flex: 1, padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }}
                />
                <button
                  onClick={() => setTeatrosAdicionais(teatrosAdicionais.filter((_, idx) => idx !== i))}
                  style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "16px", padding: "10px 4px" }}
                  title="Remover"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setTeatrosAdicionais([...teatrosAdicionais, { ano: "", teatrosTexto: "" }])}
              style={{ background: "none", border: "1px dashed #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}
            >
              + Adicionar teatro
            </button>
          </div>
          {formEdicao.capa && (
            <img src={formEdicao.capa} alt="Preview" style={{ width: "80px", height: "110px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e8e8e4", marginBottom: "16px" }} />
          )}
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn-comentar" onClick={salvarEdicaoMusical}>Salvar alterações</button>
            <button className="btn-sair" onClick={() => setEditandoMusical(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="musical-header">
            <div className="musical-poster">
              {musical.capa
                ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                : musical.titulo
              }
            </div>
            <div>
              <h1 className="musical-titulo">{musical.titulo}</h1>

              {musical.equipeCriativa && musical.equipeCriativa.length > 0 ? (
                musical.equipeCriativa
                  .filter(item => item.nomes && item.nomes.length > 0)
                  .map((item, i) => (
                    <p key={i} style={{ fontSize: "15px", color: "#444", marginBottom: "6px" }}>
                      <strong style={{ color: "#1a1a1a" }}>{item.funcao}:</strong>{" "}
                      {nomesClicaveis(item.nomes.join(", "))}
                    </p>
                  ))
              ) : (
                <>
                  <p style={{ fontSize: "15px", color: "#444", marginBottom: "6px" }}>
                    <strong style={{ color: "#1a1a1a" }}>Direção:</strong>{" "}
                    {nomesClicaveis(musical.direcao) || "—"}
                  </p>
                  {musical.direcaoMusical && (
                    <p style={{ fontSize: "15px", color: "#444", marginBottom: "6px" }}>
                      <strong style={{ color: "#1a1a1a" }}>Direção musical:</strong>{" "}
                      {nomesClicaveis(musical.direcaoMusical)}
                    </p>
                  )}
                </>
              )}
              {musical.producao && (
                <p style={{ fontSize: "15px", color: "#444", marginBottom: "6px" }}>
                  <strong style={{ color: "#1a1a1a" }}>Produção:</strong>{" "}
                  {nomesClicaveis(musical.producao)}
                </p>
              )}

              <div style={{ marginTop: "4px", marginBottom: "4px" }}>
                
                {musical.versionista && <p className="musical-meta"><strong>Versionista:</strong> {nomesClicaveis(musical.versionista)}</p>}
                {musical.textoOriginal && <p className="musical-meta"><strong>Texto original:</strong> {nomesClicaveis(musical.textoOriginal)}</p>}
                {musical.musicaOriginal && <p className="musical-meta"><strong>Música original:</strong> {nomesClicaveis(musical.musicaOriginal)}</p>}
                {(musical.teatros?.length > 0 || musical.teatro) && (() => {
                  const listaBase = musical.teatros && musical.teatros.length > 0
                    ? musical.teatros
                    : musical.teatro
                      ? [{ ano: musical.ano || "", teatros: [musical.teatro] }, ...(musical.teatrosAdicionais || [])]
                      : []
                  const linhas = listaBase.map((item, i) => ({ ...item, estreia: i === 0 }))
                  return (
                    <div style={{ marginTop: "10px" }}>
                      <p className="musical-meta" style={{ marginBottom: "6px" }}><strong>Teatros:</strong></p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "4px" }}>
                        {linhas.map((item, i) => {
                          const porCidade = {}
                          item.teatros.forEach(nomeTeatro => {
                            const t = encontrarTeatroPorNome(nomeTeatro)
                            const cidade = t ? t.cidade.split(" – ")[0] : null
                            const chave = cidade || "?"
                            if (!porCidade[chave]) porCidade[chave] = []
                            porCidade[chave].push({ nome: nomeTeatro, id: t?.id })
                          })
                          return (
                            <div key={i} style={{ display: "flex", gap: "14px", alignItems: "baseline", fontSize: "14px" }}>
                              <span style={{ fontWeight: "500", color: "#1a1a1a", minWidth: "40px" }}>{item.ano}</span>
                              <span style={{ color: "#666" }}>
                                {Object.entries(porCidade).map(([cidade, lista], j) => (
                                  <span key={cidade}>
                                    {j > 0 && " / "}
                                    {lista.map((t, k) => (
                                      <span key={k}>
                                        {k > 0 && ", "}
                                        {t.id ? (
                                          <Link to={`/teatro/${t.id}`} style={{ color: "#b8960a", textDecoration: "none" }}>{t.nome}</Link>
                                        ) : t.nome}
                                      </span>
                                    ))}
                                    {cidade !== "?" && <span style={{ color: "#999" }}> — {cidade}</span>}
                                  </span>
                                ))}
                                {item.estreia && <span style={{ fontSize: "12px", color: "#999" }}> (estreia)</span>}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div style={{ margin: "16px 0 12px" }}>
                {media ? (
                  <div style={{ display: "inline-flex", alignItems: "baseline", gap: "10px", background: "#1a1a1a", borderRadius: "10px", padding: "10px 20px" }}>
                    <span style={{ fontSize: "32px", fontWeight: "700", color: "#F5C518", lineHeight: 1 }}>★ {media}</span>
                    <span style={{ fontSize: "13px", color: "#888" }}>{musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"}</span>
                  </div>
                ) : (
                  <div style={{ display: "inline-flex", alignItems: "baseline", gap: "10px", background: "#1a1a1a", borderRadius: "10px", padding: "10px 20px" }}>
                    <span style={{ fontSize: "24px", fontWeight: "700", color: "#555", lineHeight: 1 }}>—</span>
                    <span style={{ fontSize: "13px", color: "#888" }}>sem votos ainda</span>
                  </div>
                )}
              </div>

              {ehAdmin(usuario) && (
                <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                  <button onClick={abrirEdicao} style={{ background: "none", border: "1px solid #ddd", borderRadius: "6px", padding: "5px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>
                    ✏️ Editar
                  </button>
                  <button onClick={toggleDestaque} style={{ background: musical.destaque ? "#F5C518" : "none", border: "1px solid #ddd", borderRadius: "6px", padding: "5px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: musical.destaque ? "#1a1a1a" : "#aaa", cursor: "pointer" }}>
                    {musical.destaque ? "★ Em destaque" : "☆ Destaque"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <button onClick={toggleJaVi} title="Marque se você já assistiu este musical" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: jaVi ? "#1a1a1a" : "transparent", color: jaVi ? "#F5C518" : "#888", border: "1px solid", borderColor: jaVi ? "#1a1a1a" : "#ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>
              {jaVi ? "✓ Já vi" : "Já vi"}
            </button>
            <button onClick={toggleQueroVer} title="Adicione à sua lista de musicais para assistir" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: queroVer ? "#F5C518" : "transparent", color: queroVer ? "#1a1a1a" : "#888", border: "1px solid", borderColor: queroVer ? "#F5C518" : "#ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>
              {queroVer ? "✓ Quero ver" : "+ Quero ver"}
              </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link copiado!") }} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "transparent", color: "#888", border: "1px solid #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>
              🔗 Copiar link
            </button>
            {musical.programaDigital && (
              <a href={musical.programaDigital} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#b8960a", color: "#1a1a1a", border: "1px solid #b8960a", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textDecoration: "none", fontWeight: "500" }}>
                📄 Baixe o programa digital
              </a>
            )}
          </div>

          {/* BLOCO DE SESSÕES */}
          {usuario && jaVi && (
            <div style={{ marginBottom: "24px", background: "#f5f5f0", border: "1px solid #e8e8e4", borderRadius: "10px", padding: "16px 20px" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
                📅 Suas sessões
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: mostrarFormSessao ? "16px" : "0" }}>
                {sessoes.map(s => (
                  <div key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#fff", border: "1px solid #e8e8e4", borderRadius: "99px", padding: "6px 14px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>
                      {labelChip(s)}
                    </span>
                    <span style={{ fontSize: "11px", color: s.publico ? "#5a9e6f" : "#aaa" }}>
                      {s.publico ? "🌐" : "🔒"}
                    </span>
                    <button
                      onClick={() => deletarSessao(s.id)}
                      style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: "13px", padding: "0", lineHeight: 1, display: "flex", alignItems: "center" }}
                      title="Remover sessão"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {!mostrarFormSessao && (
                  <button
                    onClick={() => setMostrarFormSessao(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "1px dashed #ccc", borderRadius: "99px", padding: "6px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}
                  >
                    + Nova sessão
                  </button>
                )}
              </div>

              {mostrarFormSessao && (
                <div style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "8px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ flex: "1 1 130px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>Data</label>
                      <input
                        type="date"
                        value={novaData}
                        onChange={e => setNovaData(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }}
                      />
                    </div>
                    <div style={{ flex: "1 1 100px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>Horário (opcional)</label>
                      <input
                        type="time"
                        value={novoHorario}
                        onChange={e => setNovoHorario(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }}
                      />
                    </div>
                    <div style={{ flex: "2 1 180px" }}>
  <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>Teatro (opcional)</label>
  <input
    type="text"
    value={novoTeatro}
    onChange={e => setNovoTeatro(e.target.value)}
    placeholder="ex: Teatro Santander"
    style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }}
  />
</div>
<div style={{ flex: "2 1 180px" }}>
  <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>Assento (opcional)</label>
  <input
    type="text"
    value={novoAssento}
    onChange={e => setNovoAssento(e.target.value)}
    placeholder="ex: Plateia A, fileira 10, cadeira 5"
    style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }}
  />
</div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                    <span style={{ fontSize: "13px", color: "#666" }}>
                      {novaSessaoPublica ? "🌐 Público — visível no seu perfil" : "🔒 Privado — só você vê"}
                    </span>
                    <div
                      onClick={() => setNovaSessaoPublica(prev => !prev)}
                      style={{
                        width: "40px", height: "22px", borderRadius: "11px", cursor: "pointer",
                        backgroundColor: novaSessaoPublica ? "#F5C518" : "#ccc",
                        position: "relative", transition: "background 0.2s", flexShrink: 0
                      }}
                    >
                      <div style={{
                        width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#fff",
                        position: "absolute", top: "3px",
                        left: novaSessaoPublica ? "21px" : "3px",
                        transition: "left 0.2s"
                      }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={salvarSessao} disabled={salvandoSessao} className="btn-comentar" style={{ fontSize: "13px", padding: "7px 16px" }}>
                      {salvandoSessao ? "Salvando..." : "Salvar"}
                    </button>
                    <button onClick={() => { setMostrarFormSessao(false); setNovaData(""); setNovoHorario(""); setNovoAssento(""); setNovaSessaoPublica(true) }} className="btn-sair" style={{ fontSize: "13px", padding: "7px 16px" }}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {musical.sinopse && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Sinopse</p>
              <p className="sinopse" style={{ marginBottom: 0 }}>{musical.sinopse}</p>
            </div>
          )}

          {musical.elenco && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Elenco de estreia</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {musical.elenco.split(",").map((nome) => {
                  const n = nome.trim()
                  return (
                    <a key={n} href={"/pessoa/" + encodeURIComponent(n)} style={{ display: "inline-flex", alignItems: "center", padding: "5px 12px", borderRadius: "999px", fontSize: "13px", border: "1px solid #F5C518", background: "#FFF8E1", color: "#7a5f00", textDecoration: "none" }}>
                      {n}
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {musical.elencoAdicional && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Elenco adicional</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {musical.elencoAdicional.split(",").map((nome) => {
                  const n = nome.trim()
                  return (
                    <a key={n} href={"/pessoa/" + encodeURIComponent(n)} style={{ display: "inline-flex", alignItems: "center", padding: "5px 12px", borderRadius: "999px", fontSize: "13px", border: "1px solid #F5C518", background: "#FFF8E1", color: "#7a5f00", textDecoration: "none" }}>
                      {n}
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          <hr className="divider" />

          {musical.totalVotos > 0 && musical.distribuicao && Object.keys(musical.distribuicao).length > 0 && (
            <div style={{ marginBottom: "24px", background: "#1a1a1a", borderRadius: "8px", padding: "16px 20px", display: "inline-block", minWidth: "280px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.08em", color: "#888" }}>Avaliações</span>
                <span style={{ fontSize: "11px", color: "#888" }}>{musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"}</span>
              </div>
              <div style={{ position: "relative" }}>
                {tooltipHistograma && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
                    transform: "translateX(-50%)", background: "#1a1a1a", color: "#fff",
                    padding: "5px 10px", borderRadius: "6px", fontSize: "12px", whiteSpace: "nowrap",
                    pointerEvents: "none", zIndex: 10, border: "1px solid #333"
                  }}>
                    <span style={{ color: "#F5C518" }}>{tooltipHistograma.chave}★</span>
                    {" — "}
                    {tooltipHistograma.val} {tooltipHistograma.val === 1 ? "voto" : "votos"}
                    {" (" + tooltipHistograma.pct + "%)"}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "32px", marginBottom: "6px" }}>
                  {["0.5","1","1.5","2","2.5","3","3.5","4","4.5","5"].map((chave, i, arr) => {
                    const d = musical.distribuicao || {}
                    const val = Number(d[chave]) || 0
                    const maxVal = Math.max(...arr.map(k => Number(d[k]) || 0), 1)
                    const altura = Math.max(Math.round((val / maxVal) * 100), val > 0 ? 5 : 0)
                    const pct = musical.totalVotos > 0 ? Math.round((val / musical.totalVotos) * 100) : 0
                    const posX = `${(i / (arr.length - 1)) * 100}%`
                    return (
                      <div key={chave} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", cursor: "pointer", position: "relative" }}
                        onMouseEnter={() => setTooltipHistograma({ chave, val, pct, x: posX })}
                        onMouseLeave={() => setTooltipHistograma(null)}
                      >
                        <div style={{
                          width: "100%", height: altura + "%",
                          background: Number(chave) % 1 !== 0 ? "#b8960a" : "#F5C518",
                          borderRadius: "2px 2px 0 0", minHeight: val > 0 ? "2px" : "0"
                        }} />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888" }}>
                <span>★</span>
                <span>★★★★★</span>
              </div>
            </div>
          )}

          <div ref={avaliacaoRef}>
            <p className="avaliacao-titulo">
              {votoAtual ? `Sua avaliação: ${votoAtual} ★ (clique para mudar)` : "Avalie este musical"}
            </p>

            <Estrelas votoAtual={votoAtual} onVotar={votar} />
          </div>

          {votoAtual && (
            <div style={{ marginBottom: "8px" }}>
              {confirmandoRemocao ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#888" }}>Remover sua avaliação?</span>
                  <button onClick={removerVoto} style={{ background: "none", border: "none", fontSize: "13px", color: "#cc0000", cursor: "pointer", padding: 0, fontWeight: "600" }}>
                    Sim, remover
                  </button>
                  <button onClick={() => setConfirmandoRemocao(false)} style={{ background: "none", border: "none", fontSize: "13px", color: "#888", cursor: "pointer", padding: 0 }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmandoRemocao(true)} style={{ background: "none", border: "none", fontSize: "12px", color: "#bbb", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                  Remover avaliação
                </button>
              )}
            </div>
          )}

          {votoAtual && (
            <div style={{ marginTop: "8px", marginBottom: "8px" }}>
              <div ref={cartaoRef} style={{ position: "absolute", left: "-9999px", top: "-9999px", background: "#2b2b2b", borderRadius: "16px", padding: "40px 32px", display: "flex", flexDirection: "column", alignItems: "center", width: "270px", minHeight: "420px", justifyContent: "flex-start", paddingTop: "48px" }}>
                {musical.capa ? (
                  <img src={musical.capa} alt={musical.titulo} crossOrigin="anonymous" style={{ width: "160px", height: "220px", objectFit: "cover", borderRadius: "8px", marginBottom: "20px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }} />
                ) : (
                  <div style={{ width: "160px", height: "220px", background: "#1a1a1a", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
                    <span style={{ color: "#F5C518", fontSize: "12px", textAlign: "center", padding: "12px" }}>{musical.titulo}</span>
                  </div>
                )}
                <p style={{ fontFamily: "Georgia, serif", fontSize: "15px", fontWeight: "700", color: "#ffffff", textAlign: "center", marginBottom: "6px", lineHeight: 1.3 }}>{musical.titulo}</p>
                <p style={{ fontSize: "10px", color: "#aaaaaa", textAlign: "center", marginBottom: "16px" }}>Dir. {musical.direcao || "—"}</p>
                <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>{estrelasSVG(votoAtual)}</div>
                <div style={{ width: "40px", height: "1px", background: "#ffffff", opacity: 0.15, marginBottom: "12px" }} />
                <p style={{ fontFamily: "Georgia, serif", fontSize: "11px", fontWeight: "700", color: "#F5C518", letterSpacing: "2px", textTransform: "uppercase", textAlign: "center", marginBottom: "4px" }}>Musicais Brasileiros Database</p>
                <p style={{ fontSize: "11px", color: "#aaaaaa", textAlign: "center", letterSpacing: "1px" }}>mbdb.com.br</p>
              </div>
              <div style={{ marginTop: "12px" }}>
                <button onClick={gerarImagem} disabled={gerando} style={{ background: "#F5C518", color: "#1a1a1a", border: "none", borderRadius: "6px", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: "500", cursor: gerando ? "wait" : "pointer" }}>
                  {gerando ? "Gerando..." : "⬇ Baixar imagem para compartilhar"}
                </button>
              </div>
            </div>
          )}

          <hr className="divider" />

          <ReportarErro musicalId={id} musicalTitulo={musical.titulo} usuario={usuario} />
          <hr className="divider" />

          <h2 className="comentarios-titulo">Comentários</h2>

          {usuario ? (
            <div className="comentario-form">
              <textarea value={textoComentario} onChange={e => setTextoComentario(e.target.value)} placeholder="Escreva um comentário..." />
              <p style={{ fontSize: "16px", color: "#8d6e01", marginBottom: "8px" }}>
                Lembre-se de manter sua crítica respeitosa e sem ataques gratuitos ao espetáculo.
              </p>
              <button className="btn-comentar" onClick={enviarComentario}>Enviar comentário</button>
            </div>
          ) : (
            <p className="login-aviso">Faça login para comentar.</p>
          )}

          {!usuario ? (
            <p className="login-aviso" style={{ marginTop: "16px" }}>Faça login para ver os comentários.</p>
          ) : comentarios.length === 0 ? (
            <p className="login-aviso" style={{ marginTop: "16px" }}>Nenhum comentário ainda.</p>
          ) : (
            comentarios.map(c => (
              <div key={c.id} className="comentario-item">
                <a href={`/perfil/${c.userId}`} className="comentario-nome" style={{ cursor: "pointer", textDecoration: "none", color: "inherit", display: "inline-flex", alignItems: "center" }}>
                  {c.nome || "Anônimo"}
                  {usuariosVerificados[c.userId] && <SeloVerificado />}
                  {c.estrelasComentario && (
                    <span style={{ marginLeft: "8px", color: "#b8960a", fontSize: "13px" }}>{c.estrelasComentario} ★</span>
                  )}
                </a>
                {editandoComentario !== null && editandoComentario === c.id ? (
                  <div>
                    <textarea value={textoEdicao} onChange={e => setTextoEdicao(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e8e8e4", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", marginBottom: "8px" }} />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button className="btn-comentar" onClick={() => salvarEdicao(c.id)}>Salvar</button>
                      <button className="btn-sair" onClick={() => setEditandoComentario(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="comentario-texto">{c.texto}</p>
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                      {["👍", "❤️", "😂", "😢"].map(emoji => {
                        const count = reacoes[c.id]?.[emoji] || 0
                        const ativo = minhaReacao[c.id] === emoji
                        return (
                          <button key={emoji} onClick={() => reagir(c.id, emoji)} style={{ background: ativo ? "#F5C518" : "#e0e0e0", border: ativo ? "1px solid #F5C518" : "1px solid #e8e8e4", borderRadius: "99px", padding: "3px 10px", fontSize: "13px", cursor: "pointer", color: "#1a1a1a", fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            {emoji} {count > 0 && <span>{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
                      {usuario && usuario.uid === c.userId && (
                        <>
                          <button onClick={() => { setEditandoComentario(c.id); setTextoEdicao(c.texto) }} style={{ background: "none", border: "none", fontSize: "13px", color: "#888", cursor: "pointer", padding: 0 }}>Editar</button>
                          <button onClick={() => deletarComentario(c.id)} style={{ background: "none", border: "none", fontSize: "13px", color: "#cc0000", cursor: "pointer", padding: 0 }}>Apagar</button>
                        </>
                      )}
                      {usuario && usuario.uid !== c.userId && (
                        <>
                          {denunciaEnviada === c.id ? (
                            <span style={{ fontSize: "13px", color: "#888" }}>Denúncia enviada!</span>
                          ) : denunciandoComentario === c.id ? (
                            <div style={{ width: "100%", marginTop: "8px" }}>
                              <textarea value={textoDenuncia} onChange={e => setTextoDenuncia(e.target.value)} placeholder="Descreva o motivo da denúncia..." style={{ width: "100%", height: "70px", padding: "8px", borderRadius: "6px", border: "1px solid #e8e8e4", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", marginBottom: "8px", resize: "none" }} />
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button className="btn-comentar" onClick={() => enviarDenuncia(c)} style={{ fontSize: "13px", padding: "6px 14px" }}>Enviar</button>
                                <button className="btn-sair" onClick={() => { setDenunciandoComentario(null); setTextoDenuncia("") }} style={{ fontSize: "13px", padding: "6px 14px" }}>Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setDenunciandoComentario(c.id)} style={{ background: "none", border: "none", fontSize: "13px", color: "#bbb", cursor: "pointer", padding: 0 }}>Denunciar</button>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </>
      )}
    </main>
  )
}

export default Musical
