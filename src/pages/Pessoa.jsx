import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "../firebase"
import { useParams, useNavigate } from "react-router-dom"

// Mapeamento de aliases para nome canônico
// Chave: nome antigo (lowercase), Valor: nome atual (como aparece nos créditos)
const ALIASES = {
  "frederico silveira": "Fred Silveira",
  "luci salutes": "Luci Saluzzi",
  "fabiane bang": "Fabi Bang",
  "janaina zuba": "Zuba Janaina",
"paula flaibann": "Paulão do Vrah",
"vitor beire": "Victor Mühlethaler",
"joão victor bastos": "JV Fiori",
"daniel ribeiro": "Daniel Salve",
"danielle winits": "Dani Winits",
"luciana bollina": "Lubo",
"adriana vitor lessa": "Adriana Lessa",
"maurício alves": "Mau Alves",
"fabiana tolentino": "Bibi Tolentino",
"cristian monteiro": "Cris Mont",
"bhener carvalho": "Bhener",
"rupa figueira": "Rupa",
"fabi tolentino": "Bibi Tolentino",
"janaina amorin": "Jana Amorin",
"patricia athayde": "Paty Athayde",
"nathália borges": "Nani Porto",
"cleto baccic": "Baccic",
"maria bia martins": "Maria Bia",
"rubem gabira": "Ruben Gabira",
"jennifer do nascimento": "Jennifer Nascimento",
"victor leal": "Victor Medeiros",
"andré padreca": "André Luiz Odin",
"gabriel d'ângelo": "Gabriel D'Angelo",
"rafael miranda": "Rafa Diverse",
"maria claudia raia": "Claudia Raia",
"leonardo wagner": "Leo Wagner",
"lurryan nascimento": "Lurryan",
"julio mancini": "Julio Assad",
"andressa massei": "Andrezza Massei",
"sandro conte febras": "Sandro Conte",
"andré gomes": "André Ulo",
"fábula entretenimento": "Touché Entretenimento",
  "nome antigo": "Nome Atual",
  "outro nome antigo": "Nome Atual",
  
}

// Remove acentos e deixa minúsculo, pra busca tolerante a acentuação
const normalizar = (texto) =>
  (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

// Traduz a marcação simples da bio em negrito e links de pessoa.
// **texto** vira negrito. [[Nome]] vira link pra /pessoa/Nome.
// [[texto|Nome]] mostra "texto" mas linka pra /pessoa/Nome.
const renderBio = (texto) => {
  if (!texto) return null
  const partes = (texto || "").split(/(\*\*[^*]+\*\*|\[\[[^\]]+\]\])/g)
  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>
    }
    if (parte.startsWith("[[") && parte.endsWith("]]")) {
      const conteudo = parte.slice(2, -2)
      const [rotulo, alvo] = conteudo.includes("|") ? conteudo.split("|") : [conteudo, conteudo]
      return (
        <a key={i} href={"/pessoa/" + encodeURIComponent(alvo.trim())}
          style={{ color: "#b8960a", textDecoration: "none", fontWeight: 600 }}>
          {rotulo.trim()}
        </a>
      )
    }
    return parte
  })
}

