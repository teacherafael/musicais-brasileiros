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
"joão victor fiori": "JV Fiori",
"daniel ribeiro": "Daniel Salve",
"luciana bollina": "Lubo",
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
  "nome antigo": "Nome Atual",
  "outro nome antigo": "Nome Atual",
  
}

// Remove acentos e deixa minúsculo, pra busca tolerante a acentuação
const normalizar = (texto) =>
  (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

function Pessoa() {
  const { nome } = useParams()
  const navigate = useNavigate()
  const [musicais, setMusicais] = useState([])
  const [carregando, setCarregando] = useState(true)

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

  return (
    <main>
      <button className="voltar" onClick={() => navigate(-1)}>← Voltar</button>
      <p className="section-label">Musical Cast Database</p>
      <h1 className="page-title">{nomeDecodificado}</h1>
      <p style={{ fontSize: "15px", color: "#888", marginBottom: "32px", marginTop: "-8px" }}>
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
