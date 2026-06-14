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

const ADMIN_UID = "LFDNXIXywqQrLsDLobaGzOOmok03"

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
    <div>
      <div style={{ display: "flex", gap: "4px", fontSize: "36px", cursor: "pointer", marginBottom: "4px" }}>
        {[1, 2, 3, 4, 5].map(estrela => {
          const cheia = valorAtivo >= estrela
          const meia = valorAtivo >= estrela - 0.5 && valorAtivo < estrela
          return (
            <span
              key={estrela}
              onClick={e => onVotar(calcularValor(e, estrela))}
              onMouseMove={e => setHover(calcularValor(e, estrela))}
              onMouseLeave={() => setHover(0)}
              style={{ position: "relative", display: "inline-block", userSelect: "none", lineHeight: 1 }}
            >
              {meia ? (
                <>
                  <span style={{ color: "#ddd" }}>★</span>
                  <span style={{ position: "absolute", left: 0, top: 0, width: "50%", overflow: "hidden", color: "#F5C518" }}>★</span>
                </>
              ) : (
                <span style={{ color: cheia ? "#F5C518" : "#ddd" }}>★</span>
              )}
            </span>
          )
        })}
      </div>
      <p style={{ fontSize: "13px", color: "#888", height: "18px", marginBottom: "8px" }}>
        {hover ? LABELS[hover] : ""}
      </p>
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

  // Estados das sessões
  const [sessoes, setSessoes] = useState([])
  const [mostrarFormSessao, setMostrarFormSessao] = useState(false)
  const [novaData, setNovaData] = useState("")
  const [novoAssento, setNovoAssento] = useState("")
  const [novaSessaoPublica, setNovaSessaoPublica] = useState(true)
  const [salvandoSessao, setSalvandoSessao] = useState(false)
  const [novoHorario, setNovoHorario] = useState("")

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

  // Buscar sessões do usuário para este musical
  useEffect(() => {
    async function buscarSessoes() {
      if (!usuario) return
      const snap = await getDocs(
        query(
          collection(db, "usuarios", usuario.uid, "sessoesAssistidas"),
        )
      )
      const lista = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.musicalId === id)
        .sort((a, b) => (a.data > b.data ? -1 : 1))
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
      capa: musical.capa || ""
    })
    setEditandoMusical(true)
  }

  async function salvarEdicaoMusical() {
    await updateDoc(doc(db, "musicais", id), formEdicao)
    setMusical(prev => ({ ...prev, ...formEdicao }))
    setEditandoMusical(false)
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
      await updateDoc(doc(db, "musicais", id), {
        somaEstrelas: increment(estrelas - votoAtual),
        [`distribuicao.${chaveAntiga}`]: increment(-1),
        [`distribuicao.${chaveNova}`]: increment(1),
      })
      await setDoc(doc(db, "musicais", id, "votos", usuario.uid), { estrelas })
      setMusical(prev => ({
        ...prev,
        somaEstrelas: prev.somaEstrelas + (estrelas - votoAtual),
        distribuicao: {
          ...prev.distribuicao,
          [chaveAntiga]: Math.max((prev.distribuicao?.[chaveAntiga] || 1) - 1, 0),
          [chaveNova]: (prev.distribuicao?.[chaveNova] || 0) + 1,
        }
      }))
    } else {
      await setDoc(doc(db, "musicais", id, "votos", usuario.uid), { estrelas })
      await updateDoc(doc(db, "musicais", id), {
        totalVotos: increment(1),
        somaEstrelas: increment(estrelas),
        [`distribuicao.${chaveNova}`]: increment(1),
      })
      setMusical(prev => ({
        ...prev,
        totalVotos: prev.totalVotos + 1,
        somaEstrelas: prev.somaEstrelas + estrelas,
        distribuicao: {
          ...prev.distribuicao,
          [chaveNova]: (prev.distribuicao?.[chaveNova] || 0) + 1,
        }
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
    await deleteDoc(doc(db, "musicais", id, "votos", usuario.uid))
    await updateDoc(doc(db, "musicais", id), {
      totalVotos: increment(-1),
      somaEstrelas: increment(-votoAtual),
      [`distribuicao.${chave}`]: increment(-1),
    })
    setMusical(prev => ({
      ...prev,
      totalVotos: prev.totalVotos - 1,
      somaEstrelas: prev.somaEstrelas - votoAtual,
      distribuicao: {
        ...prev.distribuicao,
        [chave]: Math.max((prev.distribuicao?.[chave] || 1) - 1, 0),
      }
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
  publico: novaSessaoPublica,
}
    const docRef = await addDoc(
      collection(db, "usuarios", usuario.uid, "sessoesAssistidas"),
      novaSessao
    )
    setSessoes(prev => [{ id: docRef.id, ...novaSessao }, ...prev].sort((a, b) => (a.data > b.data ? -1 : 1)))
    setNovaData("")
    setNovoHorario("")
    setNovoAssento("")
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
      await deleteDoc(ref)
      setMinhaReacao(prev => { const next = { ...prev }; delete next[comentarioId]; return next })
      setReacoes(prev => {
        const next = { ...prev, [comentarioId]: { ...prev[comentarioId] } }
        next[comentarioId][emoji] = Math.max((next[comentarioId][emoji] || 1) - 1, 0)
        return next
      })
    } else {
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
          {campo("Elenco", "elenco")}
          {campo("Elenco adicional", "elencoAdicional")}
          {campo("Versionista", "versionista")}
          {campo("Texto original", "textoOriginal")}
          {campo("Música original", "musicaOriginal")}
          {campo("Ano", "ano")}
          {campo("Teatro de estreia", "teatro")}
          {campo("URL da capa", "capa")}
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
              <p className="musical-meta"><strong>Direção:</strong> {nomesClicaveis(musical.direcao) || "—"}</p>
              {musical.direcaoMusical && <p className="musical-meta"><strong>Direção musical:</strong> {nomesClicaveis(musical.direcaoMusical)}</p>}
              {musical.producao && <p className="musical-meta"><strong>Produção:</strong> {nomesClicaveis(musical.producao)}</p>}
              {musical.ano && <p className="musical-meta"><strong>Ano:</strong> {musical.ano}</p>}
              {musical.teatro && (() => {
                const t = encontrarTeatroPorNome(musical.teatro);
                return (
                  <p className="musical-meta">
                    <strong>Teatro de estreia:</strong>{" "}
                    {t ? (
                      <Link to={`/teatro/${t.id}`} style={{ color: "#b8960a", textDecoration: "none" }}>
                        {musical.teatro}
                      </Link>
                    ) : (
                      musical.teatro
                    )}
                  </p>
                );
              })()}
              {musical.versionista && <p className="musical-meta"><strong>Versionista:</strong> {nomesClicaveis(musical.versionista)}</p>}
              {musical.textoOriginal && <p className="musical-meta"><strong>Texto original:</strong> {nomesClicaveis(musical.textoOriginal)}</p>}
              {musical.musicaOriginal && <p className="musical-meta"><strong>Música original:</strong> {nomesClicaveis(musical.musicaOriginal)}</p>}
              {media ? (
                <div className="rating-grande">
                  ★ {media}
                  <span className="rating-grande-label">{musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"}</span>
                </div>
              ) : (
                <div className="rating-grande">— <span className="rating-grande-label">sem votos ainda</span></div>
              )}
              {usuario && usuario.uid === ADMIN_UID && (
                <button onClick={abrirEdicao} style={{ marginTop: "12px", background: "none", border: "1px solid #ccc", borderRadius: "6px", padding: "6px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}>
                  ✏️ Editar musical
                </button>
              )}
              {usuario && usuario.uid === ADMIN_UID && (
                <button onClick={toggleDestaque} style={{ marginTop: "8px", background: musical.destaque ? "#F5C518" : "none", border: "1px solid #ccc", borderRadius: "6px", padding: "6px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: musical.destaque ? "#1a1a1a" : "#888", cursor: "pointer" }}>
                  {musical.destaque ? "★ Em destaque" : "☆ Colocar em destaque"}
                </button>
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
          </div>

          {/* BLOCO DE SESSÕES — aparece só se o usuário estiver logado e tiver marcado "Já vi" */}
          {usuario && jaVi && (
            <div style={{ marginBottom: "24px", background: "#f5f5f0", border: "1px solid #e8e8e4", borderRadius: "10px", padding: "16px 20px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
                📅 Suas sessões
              </p>

              {/* Lista de sessões já registradas */}
              {sessoes.length > 0 && (
                <div style={{ marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {sessoes.map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", background: "#fff", border: "1px solid #e8e8e4", borderRadius: "8px", padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a1a" }}>
  {formatarData(s.data)}{s.horario ? ` às ${s.horario}` : ""}
</span>
                        {s.assento && (
                          <span style={{ fontSize: "13px", color: "#666" }}>
                            🪑 {s.assento}
                          </span>
                        )}
                        <span style={{ fontSize: "11px", color: s.publico ? "#5a9e6f" : "#999", background: s.publico ? "#eaf7ee" : "#f0f0f0", borderRadius: "20px", padding: "2px 8px" }}>
                          {s.publico ? "🌐 Público" : "🔒 Privado"}
                        </span>
                      </div>
                      <button
                        onClick={() => deletarSessao(s.id)}
                        style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: "16px", flexShrink: 0, padding: "0 4px" }}
                        title="Remover sessão"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário de nova sessão */}
              {mostrarFormSessao ? (
                <div style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "8px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
  <div style={{ flex: "1 1 140px" }}>
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
  <div style={{ flex: "2 1 200px" }}>
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

                  {/* Toggle público/privado */}
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
                    <button
                      onClick={salvarSessao}
                      disabled={salvandoSessao}
                      className="btn-comentar"
                      style={{ fontSize: "13px", padding: "7px 16px" }}
                    >
                      {salvandoSessao ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => { setMostrarFormSessao(false); setNovaData(""); setNovoAssento(""); setNovaSessaoPublica(true) }}
                      className="btn-sair"
                      style={{ fontSize: "13px", padding: "7px 16px" }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setMostrarFormSessao(true)}
                  style={{ background: "none", border: "1px dashed #ccc", borderRadius: "8px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer", width: "100%" }}
                >
                  + Registrar nova sessão
                </button>
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
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Elenco</p>
              <p style={{ fontSize: "15px", lineHeight: "1.75" }}>{nomesClicaveis(musical.elenco)}</p>
            </div>
          )}

          {musical.elencoAdicional && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Elenco adicional</p>
              <p style={{ fontSize: "15px", lineHeight: "1.75" }}>{nomesClicaveis(musical.elencoAdicional)}</p>
            </div>
          )}

          <hr className="divider" />

          {musical.totalVotos > 0 && musical.distribuicao && (
            <div style={{ marginBottom: "24px", background: "#1a1a1a", borderRadius: "8px", padding: "16px 20px", display: "inline-block", minWidth: "280px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.08em", color: "#888" }}>Avaliações</span>
                <span style={{ fontSize: "11px", color: "#888" }}>{musical.totalVotos} {musical.totalVotos === 1 ? "voto" : "votos"}</span>
              </div>
              <div style={{ position: "relative" }}>
                {tooltipHistograma && (
                  <div style={{
                    position: "absolute", bottom: "calc(100% + 6px)", left: tooltipHistograma.x,
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
                    const val = d[chave] || 0
                    const maxVal = Math.max(...arr.map(k => d[k] || 0))
                    const altura = maxVal > 0 ? Math.max(Math.round((val / maxVal) * 100), val > 0 ? 5 : 0) : 0
                    const pct = musical.totalVotos > 0 ? Math.round((val / musical.totalVotos) * 100) : 0
                    const posX = `${(arr.indexOf(chave) / (arr.length - 1)) * 100}%`
                    return (
                      <div key={chave} style={{ flex: 1, height: "100%", display: "flex", alignItems: "flex-end", cursor: "pointer" }}
                        onMouseEnter={() => setTooltipHistograma({ chave, val, pct, x: posX })}
                        onMouseLeave={() => setTooltipHistograma(null)}
                      >
                        <div style={{
                          width: "100%",
                          height: altura + "%",
                          background: Number(chave) % 1 !== 0 ? "#b8960a" : "#F5C518",
                          borderRadius: "2px 2px 0 0",
                          minHeight: val > 0 ? "2px" : "0"
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

          <p className="avaliacao-titulo">
            {votoAtual ? `Sua avaliação: ${votoAtual} ★ (clique para mudar)` : "Avalie este musical"}
          </p>

          <Estrelas votoAtual={votoAtual} onVotar={votar} />

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
                <button
                  onClick={() => setConfirmandoRemocao(true)}
                  style={{ background: "none", border: "none", fontSize: "12px", color: "#bbb", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
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
              <textarea
                value={textoComentario}
                onChange={e => setTextoComentario(e.target.value)}
                placeholder="Escreva um comentário..."
              />
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
                    <textarea
                      value={textoEdicao}
                      onChange={e => setTextoEdicao(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #e8e8e4", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", marginBottom: "8px" }}
                    />
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
                          <button
                            key={emoji}
                            onClick={() => reagir(c.id, emoji)}
                            style={{
                              background: ativo ? "#F5C518" : "#e0e0e0",
                              border: ativo ? "1px solid #F5C518" : "1px solid #e8e8e4",
                              borderRadius: "99px",
                              padding: "3px 10px",
                              fontSize: "13px",
                              cursor: "pointer",
                              color: "#1a1a1a",
                              fontFamily: "'DM Sans', sans-serif",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            {emoji} {count > 0 && <span>{count}</span>}
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
                      {usuario && usuario.uid === c.userId && (
                        <>
                          <button onClick={() => { setEditandoComentario(c.id); setTextoEdicao(c.texto) }} style={{ background: "none", border: "none", fontSize: "13px", color: "#888", cursor: "pointer", padding: 0 }}>
                            Editar
                          </button>
                          <button onClick={() => deletarComentario(c.id)} style={{ background: "none", border: "none", fontSize: "13px", color: "#cc0000", cursor: "pointer", padding: 0 }}>
                            Apagar
                          </button>
                        </>
                      )}
                      {usuario && usuario.uid !== c.userId && (
                        <>
                          {denunciaEnviada === c.id ? (
                            <span style={{ fontSize: "13px", color: "#888" }}>Denúncia enviada!</span>
                          ) : denunciandoComentario === c.id ? (
                            <div style={{ width: "100%", marginTop: "8px" }}>
                              <textarea
                                value={textoDenuncia}
                                onChange={e => setTextoDenuncia(e.target.value)}
                                placeholder="Descreva o motivo da denúncia..."
                                style={{ width: "100%", height: "70px", padding: "8px", borderRadius: "6px", border: "1px solid #e8e8e4", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", marginBottom: "8px", resize: "none" }}
                              />
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button className="btn-comentar" onClick={() => enviarDenuncia(c)} style={{ fontSize: "13px", padding: "6px 14px" }}>Enviar</button>
                                <button className="btn-sair" onClick={() => { setDenunciandoComentario(null); setTextoDenuncia("") }} style={{ fontSize: "13px", padding: "6px 14px" }}>Cancelar</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setDenunciandoComentario(c.id)} style={{ background: "none", border: "none", fontSize: "13px", color: "#bbb", cursor: "pointer", padding: 0 }}>
                              Denunciar
                            </button>
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
