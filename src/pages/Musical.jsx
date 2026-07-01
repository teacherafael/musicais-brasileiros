import { Helmet } from "react-helmet-async"
import { useEffect, useState, useRef } from "react"
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, deleteDoc, increment } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useParams, useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import ReportarErro from "../components/ReportarErro"
import html2canvas from "html2canvas"
import { Link } from "react-router-dom";
import { encontrarTeatroPorNome } from "../data/teatros";
import { ehAdmin } from "../admins";

function nomesClicaveis(texto) {
  if (!texto) return null
  return texto.split(",").map((nome, i, arr) => (
    <span key={i}>
      <Link
        to={"/pessoa/" + encodeURIComponent(nome.trim())}
        style={{ color: "#444", borderBottom: "1px dotted #aaa", textDecoration: "none" }}
      >
        {nome.trim()}
      </Link>
      {i < arr.length - 1 ? ", " : ""}
    </span>
  ))
}

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

// Bloco "Equipe" da exibição: complementares na ordem fixa + cargos livres ao final
function equipeSecundariaOrdenada(equipeCriativa) {
  if (!equipeCriativa || equipeCriativa.length === 0) return []
  const fixas = COMPLEMENTARES
    .map(funcao => equipeCriativa.find(item => item.funcao === funcao && item.nomes && item.nomes.length > 0))
    .filter(Boolean)
  const conhecidas = [...ESSENCIAIS, ...COMPLEMENTARES, "Músicos"]
  const livres = equipeCriativa.filter(item =>
    !conhecidas.includes(item.funcao) && item.nomes && item.nomes.length > 0
  )
  return [...fixas, ...livres]
}

function montarEquipeDeStrings(direcao, direcaoMusical) {
  const equipe = []
  const d = (direcao || "").split(",").map(n => n.trim()).filter(Boolean)
  const dm = (direcaoMusical || "").split(",").map(n => n.trim()).filter(Boolean)
  if (d.length > 0) equipe.push({ funcao: "Direção", nomes: d })
  if (dm.length > 0) equipe.push({ funcao: "Direção Musical", nomes: dm })
  return equipe
}

