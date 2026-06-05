import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, updateDoc, doc, query, where, orderBy } from "firebase/firestore"
import { db, auth } from "../firebase"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"

const ADMIN_UID = "LFDNXIXywqQrLsDLobaGzOOmok03"

function Admin() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(null)
  const [sugestoes, setSugestoes] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    onAuthStateChanged(auth, (user) => setUsuario(user))
  }, [])

  useEffect(() => {
    async function buscarSugestoes() {
      const q = query(collection(db, "sugestoes"), where("status", "==", "pendente"), orderBy("data", "desc"))
      const snap = await getDocs(q)
      setSugestoes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setCarregando(false)
    }
    buscarSugestoes()
  }, [])

  async function aprovar(sugestao) {
    const slug = sugestao.titulo
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")

    await addDoc(collection(db, "musicais"), {
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
      totalVotos: 0,
      somaEstrelas: 0,
      dataCriacao: new Date()
    })

    await updateDoc(doc(db, "sugestoes", sugestao.id), { status: "aprovado" })
    setSugestoes(prev => prev.filter(s => s.id !== sugestao.id))
  }

  async function rejeitar(sugestaoId) {
    await updateDoc(doc(db, "sugestoes", sugestaoId), { status: "rejeitado" })
    setSugestoes(prev => prev.filter(s => s.id !== sugestaoId))
  }

  if (!usuario) return <main><p>Carregando...</p></main>
  if (usuario.uid !== ADMIN_UID) return <main><p>Acesso negado.</p></main>

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">Painel de administração</p>
      <h1 className="page-title">Sugestões pendentes</h1>

      {carregando ? (
        <p style={{ color: "#888" }}>Carregando...</p>
      ) : sugestoes.length === 0 ? (
        <p style={{ color: "#888" }}>Nenhuma sugestão pendente.</p>
      ) : (
        sugestoes.map(s => (
          <div key={s.id} style={{ background: "#fff", border: "1px solid #e8e8e4", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", marginBottom: "12px" }}>{s.titulo}</h2>

            {s.sinopse && <p style={{ fontSize: "14px", color: "#444", marginBottom: "8px" }}><strong>Sinopse:</strong> {s.sinopse}</p>}
            {s.direcao && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Direção:</strong> {s.direcao}</p>}
            {s.direcaoMusical && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Direção musical:</strong> {s.direcaoMusical}</p>}
            {s.producao && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Produção:</strong> {s.producao}</p>}
            {s.elenco && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Elenco:</strong> {s.elenco}</p>}
            {s.elencoAdicional && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Elenco adicional:</strong> {s.elencoAdicional}</p>}
            {s.versionista && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Versionista:</strong> {s.versionista}</p>}
            {s.textoOriginal && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Texto original:</strong> {s.textoOriginal}</p>}
            {s.musicaOriginal && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Música original:</strong> {s.musicaOriginal}</p>}
            {s.ano && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Ano:</strong> {s.ano}</p>}
            {s.teatro && <p style={{ fontSize: "14px", color: "#444", marginBottom: "4px" }}><strong>Teatro:</strong> {s.teatro}</p>}

            <p style={{ fontSize: "13px", color: "#888", marginTop: "12px", marginBottom: "16px" }}>
              Sugerido por: {s.nome}
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn-comentar" onClick={() => aprovar(s)}>Aprovar e publicar</button>
              <button className="btn-sair" onClick={() => rejeitar(s.id)}>Rejeitar</button>
            </div>
          </div>
        ))
      )}
    </main>
  )
}

export default Admin