import { useEffect, useState } from "react"
import { lerIndiceHome } from "../indiceHome"
import { useNavigate, Link } from "react-router-dom"

function otimizarImagem(url, largura) {
  if (!url) return url;
  url = url.replace("https://pub-c2de81da01f44e4aa685a9b28614c01d.r2.dev", "https://img.musicalcast.com.br");
  // R2: escolhe entre as versões já geradas (-400 pequena, -800 grande)
  if (url.includes("-800.webp") || url.includes("-400.webp")) {
    const querPequena = largura <= 400;
    return url
      .replace("-800.webp", querPequena ? "-400.webp" : "-800.webp")
      .replace("-400.webp", querPequena ? "-400.webp" : "-800.webp");
  }
  // Cloudinary: transformação na URL
  if (url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/w_${largura},c_limit,q_auto,f_auto/`);
  }
  // Outras fontes: usa como está
  return url;
}

// Constantes do ranking bayesiano no escopo do módulo: o texto explicativo
// no fim da página usa TETO_VOTOS, então os dois nunca saem de sincronia.
const PESO = 10 // quantos votos um musical precisa pra "soltar" da média geral
const TETO_VOTOS = 60 // a partir daqui, votos extras não aumentam mais o peso do musical na fórmula — evita que fandom grande domine só por volume

// Quantas posições cada coluna mostra
const TAMANHO_RANKING = 20

// Visual de cada coluna. O pódio (1º, 2º e 3º) é igual nas duas;
// da 4ª posição em diante o círculo usa a cor da coluna.
const TEMA_ASSISTIDOS = {
  fundoCabecalho: "var(--cor-titulo)",
  corTitulo: "#ffffff",
  corSubtitulo: "#c9d4e5",
  fundoPosicao: "var(--cor-titulo)",
  textoPosicao: "#ffffff",
  corHover: "var(--cor-titulo)"
}

const TEMA_AVALIADOS = {
  fundoCabecalho: "#1a1a1a",
  corTitulo: "#F5C518",
  corSubtitulo: "#d0d0d0",
  fundoPosicao: "#1a1a1a",
  textoPosicao: "#F5C518",
  corHover: "#F5C518"
}

// Ícones em SVG (e não emoji) para a cor sair igual em qualquer aparelho
function IconeOlho() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconeEstrela() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="#F5C518" stroke="#F5C518" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z" />
    </svg>
  )
}

function CabecalhoColuna({ tema, icone, titulo, subtitulo }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "14px",
      padding: "16px 18px",
      borderRadius: "12px",
      background: tema.fundoCabecalho,
      marginBottom: "16px"
    }}>
      {icone}
      <div style={{ minWidth: 0 }}>
        <h2 style={{
          fontFamily: "var(--fonte-titulo)",
          fontSize: "22px",
          fontWeight: "600",
          lineHeight: 1.1,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
          color: tema.corTitulo,
          margin: 0
        }}>
          {titulo}
        </h2>
        <p style={{ fontSize: "14px", color: tema.corSubtitulo, margin: "2px 0 0" }}>{subtitulo}</p>
      </div>
    </div>
  )
}

// O card é um <Link> (e não um <div> com onClick) para o navegador reconhecer
// como link: botão do meio abre em nova aba e o botão direito mostra
// "Abrir link em nova aba". O clique normal continua navegando sem recarregar.
function CardRanking({ musical, index, contador, labelSingular, labelPlural, mostrarContador = true, tema = TEMA_AVALIADOS }) {
  return (
    <Link
      to={`/musical/${musical.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: "#fff",
        border: "1px solid #e8e8e4",
        borderRadius: "12px",
        padding: "12px",
        marginBottom: "10px",
        cursor: "pointer",
        transition: "border-color 0.15s",
        textDecoration: "none",
        color: "inherit"
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = tema.corHover}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#e8e8e4"}
    >
      <div style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: index === 0 ? "#F5C518" : index === 1 ? "#e0e0e0" : index === 2 ? "#c8a06e" : tema.fundoPosicao,
        color: index === 0 ? "#1a1a1a" : index === 1 ? "#1a1a1a" : index === 2 ? "#fff" : tema.textoPosicao,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: "700",
        flexShrink: 0
      }}>
        {index + 1}
      </div>

      {musical.capa ? (
        <img src={otimizarImagem(musical.capa, 80)} alt={musical.titulo} style={{ width: "36px", height: "50px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} />
      ) : (
        <div style={{ width: "36px", height: "50px", background: "#1a1a1a", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ color: "#F5C518", fontSize: "7px", textAlign: "center", padding: "3px" }}>{musical.titulo}</span>
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "var(--fonte-titulo)", fontSize: "15px", fontWeight: "700", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{musical.titulo}</p>
        <p style={{ fontSize: "12px", color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Dir. {musical.direcao || "—"}</p>
      </div>

      {mostrarContador && (
        <div style={{
          background: "#1a1a1a",
          color: "#F5C518",
          borderRadius: "8px",
          padding: "6px 10px",
          textAlign: "center",
          flexShrink: 0
        }}>
          <p style={{ fontSize: "16px", fontWeight: "700", lineHeight: 1 }}>{contador}</p>
          <p style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
            {contador === 1 ? labelSingular : labelPlural}
          </p>
        </div>
      )}
    </Link>
  )
}

function Ranking() {
  const [populares, setPopulares] = useState([])
  const [avaliados, setAvaliados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function buscarRanking() {
      try {
        const indice = await lerIndiceHome()
        if (indice) {
          const itens = indice.itens

          // ── Mais assistidos (só "já vi"; "quero ver" nunca incrementa popularidade) ──
          const listaPopulares = itens
            .filter(m => (m.popularidade || 0) > 0)
            .sort((a, b) => (b.popularidade || 0) - (a.popularidade || 0))
            .slice(0, TAMANHO_RANKING)

          // ── Mais bem avaliados (média bayesiana — só a ordem) ──
          // Âncora = média geral da plataforma, calculada em memória a partir do índice (custo zero)
          let somaGlobal = 0
          let votosGlobal = 0
          itens.forEach(m => {
            somaGlobal += Number(m.somaEstrelas) || 0
            votosGlobal += Number(m.totalVotos) || 0
          })
          const mediaGlobal = votosGlobal > 0 ? somaGlobal / votosGlobal : 0

          const listaAvaliados = itens
            .filter(m => (Number(m.totalVotos) || 0) > 0)
            .map(m => {
              const votos = Number(m.totalVotos) || 0
              const media = (Number(m.somaEstrelas) || 0) / votos
              const votosEfetivos = Math.min(votos, TETO_VOTOS)
              const score = (votosEfetivos / (votosEfetivos + PESO)) * media + (PESO / (votosEfetivos + PESO)) * mediaGlobal
              return { ...m, _score: score }
            })
            .sort((a, b) => b._score - a._score)
            .slice(0, TAMANHO_RANKING)

          setPopulares(listaPopulares)
          setAvaliados(listaAvaliados)
        }
      } catch (e) {
        console.error("Erro ao carregar ranking:", e)
      }
      setCarregando(false)
    }
    buscarRanking()
  }, [])

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">Musicais Brasileiros Database</p>
      <h1 className="page-title">Ranking</h1>

      {carregando ? (
        <p style={{ color: "#888" }}>Carregando...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px", alignItems: "start" }}>

          {/* Coluna: Mais assistidos */}
          <div>
            <CabecalhoColuna
              tema={TEMA_ASSISTIDOS}
              icone={<IconeOlho />}
              titulo="Mais assistidos"
              subtitulo="O que mais gente marcou como visto"
            />
            {populares.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>Nenhum musical ainda.</p>
            ) : (
              populares.map((musical, index) => (
                <CardRanking
                  key={musical.id}
                  musical={musical}
                  index={index}
                  mostrarContador={false}
                  tema={TEMA_ASSISTIDOS}
                />
              ))
            )}
          </div>

          {/* Coluna: Mais bem avaliados */}
          <div>
            <CabecalhoColuna
              tema={TEMA_AVALIADOS}
              icone={<IconeEstrela />}
              titulo="Mais bem avaliados"
              subtitulo="A melhor nota, com peso para o número de votos"
            />
            {avaliados.length === 0 ? (
              <p style={{ color: "#888", fontSize: "14px" }}>Nenhuma avaliação ainda.</p>
            ) : (
              avaliados.map((musical, index) => (
                <CardRanking
                  key={musical.id}
                  musical={musical}
                  index={index}
                  mostrarContador={false}
                  tema={TEMA_AVALIADOS}
                />
              ))
            )}
          </div>

        </div>
      )}

      {!carregando && avaliados.length > 0 && (
        <details style={{ marginTop: "32px", maxWidth: "640px" }}>
          <summary style={{ fontSize: "13px", color: "#888", cursor: "pointer", userSelect: "none" }}>ⓘ Como é calculado o ranking dos mais bem avaliados?</summary>
          <div style={{ marginTop: "12px", padding: "14px 16px", background: "#faf9f6", border: "1px solid #e8e8e4", borderRadius: "10px" }}>
            <p style={{ fontSize: "13.5px", color: "#555", lineHeight: "1.7", marginBottom: "12px" }}>O ranking não usa a média simples das estrelas. Se usasse, um musical com uma única avaliação de 5 estrelas apareceria à frente de um musical com dezenas de avaliações e média 4,7 — o que não reflete a realidade.</p>
            <p style={{ fontSize: "13.5px", color: "#555", lineHeight: "1.7", marginBottom: "12px" }}>Para evitar isso, o MCDb usa uma média ponderada bayesiana. Na prática, isso significa que um título só alcança sua posição "real" no ranking depois de receber um número razoável de avaliações. Enquanto tem poucos votos, sua nota fica puxada na direção da média geral da plataforma, e vai se firmando à medida que mais pessoas avaliam.</p>
            <p style={{ fontSize: "13.5px", color: "#555", lineHeight: "1.7", marginBottom: "12px" }}>Há ainda um limite no peso do volume: a partir de {TETO_VOTOS} avaliações, votos adicionais não aumentam mais a influência do título no cálculo. A média em si continua considerando todos os votos recebidos — o teto existe para que a posição no ranking reflita o quanto o público gostou, e não o tamanho do público.</p>
            <p style={{ fontSize: "13.5px", color: "#555", lineHeight: "1.7" }}>O resultado é um ranking mais justo: títulos muito bem avaliados por muita gente sobem de forma consistente, enquanto notas extremas baseadas em pouquíssimos votos não distorcem o topo da lista.</p>
          </div>
        </details>
      )}
    </main>
  )
}

export default Ranking
