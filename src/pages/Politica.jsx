import { useNavigate } from "react-router-dom"

function Politica() {
  const navigate = useNavigate()

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">MBDb — Musicais Brasileiros Database</p>
      <h1 className="page-title">Política de Comentários e Avaliações</h1>
      <p style={{ fontSize: "13px", color: "#888", marginBottom: "32px" }}>Última atualização: 08 de junho de 2026</p>

      <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75", marginBottom: "32px" }}>
        O MBDb é um espaço aberto ao debate e à crítica cultural. Acreditamos que avaliações honestas, inclusive as negativas, são parte fundamental de uma comunidade saudável e de qualidade. Esta política existe para garantir que esse ambiente permaneça respeitoso e construtivo para todos.
      </p>

      {[
        {
          titulo: "O que valorizamos",
          texto: "Avaliações são bem-vindas em qualquer direção, positiva ou negativa, desde que expressem uma opinião genuína sobre o espetáculo. Uma crítica bem fundamentada, mesmo que severa, enriquece a plataforma. Não moderamos comentários por discordância de opinião. Valorizamos comentários que descrevam a experiência do usuário, identifiquem aspectos específicos da produção e contribuam para que outros espectadores tomem decisões mais informadas."
        },
        {
          titulo: "O que não é permitido",
          texto: "Os comentários abaixo serão removidos e poderão resultar na suspensão da conta:"
        },
        {
          titulo: "Ataques pessoais",
          texto: "Criticar um espetáculo é diferente de atacar as pessoas que nele trabalham. Comentários que contenham ofensas diretas, xingamentos ou humilhações dirigidas a artistas, diretores, produtores ou outros profissionais serão removidos."
        },
        {
          titulo: "Discurso de ódio",
          texto: "Não são tolerados comentários que contenham preconceito de qualquer natureza, incluindo racismo, homofobia, misoginia, transfobia, capacitismo ou qualquer outra forma de discriminação."
        },
        {
          titulo: "Assédio",
          texto: "É proibido usar a plataforma para pressionar, ameaçar ou assediar qualquer pessoa, seja dentro ou fora do MBDb."
        },
        {
          titulo: "Conteúdo falso com intenção de prejudicar",
          texto: "Comentários que contenham afirmações sabidamente falsas, com intenção clara de causar dano reputacional a produções ou profissionais, serão removidos. Isso não inclui opiniões negativas ou críticas, mesmo que contundentes."
        },
        {
          titulo: "Spam e publicidade",
          texto: "Comentários que promovam produtos, serviços ou outros sites sem relação com a avaliação do espetáculo serão removidos."
        },
        {
          titulo: "Como funciona a moderação",
          texto: "Os comentários passam por verificação antes de serem publicados. Qualquer usuário pode denunciar um comentário que considere inadequado, e a equipe de moderação avaliará o caso. A decisão de remoção é final e não exige justificativa detalhada ao usuário. A moderação não interfere no conteúdo das avaliações com base em nota ou opinião sobre o espetáculo. Uma nota baixa acompanhada de crítica fundamentada é tão válida quanto uma nota alta."
        },
        {
          titulo: "Responsabilidade do usuário",
          texto: "Cada usuário é responsável pelo conteúdo que publica. O MBDb não se responsabiliza por comentários publicados por terceiros. Ao publicar, o usuário declara que seu comentário está em conformidade com esta política e com os Termos de Uso da plataforma."
        },
        {
          titulo: "Denúncias",
          texto: "Para denunciar um comentário que viole esta política, utilize o botão de denúncia disponível em cada comentário ou entre em contato pelo canal de suporte da plataforma."
        }
      ].map((item, i) => (
        <div key={i} style={{ marginBottom: "28px" }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: "700", marginBottom: "10px" }}>{item.titulo}</h2>
          <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75" }}>{item.texto}</p>
        </div>
      ))}
    </main>
  )
}

export default Politica