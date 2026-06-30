import { useNavigate } from "react-router-dom"

function Termos() {
  const navigate = useNavigate()

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">MCDb — Musical Cast Database</p>
      <h1 className="page-title">Termos de Uso</h1>
      <p style={{ fontSize: "13px", color: "#888", marginBottom: "32px" }}>Última atualização: 30 de junho de 2026</p>

      <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75", marginBottom: "24px" }}>
        Ao acessar e utilizar o MCDb (Musical Cast Database), disponível em musicais-brasileiros.vercel.app, você concorda com os presentes Termos de Uso. Caso não concorde com qualquer parte destes termos, pedimos que não utilize a plataforma.
      </p>

      {[
        {
          titulo: "1. Sobre a Plataforma",
          texto: "O MCDb é uma plataforma independente de catalogação e registro de musicais brasileiros. Seu objetivo é reunir informações sobre produções teatrais musicais do Brasil e permitir que usuários cadastrados acompanhem, organizem e avaliem os espetáculos que assistiram. O MCDb não possui vínculo comercial, editorial, contratual ou de qualquer outra natureza com as produções, produtoras, teatros, elencos ou quaisquer profissionais listados em seu banco de dados. A presença de um musical no MCDb não implica endosso, parceria ou relação comercial com seus criadores."
        },
        {
          titulo: "2. Avaliações dos Usuários",
          texto: "As avaliações e notas registradas no MCDb são de autoria exclusiva dos usuários que as criaram. Por padrão, as avaliações de um usuário são privadas e visíveis apenas para ele. O usuário pode optar por tornar suas avaliações públicas, caso em que elas passam a ser exibidas em seu perfil. A plataforma não produz, edita nem endossa as avaliações dos usuários, e as notas registradas não refletem a opinião ou posição oficial do MCDb. Cada usuário é individualmente responsável pelo conteúdo que registra e por decidir torná-lo público."
        },
        {
          titulo: "3. Informações sobre os Musicais",
          texto: "As informações sobre fichas técnicas, equipes criativas, elencos, teatros e demais dados catalogados no MCDb são obtidas de fontes públicas, como sites oficiais das produções, assessorias de imprensa, publicações jornalísticas e materiais de divulgação disponíveis publicamente. Embora a plataforma se esforce para manter as informações precisas e atualizadas, não garante a exatidão ou completude dos dados. Caso identifique alguma imprecisão, entre em contato pelo canal oficial de suporte ou utilize a ferramenta de reportar erro disponível em cada página de musical."
        },
        {
          titulo: "4. Cadastro de Usuário",
          texto: "Para avaliar musicais e utilizar as listas pessoais, o usuário deve entrar com uma conta Google. O usuário é responsável por manter a confidencialidade de seu acesso. É proibido se passar por terceiros ou utilizar a plataforma para finalidades ilegais. O MCDb se reserva o direito de suspender ou excluir contas que violem estes termos."
        },
        {
          titulo: "5. Conteúdo e Conduta do Usuário",
          texto: "O usuário pode publicar informações de perfil na plataforma, como nome de exibição, mini-bio e links para redes sociais. Ao fazê-lo, o usuário concorda em não incluir conteúdo que contenha ataques pessoais, assédio ou discurso de ódio contra artistas, profissionais ou outros usuários; que constitua spam ou publicidade não autorizada; ou que viole direitos de terceiros, incluindo direitos autorais e de imagem. Esta cláusula se aplica a qualquer conteúdo que o usuário venha a disponibilizar em seu perfil ou em outras áreas da plataforma."
        },
        {
          titulo: "6. Moderação de Conteúdo",
          texto: "O MCDb se reserva o direito de moderar, ocultar ou remover qualquer conteúdo publicado por usuários que viole estes Termos de Uso, bem como de suspender as contas responsáveis, sem necessidade de aviso prévio ou justificativa detalhada. A moderação é exercida com base nas diretrizes da plataforma e não implica responsabilidade pelo conteúdo publicado pelos usuários."
        },
        {
          titulo: "7. Propriedade Intelectual",
          texto: "O MCDb e seus elementos de identidade visual, design, código e estrutura são de propriedade da plataforma. É proibida a reprodução, distribuição ou uso comercial desses elementos sem autorização expressa. Ao publicar conteúdo no MCDb, o usuário concede à plataforma licença não exclusiva e gratuita para exibir, reproduzir e distribuir esse conteúdo dentro do ambiente da plataforma."
        },
        {
          titulo: "8. Limitação de Responsabilidade",
          texto: "O MCDb é disponibilizado \"no estado em que se encontra\", sem garantias expressas ou implícitas de disponibilidade contínua, precisão das informações ou adequação a finalidades específicas. A plataforma não se responsabiliza por danos diretos ou indiretos decorrentes do uso ou da impossibilidade de uso do serviço, incluindo eventuais prejuízos a produções ou profissionais em decorrência de conteúdo publicado por usuários."
        },
        {
          titulo: "9. Alterações nos Termos",
          texto: "O MCDb pode atualizar estes Termos de Uso a qualquer momento. As alterações entram em vigor na data de publicação. O uso continuado da plataforma após a publicação de novas versões implica a aceitação dos termos atualizados."
        },
        {
          titulo: "10. Critérios de Inclusão no Banco de Dados",
          texto: "O MCDb cataloga exclusivamente produções teatrais profissionais. Para musicais de origem estrangeira, é exigido que a montagem tenha sido realizada com os devidos direitos de produção adquiridos. Produções amadoras, montagens não licenciadas e apresentações escolares ou universitárias não são elegíveis para inclusão, independentemente de terem sido realizadas publicamente."
        },
        {
          titulo: "11. Contato",
          texto: "Para dúvidas, solicitações de correção de informações ou denúncias de conteúdo inadequado, entre em contato pelo endereço de e-mail disponível na página de suporte da plataforma."
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

export default Termos