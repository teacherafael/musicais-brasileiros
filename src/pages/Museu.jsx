import { useEffect, useState } from "react"
import { lerIndiceHome } from "../indiceHome"
import CardMusical from "../components/CardMusical"

// Texto de abertura da página
const INTRODUCAO = "O acervo histórico do MCDb: montagens marcantes do teatro musical brasileiro, escolhidas pelo Musical Cast e organizadas por década. Muito do que está registrado aqui nunca tinha sido publicado na internet."

// Parágrafo de contexto de cada década (opcional).
// Para adicionar, escreva o texto entre as aspas. Década vazia não mostra parágrafo.
const TEXTOS_DECADAS = {
  1950: "",
  1960: "",
  1970: "",
  1980: "",
  1990: "",
}

// Pega o primeiro ano de 4 dígitos do campo (funciona com "1985", "1985-1987" etc.)
function extrairAno(ano) {
  const achado = String(ano || "").match(/\d{4}/)
  return achado ? Number(achado[0]) : null
}

function nomeDecada(decada) {
  if (decada === null) return "Sem ano definido"
  if (decada < 2000 && decada % 100 !== 0) return `Anos ${decada % 100}`
  return `Anos ${decada}`
}

// O card exige essas props; sem usuário, a barra de botões não aparece
const semUsuario = {
  usuario: null,
  jaViSet: new Set(),
  queroVerSet: new Set(),
  listas: [],
  musicaisNasListas: {},
  dropdownAberto: false,
  onToggleJaVi: () => {},
  onToggleQueroVer: () => {},
  onAbrirDropdown: () => {},
  onToggleNaLista: () => {},
  onCriarLista: () => {},
}

function Museu() {
  const [grupos, setGrupos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    async function carregar() {
      try {
        const indice = await lerIndiceHome()
        const itens = (indice?.itens || []).filter(m => m.museu === true)

        // Agrupa por década
        const mapa = new Map()
        for (const m of itens) {
          const ano = extrairAno(m.ano)
          const decada = ano === null ? null : Math.floor(ano / 10) * 10
          if (!mapa.has(decada)) mapa.set(decada, [])
          mapa.get(decada).push({ ...m, anoNumero: ano })
        }

        // Décadas do mais antigo ao mais recente; "sem ano" vai para o fim
        const lista = [...mapa.entries()]
          .sort(([a], [b]) => {
            if (a === null) return 1
            if (b === null) return -1
            return a - b
          })
          .map(([decada, musicais]) => ({
            decada,
            musicais: musicais.sort((x, y) =>
              (x.anoNumero || 0) - (y.anoNumero || 0) ||
              x.titulo.localeCompare(y.titulo, "pt-BR")
            ),
          }))

        setGrupos(lista)
      } catch (e) {
        console.error("Erro ao carregar o Museu:", e)
        setErro(true)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [])

  const idDecada = (decada) => `decada-${decada === null ? "sem-ano" : decada}`

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 20px 64px", minHeight: "60vh" }}>
      <h1 className="page-title">Museu MCDb</h1>
      <p style={{ fontSize: "17px", color: "#555", lineHeight: "1.6", maxWidth: "680px", margin: "0 0 24px" }}>
        {INTRODUCAO}
      </p>

      {carregando && (
        <p style={{ color: "#aaa", fontSize: "14px" }}>Carregando o acervo...</p>
      )}

      {erro && (
        <p style={{ color: "#c0392b", fontSize: "14px" }}>
          Não foi possível carregar o Museu. Recarregue a página para tentar de novo.
        </p>
      )}

      {!carregando && !erro && grupos.length === 0 && (
        <p style={{ color: "#888", fontSize: "14px" }}>Nenhum musical no Museu ainda.</p>
      )}

      {/* Atalhos para cada década */}
      {grupos.length > 1 && (
        <nav style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "40px" }}>
          {grupos.map(g => (
            <a
              key={idDecada(g.decada)}
              href={`#${idDecada(g.decada)}`}
              style={{
                fontFamily: "var(--fonte-corpo)", fontSize: "13px", fontWeight: "600",
                color: "#0a2c59", textDecoration: "none",
                border: "1px solid #d8dce4", borderRadius: "99px", padding: "5px 14px",
              }}
            >
              {nomeDecada(g.decada)}
            </a>
          ))}
        </nav>
      )}

      {grupos.map(g => (
        <section key={idDecada(g.decada)} id={idDecada(g.decada)} style={{ marginBottom: "56px", scrollMarginTop: "90px" }}>
          <div style={{ borderTop: "3px solid #F5C518", paddingTop: "14px", marginBottom: "20px" }}>
            <h2 style={{
              fontFamily: "var(--fonte-titulo)", color: "var(--cor-titulo)",
              fontSize: "clamp(28px, 5vw, 40px)", fontWeight: "700", margin: 0, lineHeight: 1.1,
            }}>
              {nomeDecada(g.decada)}
            </h2>
            <p style={{ fontSize: "13px", color: "#888", margin: "4px 0 0" }}>
              {g.musicais.length} {g.musicais.length === 1 ? "musical" : "musicais"}
            </p>
            {g.decada !== null && TEXTOS_DECADAS[g.decada] && (
              <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.65", maxWidth: "680px", margin: "12px 0 0" }}>
                {TEXTOS_DECADAS[g.decada]}
              </p>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "20px" }}>
            {g.musicais.map(m => (
              <CardMusical
                key={m.id}
                musical={m}
                {...semUsuario}
                metaExtra={
                  <p style={{ fontSize: "12px", color: "#888", margin: 0 }}>
                    {m.anoNumero || "Ano não informado"}
                  </p>
                }
              />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}

export default Museu
