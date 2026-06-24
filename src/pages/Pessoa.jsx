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
"luciana bolina": "Lubo",
"janaina amorin": "Jana Amorin",
"maria bia martins": "Maria Bia",
"rafael miranda": "Rafa Diverse",
"leonardo wagner": "Leo Wagner",
"andressa massei": "Andrezza Massei",
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
          // Nomes da equipe criativa (cobre Direção, Direção Musical e todas as
          // funções novas: coreografia, cenografia, figurino, etc.)
          const nomesEquipe = (m.equipeCriativa || []).flatMap(item => item.nomes || [])
          const todosCampos = [...campos, ...nomesEquipe]
          // Busca pelo nome atual E por todos os aliases
          return todosCampos.some(c =>
            todosOsNomes.some(n => normalizar(c).includes(normalizar(n)))
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
      <p className="section-label">Musicais Brasileiros Database</p>
      <h1 className="page-title">{nomeDecodificado}</h1>
      <p style={{ fontSize: "15px", color: "#888", marginBottom: "32px", marginTop: "-8px" }}>
        {carregando ? "Buscando..." : `${musicais.length} ${musicais.length === 1 ? "musical encontrado" : "musicais encontrados"}`}
      </p>

      {!carregando && musicais.length === 0 ? (
        <p style={{ color: "#888" }}>Nenhum musical encontrado para esta pessoa.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
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