function Pessoa() {
  const { nome } = useParams()
  const navigate = useNavigate()
  const [musicais, setMusicais] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [entidade, setEntidade] = useState(null)

  const nomeDecodificado = decodeURIComponent(nome).trim()
  const nomeLower = nomeDecodificado.toLowerCase()

  // Se o nome da URL é um alias, redireciona para o nome canônico
  const nomeCanonicoDoAlias = ALIASES[nomeLower]
  useEffect(() => {
    if (nomeCanonicoDoAlias) {
      navigate("/pessoa/" + encodeURIComponent(nomeCanonicoDoAlias), { replace: true })
    }
  }, [nomeCanonicoDoAlias])

  // Descobre todos os aliases que apontam para este nome canônico
  const todosOsNomes = [
  nomeLower,
  ...Object.entries(ALIASES)
    .filter(([alias, canonical]) => canonical.toLowerCase() === nomeLower)
    .map(([alias]) => alias)
]

  const nomeBusca = nomeDecodificado.toLowerCase()

  useEffect(() => {
    document.title = `${nomeDecodificado} | MCDb`
    return () => { document.title = "MCDb — Musical Cast Database" }
  }, [nomeDecodificado])

  useEffect(() => {
    if (nomeCanonicoDoAlias) return // aguarda o redirect
    async function buscar() {
      // Lê o índice pré-pronto (1 leitura) em vez da coleção musicais inteira
      const indiceSnap = await getDoc(doc(db, "indices", "home"))
      const itens = indiceSnap.exists() ? (indiceSnap.data().itens || []) : []
      const lista = itens
        .filter(m => {
          const campos = [
            m.direcao, m.direcaoMusical, m.producao,
            m.elenco, m.elencoAdicional, m.versionista,
            m.textoOriginal, m.musicaOriginal
          ]
          const nomesEquipe = (m.equipeCriativa || []).flatMap(item => item.nomes || [])
          const nomesMusicos = (m.musicos || []).flatMap(item => item.nomes || [])
          // Campos de texto livre (elenco, direção etc.) têm múltiplos nomes separados por vírgula
          const nomesDosCampos = campos
            .filter(Boolean)
            .flatMap(c => c.split(","))
            .map(n => n.trim())
          const todosCampos = [...nomesDosCampos, ...nomesEquipe, ...nomesMusicos]
          // Busca por correspondência EXATA do nome atual OU de qualquer alias
          return todosCampos.some(c =>
            todosOsNomes.some(n => normalizar(c) === normalizar(n))
          )
        })
        .sort((a, b) => Number(a.ano) - Number(b.ano))
      setMusicais(lista)
      setCarregando(false)
    }
    buscar()
  }, [nomeBusca])

  // Perfil enriquecido (coleção "entidades"), lido sob demanda — 1 leitura extra só nesta página
  useEffect(() => {
    if (nomeCanonicoDoAlias) return // aguarda o redirect pro nome canônico
    async function buscarEntidade() {
      try {
        const id = normalizar(nomeDecodificado)
        const snap = await getDoc(doc(db, "entidades", id))
        if (snap.exists() && snap.data().publicado) {
          setEntidade(snap.data())
        } else {
          setEntidade(null)
        }
      } catch (e) {
        setEntidade(null)
      }
    }
    buscarEntidade()
  }, [nomeBusca])

  return (
    <main>
      <button className="voltar" onClick={() => navigate(-1)}>← Voltar</button>
      <p className="section-label">Musical Cast Database</p>
      <h1 className="page-title">{nomeDecodificado}</h1>

      {entidade && (
        <div style={{
          background: "#fff",
          border: "1px solid #e8e8e4",
          borderRadius: "12px",
          padding: "24px",
          marginTop: "20px",
          marginBottom: "28px",
          display: "flex",
          gap: "28px",
          alignItems: "center",
          flexWrap: "wrap"
        }}>
          {entidade.imagem && (
            entidade.tipoImagem === "logo" ? (
              <div style={{ flex: "0 0 auto", maxWidth: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={entidade.imagem} alt={entidade.nome} style={{ maxWidth: "100%", maxHeight: "120px", objectFit: "contain", display: "block" }} />
              </div>
            ) : (
              <div style={{ width: "128px", height: "128px", borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#f0f0f0", border: "1px solid #eee" }}>
                <img src={entidade.imagem} alt={entidade.nome} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )
          )}

          <div style={{ flex: 1, minWidth: "240px" }}>
            {entidade.tipo && (
              <p style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", color: "#b8960a", margin: "0 0 8px" }}>
                {entidade.tipo === "produtora" ? "Produtora" : entidade.tipo === "assessoria" ? "Assessoria de imprensa" : "Artista"}
              </p>
            )}
            {entidade.bio && (
              <p style={{ fontSize: "15px", lineHeight: 1.65, color: "#333", margin: "0 0 12px", whiteSpace: "pre-wrap" }}>{renderBio(entidade.bio)}</p>
            )}
            {entidade.formacao && (
              <p style={{ fontSize: "14px", color: "#666", margin: "0 0 6px" }}>
                <strong style={{ color: "#333" }}>Formação:</strong> {entidade.formacao}
              </p>
            )}
            {entidade.contato && (
              <p style={{ fontSize: "14px", color: "#666", margin: "0 0 6px" }}>
                <strong style={{ color: "#333" }}>Contato:</strong> {entidade.contato}
              </p>
            )}
            {Array.isArray(entidade.destaques) && entidade.destaques.length > 0 && (
              <p style={{ fontSize: "14px", color: "#666", margin: "6px 0 0" }}>
                <strong style={{ color: "#333" }}>Destaques:</strong> {entidade.destaques.join(" · ")}
              </p>
            )}
            {entidade.links && (entidade.links.instagram || entidade.links.site || entidade.links.email || (entidade.links.extras || []).length > 0) && (
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f0f0f0" }}>
                {entidade.links.instagram && (
                  <a href={"https://instagram.com/" + entidade.links.instagram.replace(/^@/, "")} target="_blank" rel="noreferrer" style={{ color: "#b8960a", textDecoration: "none", fontWeight: 600, fontSize: "13px", border: "1px solid #ecd9a0", borderRadius: "20px", padding: "6px 14px", background: "#fdf9ec" }}>Instagram</a>
                )}
                {entidade.links.site && (
                  <a href={entidade.links.site} target="_blank" rel="noreferrer" style={{ color: "#b8960a", textDecoration: "none", fontWeight: 600, fontSize: "13px", border: "1px solid #ecd9a0", borderRadius: "20px", padding: "6px 14px", background: "#fdf9ec" }}>Site</a>
                )}
                {entidade.links.email && (
                  <a href={"mailto:" + entidade.links.email} style={{ color: "#b8960a", textDecoration: "none", fontWeight: 600, fontSize: "13px", border: "1px solid #ecd9a0", borderRadius: "20px", padding: "6px 14px", background: "#fdf9ec" }}>E-mail</a>
                )}
                {(entidade.links.extras || []).map((ex, i) => (
                  ex && ex.url && ex.label ? (
                    <a key={i} href={ex.url} target="_blank" rel="noreferrer" style={{ color: "#b8960a", textDecoration: "none", fontWeight: 600, fontSize: "13px", border: "1px solid #ecd9a0", borderRadius: "20px", padding: "6px 14px", background: "#fdf9ec" }}>{ex.label}</a>
                  ) : null
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <p style={{ fontSize: "15px", color: "#888", marginBottom: "32px", marginTop: entidade ? "4px" : "-8px" }}>
        {carregando ? "Carregando..." : `${musicais.length} ${musicais.length === 1 ? "musical encontrado" : "musicais encontrados"}`}
      </p>

      {carregando ? (
        <div className="grid-pessoa" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ borderRadius: "6px", background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.2s infinite", aspectRatio: "2/3" }} />
          ))}
        </div>
      ) : !carregando && musicais.length === 0 ? (
        <p style={{ color: "#888" }}>Nenhum musical encontrado para esta pessoa.</p>
      ) : (
        <div className="grid-pessoa" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "16px" }}>
          {musicais.map(m => (
            <a key={m.id}
              href={"/musical/" + m.id}
              className="card-musical"
              style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center" }}
            >
              <div style={{ width: "100%", position: "relative", paddingBottom: "140%", marginBottom: "12px" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
                  {m.capa
                    ? <img src={m.capa} alt={m.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} />
                    : <div style={{ width: "100%", height: "100%", background: "#0a2c59", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "#b8960a", fontSize: "12px", padding: "8px", textAlign: "center" }}>{m.titulo}</div>
                  }
                </div>
              </div>
              <div style={{ width: "100%" }}>
                <p className="card-titulo">{m.titulo}</p>
                <p className="card-meta">Direção: {m.direcao || "—"}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </main>
  )
}

export default Pessoa
