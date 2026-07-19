import { useNavigate } from "react-router-dom"

function FAQ() {
  const navigate = useNavigate()

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">MCDb — Musical Cast Database</p>
      <h1 className="page-title">Perguntas Frequentes</h1>

      <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75", marginBottom: "32px" }}>
        Reunimos aqui as dúvidas mais comuns sobre como o MCDb funciona. Não achou o que procurava? Fale com a gente pelo canal de suporte.
      </p>

      {[
        {
          pergunta: "O que é o MCDb?",
          resposta: "O MCDb (Musical Cast Database) é uma plataforma independente para catalogar, acompanhar e avaliar musicais brasileiros. A ideia é parecida com a do Letterboxd, mas voltada para o teatro musical do Brasil: você registra o que já assistiu, monta listas, dá suas notas e descobre novas produções."
        },
        {
          pergunta: "Preciso criar uma conta para usar?",
          resposta: "Não para navegar. Qualquer pessoa pode explorar o catálogo, ver fichas técnicas e conferir o ranking sem estar logada. Para avaliar musicais, comentar, seguir outros usuários e montar suas listas pessoais, é preciso entrar com uma conta Google."
        },
        {
          pergunta: "Como funcionam as avaliações por estrelas?",
          resposta: "Você pode dar notas de 0,5 a 5 estrelas (incluindo meias estrelas) para cada musical que já assistiu. Suas notas são sempre privadas — só você enxerga o que deu para cada produção. Elas entram apenas de forma agregada e anônima na média de cada musical."
        },
        {
          pergunta: "Minhas notas ficam públicas no meu perfil?",
          resposta: "Não. As notas em estrelas são sempre privadas, sem exceção. O que você pode escolher deixar público é a sua reação 👍 / 👎 em cada musical, através de uma opção nas configurações do seu perfil."
        },
        {
          pergunta: "O que são os 👍 e 👎?",
          resposta: "São reações rápidas de recomendação: um jeito de dizer se você indica ou não um musical, sem entrar no detalhe da nota. Diferente das estrelas, essas reações podem aparecer no seu perfil — mas só se você ativar a opção de avaliações públicas."
        },
        {
          pergunta: "Como funciona o \"Meu Top 5\"?",
          resposta: "No seu perfil você pode destacar seus 5 musicais favoritos. É a sua vitrine pessoal, visível para quem visitar seu perfil."
        },
        {
          pergunta: "Como sugiro um musical que não está no catálogo?",
          resposta: "Use o botão \"Sugerir um musical\". Você preenche o que souber sobre a produção e a sugestão entra numa fila de revisão. Depois de conferida, ela é publicada no catálogo."
        },
        {
          pergunta: "Encontrei uma informação errada. E agora?",
          resposta: "Cada página de musical tem um botão para reportar erro. É só descrever o que está incorreto que revisamos e corrigimos."
        },
        {
          pergunta: "Como o ranking é calculado?",
          resposta: "O ranking usa uma média ponderada, e não a média pura das notas. Isso evita que um musical com pouquíssimos votos e uma nota alta dispare para o topo na frente de produções muito mais avaliadas. Na prática, quanto mais avaliações um musical recebe, mais perto do seu valor real ele fica no ranking."
        },
        {
          pergunta: "Como posso apoiar o projeto?",
          resposta: "O MCDb é mantido de forma independente. Se quiser ajudar a manter a plataforma no ar, você pode contribuir via Pix: musicalcastbr@gmail.com. Qualquer valor é bem-vindo e faz diferença."
        },
        {
          pergunta: "Quem mantém o MCDb?",
          resposta: "O MCDb é um projeto independente, tocado pela equipe por trás do podcast Musical Cast, movido pelo amor ao teatro musical brasileiro."
        }
      ].map((item, i) => (
        <div key={i} style={{ marginBottom: "28px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: "700", marginBottom: "10px" }}>{item.pergunta}</h2>
          <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75" }}>{item.resposta}</p>
        </div>
      ))}
    </main>
  )
}

export default FAQ
