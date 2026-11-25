import { useEffect } from "react"

const PESSOAS = [
  "Fabio Correa",
  "Julio Cesar Figueiredo Jr.",
  "Karina Okamoto",
  "Luan Andrade",
  "Pedro Blois",
  "Pedro Costa",
  "Rafael Oliveira",
  "Thiago Augusto Gonçalves",
]

const INSTITUICOES = [
  {
    nome: "Biblioteca Jenny Klabin Segall, do Museu Lasar Segall",
    texto: "Pelo apoio às pesquisas feitas no acervo da biblioteca, com um agradecimento especial a Paulo Pina e Luciana Azevedo.",
  },
]

const estiloSecao = {
  fontFamily: "var(--fonte-titulo)",
  color: "var(--cor-titulo)",
  fontSize: "20px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.02em",
  margin: "36px 0 14px",
}

const estiloParagrafo = {
  fontFamily: "var(--fonte-corpo)",
  fontSize: "16px",
  lineHeight: 1.7,
  color: "#333",
  margin: "0 0 14px",
}

function Agradecimentos() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 20px 48px" }}>
      <h1 className="page-title">Agradecimentos</h1>

      <p style={estiloParagrafo}>
        O MCDb nasceu para registrar a história do teatro musical brasileiro. Grande parte dessa história não está na internet: está em programas guardados em casa, em acervos de bibliotecas e na memória de quem viveu cada montagem.
      </p>
      <p style={estiloParagrafo}>
        Esta página agradece a quem ajudou com informações, documentos e pesquisa para o acervo. Todos os nomes abaixo estão aqui por essa colaboração. Graças a essas pessoas, muitas fichas técnicas, elencos e curiosidades estão completos hoje, e alguns só existem por causa delas.
      </p>

      <h2 style={estiloSecao}>Pessoas que ajudaram com informações</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, columns: "2 220px", columnGap: "32px" }}>
        {PESSOAS.map((nome) => (
          <li
            key={nome}
            style={{
              breakInside: "avoid",
              fontFamily: "var(--fonte-corpo)",
              fontSize: "16px",
              color: "#222",
              padding: "6px 0",
              borderBottom: "1px solid #eee",
            }}
          >
            {nome}
          </li>
        ))}
      </ul>

      <h2 style={estiloSecao}>Instituições e acervos</h2>
      {INSTITUICOES.map((inst) => (
        <div key={inst.nome} style={{ marginBottom: "18px" }}>
          <p style={{ ...estiloParagrafo, fontWeight: "700", color: "#1a1a1a", margin: "0 0 4px" }}>
            {inst.nome}
          </p>
          <p style={estiloParagrafo}>{inst.texto}</p>
        </div>
      ))}

      <div style={{ borderTop: "1px solid #e5e5e5", marginTop: "36px", paddingTop: "20px" }}>
        <p style={{ ...estiloParagrafo, color: "#666", fontSize: "15px", margin: 0 }}>
          Tem um programa, uma foto ou uma informação sobre algum musical brasileiro? Envie pela página de sugestões. Ela pode ajudar a completar a história de uma montagem.
        </p>
      </div>
    </div>
  )
}

export default Agradecimentos