// Monta as linhas do editor: essenciais (de equipeCriativa ou do campo plano) + complementares + livres
function equipeParaEditor(musical) {
  const ec = Array.isArray(musical.equipeCriativa) ? musical.equipeCriativa : []
  const essenciais = ESSENCIAIS.map(funcao => {
    const noArray = ec.find(e => e.funcao === funcao && e.nomes && e.nomes.length > 0)
    const nomesTexto = noArray ? noArray.nomes.join(", ") : (musical[ESSENCIAL_CAMPO[funcao]] || "")
    return { funcao, nomesTexto, essencial: true }
  })
  const complementares = COMPLEMENTARES.map(funcao => {
    const noArray = ec.find(e => e.funcao === funcao && e.nomes && e.nomes.length > 0)
    return { funcao, nomesTexto: noArray ? noArray.nomes.join(", ") : "", essencial: false }
  })
  const conhecidas = [...ESSENCIAIS, ...COMPLEMENTARES]
  const livres = ec
    .filter(e => !conhecidas.includes(e.funcao) && e.funcao !== "Músicos" && e.nomes && e.nomes.length > 0)
    .map(e => ({ funcao: "", nomesTexto: e.nomes.join(", "), livre: true, cargoTexto: e.funcao }))
  return [...essenciais, ...complementares, ...livres]
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
                position: "relative", display: "inline-flex", alignItems: "center",
                justifyContent: "center", width: "48px", height: "48px", fontSize: "40px",
                userSelect: "none", lineHeight: 1, cursor: "pointer",
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
  const [editandoMusical, setEditandoMusical] = useState(false)
  const [formEdicao, setFormEdicao] = useState({})
  const [equipeEdicao, setEquipeEdicao] = useState([])
  const [teatrosAdicionais, setTeatrosAdicionais] = useState([])
  const [musicosEdicao, setMusicosEdicao] = useState([])
  const [gerando, setGerando] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false)
  const cartaoRef = useRef(null)
  const avaliacaoRef = useRef(null)

  const [minhaReacao, setMinhaReacao] = useState(null)
  const [totalGostei, setTotalGostei] = useState(0)
  const [totalNaoGostei, setTotalNaoGostei] = useState(0)

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
    document.title = `${musical.titulo} | MCDb`
    return () => { document.title = "MCDb" }
  }, [musical])

  useEffect(() => {
    async function buscarMusical() {
      const docSnap = await getDoc(doc(db, "musicais", id))
      if (docSnap.exists()) setMusical({ id: docSnap.id, ...docSnap.data() })
    }
    buscarMusical()
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

  // Totais de reações vêm dos contadores já gravados no documento do musical
  // (totalLikes / totalDislikes) — evita ler a subcoleção inteira a cada visita.
  useEffect(() => {
    if (!musical) return
    setTotalGostei(Number(musical.totalLikes) || 0)
    setTotalNaoGostei(Number(musical.totalDislikes) || 0)
  }, [musical])

  // Lê apenas a reação do próprio usuário (1 leitura) para destacar o botão ativo.
  useEffect(() => {
    async function buscarMinhaReacao() {
      if (!usuario) { setMinhaReacao(null); return }
      const snap = await getDoc(doc(db, "musicais", id, "reacoes", usuario.uid))
      setMinhaReacao(snap.exists() ? snap.data().reacao : null)
    }
    buscarMinhaReacao()
  }, [id, usuario])

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

  async function toggleReacao(tipo) {
    if (!usuario) return mostrarToast("Faça login para reagir.")
    const refMusical = doc(db, "musicais", id, "reacoes", usuario.uid)
    const refUsuario = doc(db, "usuarios", usuario.uid, "reacoes", id)
    const refContador = doc(db, "musicais", id)

    if (minhaReacao === tipo) {
      // Remove reação
      await Promise.all([deleteDoc(refMusical), deleteDoc(refUsuario)])
      await updateDoc(refContador, {
        [tipo === "gostei" ? "totalLikes" : "totalDislikes"]: increment(-1)
      })
      setMinhaReacao(null)
      if (tipo === "gostei") setTotalGostei(p => Math.max(0, p - 1))
      else setTotalNaoGostei(p => Math.max(0, p - 1))
    } else {
      const anterior = minhaReacao
      const dadosReacao = { reacao: tipo, uid: usuario.uid, musicalId: id, titulo: musical?.titulo || "", capa: musical?.capa || "" }
      const campoNovo = tipo === "gostei" ? "totalLikes" : "totalDislikes"
      const campoAnterior = anterior === "gostei" ? "totalLikes" : anterior === "nao_gostei" ? "totalDislikes" : null

      const atualizacaoContador = { [campoNovo]: increment(1) }
      if (campoAnterior) atualizacaoContador[campoAnterior] = increment(-1)

      await Promise.all([
        setDoc(refMusical, { reacao: tipo, uid: usuario.uid }),
        setDoc(refUsuario, dadosReacao),
        updateDoc(refContador, atualizacaoContador)
      ])
      setMinhaReacao(tipo)
      if (tipo === "gostei") {
        setTotalGostei(p => p + 1)
        if (anterior === "nao_gostei") setTotalNaoGostei(p => Math.max(0, p - 1))
      } else {
        setTotalNaoGostei(p => p + 1)
        if (anterior === "gostei") setTotalGostei(p => Math.max(0, p - 1))
      }
    }
  }

  function abrirEdicao() {
    setFormEdicao({
      titulo: musical.titulo || "", sinopse: musical.sinopse || "",
      elenco: musical.elenco || "", elencoAdicional: musical.elencoAdicional || "",
      ano: musical.ano || "", teatro: musical.teatro || "",
      capa: musical.capa || "", programaDigital: musical.programaDigital || "",
      tituloOriginal: musical.tituloOriginal || ""
    })
    setEquipeEdicao(equipeParaEditor(musical))
    let listaTeatros = musical.teatros || []
    if (listaTeatros.length === 0 && musical.teatro) {
      listaTeatros = [{ ano: musical.ano || "", teatros: [musical.teatro] }]
      if (musical.teatrosAdicionais) {
        musical.teatrosAdicionais.forEach(item => listaTeatros.push({ ano: item.ano, teatros: item.teatros }))
      }
    }
    setTeatrosAdicionais(listaTeatros.map(item => ({ ...item, teatrosTexto: item.teatros.join(", ") })))
    // Carrega músicos existentes ou começa vazio
    const musicosExistentes = Array.isArray(musical.musicos) ? musical.musicos : []
    setMusicosEdicao(musicosExistentes.map(item => ({ local: item.local || "", nomesTexto: (item.nomes || []).join(", ") })))
    setEditandoMusical(true)
  }

  function adicionarCargoLivre() {
    setEquipeEdicao([...equipeEdicao, { funcao: "", nomesTexto: "", livre: true, cargoTexto: "" }])
  }

  function mudarNomes(index, texto) {
    const novo = [...equipeEdicao]
    novo[index] = { ...novo[index], nomesTexto: texto }
    setEquipeEdicao(novo)
  }

  function mudarCargoLivre(index, texto) {
    const novo = [...equipeEdicao]
    novo[index] = { ...novo[index], cargoTexto: texto }
    setEquipeEdicao(novo)
  }

  function removerLinhaEquipe(index) {
    setEquipeEdicao(equipeEdicao.filter((_, i) => i !== index))
  }

  async function salvarEdicaoMusical() {
    const teatrosLimpos = teatrosAdicionais
      .map(item => ({ ano: item.ano.trim(), teatros: item.teatrosTexto.split(",").map(t => t.trim()).filter(Boolean) }))
      .filter(item => item.ano && item.teatros.length > 0)

    // Essenciais → campos planos
    const planos = {}
    ESSENCIAIS.forEach(funcao => {
      const row = equipeEdicao.find(r => r.essencial && r.funcao === funcao)
      const nomes = row ? row.nomesTexto.split(",").map(n => n.trim()).filter(Boolean) : []
      planos[ESSENCIAL_CAMPO[funcao]] = nomes.join(", ")
    })

    // Complementares + cargos livres → equipeCriativa
    const equipeCriativa = equipeEdicao
      .filter(r => !r.essencial)
      .map(r => ({
        funcao: r.livre ? (r.cargoTexto || "").trim() : r.funcao,
        nomes: r.nomesTexto.split(",").map(n => n.trim()).filter(Boolean)
      }))
      .filter(e => e.funcao && e.nomes.length > 0)

    const musicosLimpos = musicosEdicao
      .map(item => ({ local: item.local.trim(), nomes: item.nomesTexto.split(",").map(n => n.trim()).filter(Boolean) }))
      .filter(item => item.local && item.nomes.length > 0)

    const dadosFinais = {
      ...formEdicao,
      direcao: planos.direcao,
      direcaoMusical: planos.direcaoMusical,
      versionista: planos.versionista,
      textoOriginal: planos.textoOriginal,
      musicaOriginal: planos.musicaOriginal,
      producao: planos.producao,
      equipeCriativa,
      teatro: teatrosLimpos[0]?.teatros[0] || "",
      teatros: teatrosLimpos,
      teatrosAdicionais: [],
      musicos: musicosLimpos,
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
    const entrandoNaContagem = !jaVi && !queroVer
    await setDoc(doc(db, "musicais", id, "votos", usuario.uid), { estrelas })
    await setDoc(doc(db, "usuarios", usuario.uid, "jaVi", id), {
      musicalId: id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || ""
    })
    await deleteDoc(doc(db, "usuarios", usuario.uid, "queroVer", id))
    if (entrandoNaContagem) {
      try { await updateDoc(doc(db, "musicais", id), { popularidade: increment(1) }) }
      catch (e) { console.error("popularidade", e) }
    }
    setVotoAtual(estrelas)
    setJaVi(true)
    setQueroVer(false)
    mostrarToast("Avaliação salva!")
  }

  async function removerVoto() {
    await deleteDoc(doc(db, "musicais", id, "votos", usuario.uid))
    setVotoAtual(null)
    setConfirmandoRemocao(false)
    mostrarToast("Avaliação removida.")
  }

  async function toggleQueroVer() {
    if (!usuario) return mostrarToast("Faça login para usar esta função.")
    const refQueroVer = doc(db, "usuarios", usuario.uid, "queroVer", id)
    const refJaVi = doc(db, "usuarios", usuario.uid, "jaVi", id)
    const mRef = doc(db, "musicais", id)
    if (queroVer) {
      await deleteDoc(refQueroVer)
      try { await updateDoc(mRef, { popularidade: increment(-1) }) } catch (e) { console.error("popularidade", e) }
      setQueroVer(false)
    } else {
      const entrandoNaContagem = !jaVi
      await setDoc(refQueroVer, { musicalId: id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" })
      await deleteDoc(refJaVi)
      if (entrandoNaContagem) {
        try { await updateDoc(mRef, { popularidade: increment(1) }) } catch (e) { console.error("popularidade", e) }
      }
      setQueroVer(true)
      setJaVi(false)
    }
  }

  async function toggleJaVi() {
    if (!usuario) return mostrarToast("Faça login para usar esta função.")
    const refJaVi = doc(db, "usuarios", usuario.uid, "jaVi", id)
    const refQueroVer = doc(db, "usuarios", usuario.uid, "queroVer", id)
    const mRef = doc(db, "musicais", id)
    if (jaVi) {
      await deleteDoc(refJaVi)
      try { await updateDoc(mRef, { popularidade: increment(-1) }) } catch (e) { console.error("popularidade", e) }
      setJaVi(false)
    } else {
      const entrandoNaContagem = !queroVer
      await setDoc(refJaVi, { musicalId: id, titulo: musical.titulo, capa: musical.capa || null, direcao: musical.direcao || "" })
      await deleteDoc(refQueroVer)
      if (entrandoNaContagem) {
        try { await updateDoc(mRef, { popularidade: increment(1) }) } catch (e) { console.error("popularidade", e) }
      }
      setJaVi(true)
      setQueroVer(false)
      setTimeout(() => { avaliacaoRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }) }, 100)
    }
  }

  async function salvarSessao() {
    if (!usuario) return
    if (!novaData) return mostrarToast("Informe a data da sessão.")
    setSalvandoSessao(true)
    const novaSessao = {
      musicalId: id, titulo: musical.titulo, capa: musical.capa || null,
      direcao: musical.direcao || "", data: novaData, horario: novoHorario.trim(),
      assento: novoAssento.trim(), teatro: novoTeatro.trim(), publico: novaSessaoPublica,
    }
    const docRef = await addDoc(collection(db, "usuarios", usuario.uid, "sessoesAssistidas"), novaSessao)
    setSessoes(prev =>
      [{ id: docRef.id, ...novaSessao }, ...prev].sort((a, b) => {
        const da = a.data + (a.horario || "")
        const db2 = b.data + (b.horario || "")
        return da > db2 ? -1 : 1
      })
    )
    setNovaData(""); setNovoAssento(""); setNovoTeatro(""); setNovaSessaoPublica(true)
    setMostrarFormSessao(false); setSalvandoSessao(false)
    mostrarToast("Sessão registrada!")
  }

  async function deletarSessao(sessaoId) {
    if (!window.confirm("Remover este registro de sessão?")) return // confirmação mantida — ação destrutiva
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

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
      )
      if (!blob) { setGerando(false); return }

      const arquivo = new File([blob], `${musical.titulo}-mcdb.png`, {
        type: "image/png",
      })

      let compartilhou = false

      // tenta o compartilhamento nativo (folha do iOS com Instagram, etc.)
      if (navigator.canShare && navigator.canShare({ files: [arquivo] })) {
        try {
          await navigator.share({ files: [arquivo] })
          compartilhou = true
        } catch (err) {
          if (err.name === "AbortError") {
            compartilhou = true // usuário cancelou de propósito → não baixa
          }
          // qualquer outro erro: cai pro download abaixo
        }
      }

      // se não conseguiu compartilhar, baixa a imagem (fallback)
      if (!compartilhou) {
        const link = document.createElement("a")
        link.download = `${musical.titulo}-mcdb.png`
        link.href = canvas.toDataURL("image/png")
        link.click()
      }
    } catch (e) { mostrarToast("Erro ao gerar imagem. Tente novamente.") }
    setGerando(false)
  }

  if (!musical) return <main><p>Carregando...</p></main>

  const equipeSecundaria = equipeSecundariaOrdenada(musical.equipeCriativa)
  const musicosExibicao = Array.isArray(musical.musicos) ? musical.musicos.filter(m => m.local && m.nomes && m.nomes.length > 0) : []
  const temBlocoEquipe = equipeSecundaria.length > 0 || musicosExibicao.length > 0

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
        <textarea value={formEdicao[chave] || ""} onChange={e => setFormEdicao(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", height: "100px", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none", resize: "vertical" }} />
      ) : (
        <input type="text" value={formEdicao[chave] || ""} onChange={e => setFormEdicao(prev => ({ ...prev, [chave]: e.target.value }))}
          style={{ width: "100%", padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none" }} />
      )}
    </div>
  )

  const equipeBase = (musical.equipeCriativa && musical.equipeCriativa.length > 0)
    ? musical.equipeCriativa
    : montarEquipeDeStrings(musical.direcao, musical.direcaoMusical)
  const itemDirecao = equipeBase.find(e => e.funcao === "Direção")
  const itemDirecaoMusical = equipeBase.find(e => e.funcao === "Direção Musical")

  const inputEquipeStyle = { flex: 1, padding: "10px 14px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", outline: "none" }
  const cargoLivreStyle = { width: "150px", padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", flexShrink: 0 }

  return (
    <main>
      <Helmet>
        <title>{musical.titulo} — MCDb</title>
        <meta name="description" content={musical.sinopse || `Veja informações sobre ${musical.titulo} no MCDb.`} />
        <meta property="og:title" content={musical.titulo} />
        <meta property="og:description" content={musical.sinopse || `Veja informações sobre ${musical.titulo} no MCDb.`} />
        {musical.capa && <meta property="og:image" content={musical.capa} />}
        <meta property="og:url" content={`https://mcdb.musicalcast.com.br/musical/${id}`} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      {toast && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "#1a1a1a", color: "#F5C518", padding: "12px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: "500", zIndex: 999, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}

      <button className="voltar" onClick={() => navigate(-1)}>← Voltar</button>

      {editandoMusical ? (
        <div style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", marginBottom: "24px" }}>Editar musical</h2>
          {campo("Título", "titulo")}
          {campo("Título original", "tituloOriginal")}
          {campo("Sinopse", "sinopse", true)}

          {/* Editor de equipe (essenciais + complementares + cargos livres) */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>Equipe</label>
            {equipeEdicao.map((item, i) => {
              const mostrarDivisor = i === ESSENCIAIS.length
              if (item.livre) {
                return (
                  <div key={i}>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                      <input type="text" placeholder="Cargo" value={item.cargoTexto || ""} onChange={e => mudarCargoLivre(i, e.target.value)} style={cargoLivreStyle} />
                      <input type="text" placeholder="Nomes (separados por vírgula)" value={item.nomesTexto} onChange={e => mudarNomes(i, e.target.value)} style={inputEquipeStyle} />
                      <button onClick={() => removerLinhaEquipe(i)} style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "16px", padding: "10px 4px" }} title="Remover">✕</button>
                    </div>
                  </div>
                )
              }
              return (
                <div key={i}>
                  {mostrarDivisor && <div style={{ borderTop: "1px solid #eee", margin: "14px 0 12px" }} />}
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                    <span style={{ width: "150px", fontSize: "14px", fontWeight: item.essencial ? "600" : "400", color: item.essencial ? "#1a1a1a" : "#444", flexShrink: 0 }}>{item.funcao}</span>
                    <input type="text" placeholder="Nomes (separados por vírgula)" value={item.nomesTexto} onChange={e => mudarNomes(i, e.target.value)} style={inputEquipeStyle} />
                  </div>
                </div>
              )
            })}
            <button onClick={adicionarCargoLivre} style={{ background: "none", border: "1px dashed #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer", marginTop: "4px" }}>
              + Adicionar cargo
            </button>
          </div>

          {campo("Elenco de estreia", "elenco")}
          {campo("Elenco adicional", "elencoAdicional")}

          {/* Editor de músicos por local */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
              Músicos (por local)
            </label>
            {musicosEdicao.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                <input type="text" placeholder="Local (ex: São Paulo)" value={item.local}
                  onChange={e => { const novo = [...musicosEdicao]; novo[i] = { ...novo[i], local: e.target.value }; setMusicosEdicao(novo) }}
                  style={{ width: "160px", padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none", flexShrink: 0 }} />
                <input type="text" placeholder="Nomes (separados por vírgula)" value={item.nomesTexto}
                  onChange={e => { const novo = [...musicosEdicao]; novo[i] = { ...novo[i], nomesTexto: e.target.value }; setMusicosEdicao(novo) }}
                  style={{ flex: 1, padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
                <button onClick={() => setMusicosEdicao(musicosEdicao.filter((_, idx) => idx !== i))}
                  style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "16px", padding: "10px 4px" }} title="Remover">✕</button>
              </div>
            ))}
            <button onClick={() => setMusicosEdicao([...musicosEdicao, { local: "", nomesTexto: "" }])}
              style={{ background: "none", border: "1px dashed #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}>
              + Adicionar local
            </button>
          </div>

          {campo("Ano", "ano")}
          {campo("Teatro de estreia", "teatro")}

          {/* Editor de teatros */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "500", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>
              Teatros (o primeiro da lista é considerado a estreia)
            </label>
            {teatrosAdicionais.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button onClick={() => moverTeatro(i, -1)} disabled={i === 0}
                    style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: "4px", padding: "2px 6px", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#ddd" : "#888", fontSize: "12px" }} title="Mover para cima">▲</button>
                  <button onClick={() => moverTeatro(i, 1)} disabled={i === teatrosAdicionais.length - 1}
                    style={{ background: "none", border: "1px solid #e8e8e4", borderRadius: "4px", padding: "2px 6px", cursor: i === teatrosAdicionais.length - 1 ? "default" : "pointer", color: i === teatrosAdicionais.length - 1 ? "#ddd" : "#888", fontSize: "12px" }} title="Mover para baixo">▼</button>
                </div>
                <input type="text" placeholder="Ano" value={item.ano}
                  onChange={e => { const novo = [...teatrosAdicionais]; novo[i] = { ...novo[i], ano: e.target.value }; setTeatrosAdicionais(novo) }}
                  style={{ width: "90px", padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
                <input type="text" placeholder="Teatros (separados por vírgula)" value={item.teatrosTexto}
                  onChange={e => { const novo = [...teatrosAdicionais]; novo[i] = { ...novo[i], teatrosTexto: e.target.value }; setTeatrosAdicionais(novo) }}
                  style={{ flex: 1, padding: "10px 12px", border: "1px solid #e8e8e4", borderRadius: "8px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
                <button onClick={() => setTeatrosAdicionais(teatrosAdicionais.filter((_, idx) => idx !== i))}
                  style={{ background: "none", border: "none", color: "#cc0000", cursor: "pointer", fontSize: "16px", padding: "10px 4px" }} title="Remover">✕</button>
              </div>
            ))}
            <button onClick={() => setTeatrosAdicionais([...teatrosAdicionais, { ano: "", teatrosTexto: "" }])}
              style={{ background: "none", border: "1px dashed #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}>
              + Adicionar teatro
            </button>
          </div>

          {campo("URL da capa", "capa")}
          {campo("Link do programa digital (Google Drive)", "programaDigital")}

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
          {/* ── BLOCO PRINCIPAL: pôster + ficha técnica ── */}
          <div className="musical-header">
            <div className="musical-poster">
              {musical.capa
                ? <img src={musical.capa} alt={musical.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
                : musical.titulo}
            </div>
            <div>
              <h1 className="musical-titulo">{musical.titulo}</h1>

              {musical.tituloOriginal && (
                <p style={{ fontSize: "16px", color: "#888", fontStyle: "italic", marginBottom: "12px", marginTop: "-4px" }}>
                  {musical.tituloOriginal}
                </p>
              )}

              <p style={{ fontSize: "15px", color: "#444", marginBottom: "6px" }}>
                <strong style={{ color: "#1a1a1a" }}>Direção:</strong>{" "}
                {itemDirecao ? nomesClicaveis(itemDirecao.nomes.join(", ")) : (nomesClicaveis(musical.direcao) || "—")}
              </p>
              {(itemDirecaoMusical || musical.direcaoMusical) && (
                <p style={{ fontSize: "15px", color: "#444", marginBottom: "6px" }}>
                  <strong style={{ color: "#1a1a1a" }}>Direção musical:</strong>{" "}
                  {itemDirecaoMusical ? nomesClicaveis(itemDirecaoMusical.nomes.join(", ")) : nomesClicaveis(musical.direcaoMusical)}
                </p>
              )}
              {musical.versionista && (
                <p style={{ fontSize: "15px", color: "#444", marginBottom: "6px" }}>
                  <strong style={{ color: "#1a1a1a" }}>Versionista:</strong>{" "}{nomesClicaveis(musical.versionista)}
                </p>
              )}
              {musical.textoOriginal && (
                <p style={{ fontSize: "15px", color: "#444", marginBottom: "6px" }}>
                  <strong style={{ color: "#1a1a1a" }}>Texto original:</strong>{" "}{nomesClicaveis(musical.textoOriginal)}
                </p>
              )}
              {musical.musicaOriginal && (
                <p style={{ fontSize: "15px", color: "#444", marginBottom: "6px" }}>
                  <strong style={{ color: "#1a1a1a" }}>Música original:</strong>{" "}{nomesClicaveis(musical.musicaOriginal)}
                </p>
              )}
              {musical.producao && (
                <p style={{ fontSize: "15px", color: "#444", marginBottom: "6px" }}>
                  <strong style={{ color: "#1a1a1a" }}>Produção:</strong>{" "}{nomesClicaveis(musical.producao)}
                </p>
              )}

              {/* Teatros */}
              {(musical.teatros?.length > 0 || musical.teatro) && (() => {
                const listaBase = musical.teatros && musical.teatros.length > 0
                  ? musical.teatros
                  : musical.teatro ? [{ ano: musical.ano || "", teatros: [musical.teatro] }, ...(musical.teatrosAdicionais || [])] : []
                const linhas = listaBase.map((item, i) => ({ ...item, estreia: i === 0 }))
                return (
                  <div style={{ marginTop: "10px" }}>
                    <p style={{ fontSize: "15px", color: "#444", marginBottom: "6px" }}><strong style={{ color: "#1a1a1a" }}>Teatros:</strong></p>
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
                                      {t.id ? <Link to={`/teatro/${t.id}`} style={{ color: "#b8960a", textDecoration: "none" }}>{t.nome}</Link> : t.nome}
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

              {ehAdmin(usuario) && (
                <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
                  <button onClick={abrirEdicao} style={{ background: "none", border: "1px solid #ddd", borderRadius: "6px", padding: "5px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#aaa", cursor: "pointer" }}>✏️ Editar</button>
                  <button onClick={toggleDestaque} style={{ background: musical.destaque ? "#F5C518" : "none", border: "1px solid #ddd", borderRadius: "6px", padding: "5px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: musical.destaque ? "#1a1a1a" : "#aaa", cursor: "pointer" }}>
                    {musical.destaque ? "★ Em destaque" : "☆ Destaque"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── BOTÕES DE AÇÃO ── */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
            <button onClick={toggleJaVi}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: jaVi ? "#1a1a1a" : "transparent", color: jaVi ? "#F5C518" : "#888", border: "1px solid", borderColor: jaVi ? "#1a1a1a" : "#ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>
              {jaVi ? "✓ Já vi" : "Já vi"}
            </button>
            <button onClick={toggleQueroVer}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: queroVer ? "#F5C518" : "transparent", color: queroVer ? "#1a1a1a" : "#888", border: "1px solid", borderColor: queroVer ? "#F5C518" : "#ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>
              {queroVer ? "✓ Quero ver" : "+ Quero ver"}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(window.location.href); mostrarToast("Link copiado!") }}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "transparent", color: "#888", border: "1px solid #ccc", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", cursor: "pointer" }}>
              🔗 Copiar link
            </button>
            {musical.programaDigital && (
              <a href={musical.programaDigital} target="_blank" rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#F5C518", color: "#1a1a1a", border: "1px solid #F5C518", borderRadius: "6px", padding: "8px 16px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textDecoration: "none", fontWeight: "500" }}>
                📄 Baixe o programa digital
              </a>
            )}
          </div>

          {/* ── SESSÕES ── */}
          {usuario && jaVi && (
            <div style={{ marginBottom: "24px", background: "#f5f5f0", border: "1px solid #e8e8e4", borderRadius: "10px", padding: "16px 20px" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>📅 Suas sessões</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: mostrarFormSessao ? "16px" : "0" }}>
                {sessoes.map(s => (
                  <div key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#fff", border: "1px solid #e8e8e4", borderRadius: "99px", padding: "6px 14px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "500", color: "#1a1a1a" }}>{labelChip(s)}</span>
                    <span style={{ fontSize: "11px", color: s.publico ? "#5a9e6f" : "#aaa" }}>{s.publico ? "🌐" : "🔒"}</span>
                    <button onClick={() => deletarSessao(s.id)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: "13px", padding: "0", lineHeight: 1, display: "flex", alignItems: "center" }} title="Remover sessão">✕</button>
                  </div>
                ))}
                {!mostrarFormSessao && (
                  <button onClick={() => setMostrarFormSessao(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "1px dashed #ccc", borderRadius: "99px", padding: "6px 14px", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#888", cursor: "pointer" }}>
                    + Nova sessão
                  </button>
                )}
              </div>
              {mostrarFormSessao && (
                <div style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "8px", padding: "14px 16px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                    <div style={{ flex: "1 1 130px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>Data</label>
                      <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
                    </div>
                    <div style={{ flex: "1 1 100px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>Horário (opcional)</label>
                      <input type="time" value={novoHorario} onChange={e => setNovoHorario(e.target.value)}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
                    </div>
                    <div style={{ flex: "2 1 180px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>Teatro (opcional)</label>
                      <input type="text" value={novoTeatro} onChange={e => setNovoTeatro(e.target.value)} placeholder="ex: Teatro Santander"
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
                    </div>
                    <div style={{ flex: "2 1 180px" }}>
                      <label style={{ display: "block", fontSize: "12px", color: "#888", marginBottom: "4px" }}>Assento (opcional)</label>
                      <input type="text" value={novoAssento} onChange={e => setNovoAssento(e.target.value)} placeholder="ex: Plateia A, fileira 10, cadeira 5"
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e8e4", borderRadius: "6px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", outline: "none" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                    <span style={{ fontSize: "13px", color: "#666" }}>{novaSessaoPublica ? "🌐 Público — visível no seu perfil" : "🔒 Privado — só você vê"}</span>
                    <div onClick={() => setNovaSessaoPublica(prev => !prev)}
                      style={{ width: "40px", height: "22px", borderRadius: "11px", cursor: "pointer", backgroundColor: novaSessaoPublica ? "#F5C518" : "#ccc", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#fff", position: "absolute", top: "3px", left: novaSessaoPublica ? "21px" : "3px", transition: "left 0.2s" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button onClick={salvarSessao} disabled={salvandoSessao} className="btn-comentar" style={{ fontSize: "13px", padding: "7px 16px" }}>{salvandoSessao ? "Salvando..." : "Salvar"}</button>
                    <button onClick={() => { setMostrarFormSessao(false); setNovaData(""); setNovoHorario(""); setNovoAssento(""); setNovaSessaoPublica(true) }} className="btn-sair" style={{ fontSize: "13px", padding: "7px 16px" }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SINOPSE ── */}
          {musical.sinopse && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Sinopse</p>
              <p className="sinopse" style={{ marginBottom: 0 }}>{musical.sinopse}</p>
            </div>
          )}

          <hr className="divider" />

          {/* ── ELENCO (chips) ── */}
          {musical.elenco && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Elenco de estreia</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {musical.elenco.split(",").map(nome => {
                  const n = nome.trim()
                  return <Link key={n} to={"/pessoa/" + encodeURIComponent(n)} style={{ display: "inline-flex", alignItems: "center", padding: "5px 12px", borderRadius: "999px", fontSize: "13px", border: "1px solid #F5C518", background: "#FFF8E1", color: "#7a5f00", textDecoration: "none" }}>{n}</Link>
                })}
              </div>
            </div>
          )}

          {musical.elencoAdicional && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Elenco adicional</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {musical.elencoAdicional.split(",").map(nome => {
                  const n = nome.trim()
                  return <Link key={n} to={"/pessoa/" + encodeURIComponent(n)} style={{ display: "inline-flex", alignItems: "center", padding: "5px 12px", borderRadius: "999px", fontSize: "13px", border: "1px solid #F5C518", background: "#FFF8E1", color: "#7a5f00", textDecoration: "none" }}>{n}</Link>
                })}
              </div>
            </div>
          )}

          {/* ── EQUIPE (complementares + músicos) ── */}
          {temBlocoEquipe && (
            <div style={{ marginBottom: "24px" }}>
              <hr className="divider" />
              <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Equipe</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {equipeSecundaria.map((item, i) => (
                  <p key={i} style={{ fontSize: "14px", color: "#444", marginBottom: 0 }}>
                    <strong style={{ color: "#1a1a1a" }}>{item.funcao}:</strong>{" "}{nomesClicaveis(item.nomes.join(", "))}
                  </p>
                ))}
                {musicosExibicao.length > 0 && (
                  <div style={{ marginTop: equipeSecundaria.length > 0 ? "8px" : "0" }}>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a1a", marginBottom: "4px" }}>Músicos:</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "4px" }}>
                      {musicosExibicao.map((item, i) => (
                        <div key={i} style={{ fontSize: "14px", color: "#444" }}>
                          <span style={{ fontWeight: "700", color: "#1a1a1a" }}>{item.local}:</span>{" "}{nomesClicaveis(item.nomes.join(", "))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <hr className="divider" />

          {/* ── AVALIAÇÃO ── */}
          <div ref={avaliacaoRef}>
            <p className="avaliacao-titulo">{votoAtual ? `Sua avaliação: ${votoAtual} ★ (clique para mudar)` : "Avalie este musical"}</p>
            <p style={{ fontSize: "13px", color: "#999", marginTop: "-4px", marginBottom: "12px" }}>Sua nota é privada — só você vê.</p>
            <Estrelas votoAtual={votoAtual} onVotar={votar} />
          </div>

          {votoAtual && (
            <div style={{ marginBottom: "8px" }}>
              {confirmandoRemocao ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "13px", color: "#888" }}>Remover sua avaliação?</span>
                  <button onClick={removerVoto} style={{ background: "none", border: "none", fontSize: "13px", color: "#cc0000", cursor: "pointer", padding: 0, fontWeight: "600" }}>Sim, remover</button>
                  <button onClick={() => setConfirmandoRemocao(false)} style={{ background: "none", border: "none", fontSize: "13px", color: "#888", cursor: "pointer", padding: 0 }}>Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setConfirmandoRemocao(true)} style={{ background: "none", border: "none", fontSize: "12px", color: "#bbb", cursor: "pointer", padding: 0, textDecoration: "underline" }}>Remover avaliação</button>
              )}
            </div>
          )}

          {/* ── REAÇÕES 👍/👎 ── */}
          <div style={{ marginTop: "24px", marginBottom: "8px" }}>
            <p style={{ fontSize: "13px", fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>O que você achou?</p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={() => toggleReacao("gostei")}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: minhaReacao === "gostei" ? "#1a1a1a" : "transparent", color: minhaReacao === "gostei" ? "#F5C518" : "#888", border: "1px solid", borderColor: minhaReacao === "gostei" ? "#1a1a1a" : "#ccc", borderRadius: "6px", padding: "8px 18px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", cursor: "pointer", transition: "all 0.15s" }}>
                👍 <span style={{ fontWeight: "600" }}>{totalGostei}</span>
              </button>
              <button onClick={() => toggleReacao("nao_gostei")}
                style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: minhaReacao === "nao_gostei" ? "#1a1a1a" : "transparent", color: minhaReacao === "nao_gostei" ? "#F5C518" : "#888", border: "1px solid", borderColor: minhaReacao === "nao_gostei" ? "#1a1a1a" : "#ccc", borderRadius: "6px", padding: "8px 18px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", cursor: "pointer", transition: "all 0.15s" }}>
                👎 <span style={{ fontWeight: "600" }}>{totalNaoGostei}</span>
              </button>
            </div>
            {!usuario && (
              <p style={{ fontSize: "12px", color: "#bbb", marginTop: "8px" }}>Faça login para reagir.</p>
            )}
            {usuario && (
              <p style={{ fontSize: "14px", color: "#a59200", marginTop: "8px" }}>No seu perfil você pode escolher se sua reação fica pública ou não.</p>
            )}
          </div>

          {/* ── CARTÃO PARA COMPARTILHAR ── */}
          {votoAtual && (
            <div style={{ marginTop: "16px", marginBottom: "8px" }}>
              <div ref={cartaoRef} style={{ position: "absolute", left: "-9999px", top: "-9999px", background: "linear-gradient(160deg, #2f2f2f 0%, #1c1c1c 100%)", width: "270px", height: "480px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: "40px", paddingLeft: "28px", paddingRight: "28px" }}>
                {musical.capa ? (
                  <img src={musical.capa} alt={musical.titulo} crossOrigin="anonymous" style={{ width: "175px", height: "245px", objectFit: "cover", borderRadius: "10px", marginBottom: "20px", boxShadow: "0 12px 32px rgba(0,0,0,0.55)" }} />
                ) : (
                  <div style={{ width: "175px", height: "245px", background: "#1a1a1a", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
                    <span style={{ color: "#F5C518", fontSize: "13px", textAlign: "center", padding: "12px" }}>{musical.titulo}</span>
                  </div>
                )}
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "19px", fontWeight: "700", color: "#ffffff", textAlign: "center", marginBottom: "5px", lineHeight: 1.2 }}>{musical.titulo}</p>
                <p style={{ fontSize: "11px", color: "#999999", textAlign: "center", marginBottom: "14px", letterSpacing: "0.3px" }}>Dir. {musical.direcao || "—"}</p>
                <div style={{ display: "flex", gap: "4px", marginBottom: "18px" }}>{estrelasSVG(votoAtual)}</div>
                <div style={{ width: "50px", height: "1px", background: "#ffffff", opacity: 0.12, marginBottom: "14px" }} />
                <img src="https://res.cloudinary.com/drk7o6h0p/image/upload/v1782171496/copy_of_mcdb_sembirlho_utr4xp.png" alt="MCDb" crossOrigin="anonymous" style={{ width: "85px", height: "auto", marginBottom: "6px", opacity: 0.95 }} />
                <p style={{ fontSize: "10px", color: "#999999", textAlign: "center", letterSpacing: "1px" }}>mcdb.musicalcast.com.br</p>
              </div>
              <div style={{ marginTop: "12px" }}>
                <button onClick={gerarImagem} disabled={gerando} style={{ background: "#F5C518", color: "#1a1a1a", border: "none", borderRadius: "6px", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: "500", cursor: gerando ? "wait" : "pointer" }}>
                  {gerando ? "Gerando..." : "📤 Compartilhar imagem"}
                </button>
              </div>
            </div>
          )}

          <hr className="divider" />
          <ReportarErro musicalId={id} musicalTitulo={musical.titulo} usuario={usuario} />
        </>
      )}
    </main>
  )
}

export default Musical
