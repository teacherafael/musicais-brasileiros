import { useNavigate } from "react-router-dom"

function Termos() {
  const navigate = useNavigate()

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">MBDb — Musicais Brasileiros Database</p>
      <h1 className="page-title">Termos de Uso</h1>
      <p style={{ fontSize: "13px", color: "#888", marginBottom: "32px" }}>Última atualização: 08 de junho de 2026</p>

      <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75", marginBottom: "24px" }}>
        Ao acessar e utilizar o MBDb (Musicais Brasileiros Database), disponível em musicais-brasileiros.vercel.app, você concorda com os presentes Termos de Uso. Caso não concorde com qualquer parte destes termos, pedimos que não utilize a plataforma.
      </p>

      {[
        {
          titulo: "1. Sobre a Plataforma",
          texto: "O MBDb é uma plataforma independente de catalogação, avaliação e registro de musicais brasileiros. Seu objetivo é reunir informações sobre produções teatrais musicais do Brasil, permitindo que usuários cadastrados compartilhem avaliações, opiniões e comentários sobre os espetáculos. O MBDb não possui vínculo comercial, editorial, contratual ou de qualquer outra natureza com as produções, produtoras, teatros, elencos ou quaisquer profissionais listados em seu banco de dados. A presença de um musical no MBDb não implica endosso, parceria ou relação comercial com seus criadores."
        },
        {
          titulo: "2. Avaliações e Notas",
          texto: "Todas as avaliações, notas e comentários publicados no MBDb são de autoria exclusiva dos usuários que os enviaram. A plataforma não produz, edita nem endossa o conteúdo avaliativo enviado pelos usuários. As notas exibidas representam a média das avaliações da comunidade de usuários cadastrados, e não refletem a opinião ou posição oficial da plataforma. O MBDb não se responsabiliza por avaliações consideradas negativas, imprecisas ou divergentes da percepção das produções avaliadas. Cada usuário é individualmente responsável pelo conteúdo que publica."
        },
        {
          titulo: "3. Informações sobre os Musicais",
          texto: "As informações sobre fichas técnicas, elencos, datas de temporada e demais dados catalogados no MBDb são obtidas de fontes públicas, como sites oficiais das produções, assessorias de imprensa, publicações jornalísticas e materiais de divulgação disponíveis publicamente. Embora a plataforma se esforce para manter as informações precisas e atualizadas, não garante a exatidão ou completude dos dados. Caso identifique alguma imprecisão, entre em contato pelo canal oficial de suporte."
        },
        {
          titulo: "4. Cadastro de Usuário",
          texto: "Para publicar avaliações e comentários, o usuário deve criar uma conta no MBDb. O cadastro exige informações básicas de identificação. O usuário é responsável por manter a confidencialidade de seus dados de acesso. É proibido criar contas com dados falsos, se passar por terceiros ou utilizar a plataforma para finalidades ilegais. O MBDb se reserva o direito de suspender ou excluir contas que violem estes termos."
        },
        {
          titulo: "5. Conduta dos Usuários",
          texto: "Ao utilizar o MBDb, o usuário concorda em não publicar conteúdo que contenha ataques pessoais, assédio ou discurso de ódio contra artistas, profissionais ou outros usuários; seja spam, publicidade não autorizada ou conteúdo sem relação com a plataforma; viole direitos de terceiros, incluindo direitos autorais e direitos de imagem; ou contenha informações sabidamente falsas com intenção de prejudicar produções ou profissionais."
        },
        {
          titulo: "6. Moderação de Conteúdo",
          texto: "O MBDb se reserva o direito de moderar, editar ou remover qualquer conteúdo publicado por usuários que viole estes Termos de Uso, sem necessidade de aviso prévio ou justificativa detalhada. A moderação é exercida com base nas diretrizes da plataforma e não implica responsabilidade pelo conteúdo publicado pelos usuários, tampouco representa concordância ou discordância com as avaliações publicadas."
        },
        {
          titulo: "7. Propriedade Intelectual",
          texto: "O MBDb e seus elementos de identidade visual, design, código e estrutura são de propriedade da plataforma. É proibida a reprodução, distribuição ou uso comercial desses elementos sem autorização expressa. Ao publicar conteúdo no MBDb, o usuário concede à plataforma licença não exclusiva e gratuita para exibir, reproduzir e distribuir esse conteúdo dentro do ambiente da plataforma."
        },
        {
          titulo: "8. Limitação de Responsabilidade",
          texto: "O MBDb é disponibilizado \"no estado em que se encontra\", sem garantias expressas ou implícitas de disponibilidade contínua, precisão das informações ou adequação a finalidades específicas. A plataforma não se responsabiliza por danos diretos ou indiretos decorrentes do uso ou da impossibilidade de uso do serviço, incluindo eventuais prejuízos a produções ou profissionais em decorrência de avaliações publicadas por usuários."
        },
        {
          titulo: "9. Alterações nos Termos",
          texto: "O MBDb pode atualizar estes Termos de Uso a qualquer momento. As alterações entram em vigor na data de publicação. O uso continuado da plataforma após a publicação de novas versões implica a aceitação dos termos atualizados."
        },
        {
          titulo: "10. Contato",
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