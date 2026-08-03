import { useNavigate } from "react-router-dom"

function Privacidade() {
  const navigate = useNavigate()

  return (
    <main>
      <button className="voltar" onClick={() => navigate("/")}>← Voltar</button>
      <p className="section-label">MCDb — Musical Cast Database</p>
      <h1 className="page-title">Política de Privacidade</h1>
      <p style={{ fontSize: "13px", color: "#888", marginBottom: "32px" }}>Última atualização: 2 de agosto de 2026</p>

      <p style={{ fontSize: "15px", color: "#444", lineHeight: "1.75", marginBottom: "24px" }}>
        Esta Política de Privacidade descreve como o MCDb (Musical Cast Database), disponível em mcdb.musicalcast.com.br, coleta, utiliza, armazena e protege os dados pessoais de seus usuários, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD). Ao utilizar a plataforma, você declara estar ciente das práticas aqui descritas.
      </p>

      {[
        {
          titulo: "1. Quem é o controlador dos dados",
          texto: "O MCDb é uma iniciativa ligada ao podcast Musical Cast e é operado de forma independente. Para qualquer assunto relacionado a dados pessoais — dúvidas, solicitações ou exercício de direitos — o contato é o e-mail musicalcastbr@gmail.com."
        },
        {
          titulo: "2. Quais dados coletamos",
          texto: "O acesso à plataforma é feito exclusivamente por conta Google. Ao entrar, recebemos do Google o seu nome de exibição, endereço de e-mail, foto de perfil e o identificador único da conta. Não temos acesso à sua senha do Google nem a qualquer outro dado da sua conta. Além disso, armazenamos o que você registra na plataforma: notas atribuídas a musicais, reações de recomendação, listas pessoais (\"Já vi\", \"Quero ver\" e Top 5 favoritos), registros de sessões assistidas, mensagens diretas, relações de seguir e ser seguido, informações opcionais de perfil (nome de exibição personalizado, foto personalizada, mini-bio e links para redes sociais) e as sugestões de musicais ou relatos de erro enviados pelos formulários da plataforma."
        },
        {
          titulo: "3. Dados de navegação",
          texto: "Utilizamos o Cloudflare Web Analytics para entender o uso geral da plataforma. Essa ferramenta não utiliza cookies e não constrói perfis individuais de navegação: os dados são agregados e anônimos, como número de visitas e páginas mais acessadas."
        },
        {
          titulo: "4. Para que usamos os dados",
          texto: "Utilizamos seus dados para permitir o acesso à sua conta e identificá-lo na plataforma, exibir suas listas e informações de perfil, calcular as médias e o ranking dos musicais catalogados, viabilizar as funcionalidades sociais (seguir, mensagens e notificações), enviar um e-mail de boas-vindas no primeiro cadastro, enviar comunicados eventuais sobre a plataforma e entender de forma agregada como a plataforma é utilizada. Não vendemos, alugamos nem cedemos seus dados pessoais a terceiros para fins comerciais ou publicitários. A plataforma não exibe anúncios."
        },
        {
          titulo: "5. Privacidade das suas avaliações",
          texto: "As notas em estrelas são sempre privadas: nenhum outro usuário visualiza, na plataforma, a nota que você atribuiu a um musical. Elas são usadas apenas de forma agregada, para compor a média e o ranking. As reações de recomendação podem ser públicas ou privadas, conforme a configuração escolhida por você no seu perfil. Suas informações de perfil e suas listas são públicas e visíveis para qualquer visitante. As mensagens diretas são privadas entre os participantes da conversa."
        },
        {
          titulo: "6. Com quem os dados são compartilhados",
          texto: "Utilizamos serviços de terceiros para operar a plataforma, e cada um trata apenas os dados necessários à sua função: Google (Firebase Authentication) para autenticação de contas; Google (Cloud Firestore) para armazenamento do banco de dados; Vercel para hospedagem da aplicação; Cloudflare para armazenamento de imagens, DNS e analytics; e EmailJS para o envio do e-mail de boas-vindas. Esses serviços podem armazenar dados em servidores localizados fora do Brasil. Ao utilizar a plataforma, você está ciente dessa transferência internacional, realizada com base na execução do serviço solicitado. Além disso, podemos compartilhar dados quando houver obrigação legal, ordem judicial ou requisição de autoridade competente."
        },
        {
          titulo: "7. Por quanto tempo guardamos seus dados",
          texto: "Seus dados permanecem armazenados enquanto sua conta estiver ativa. Quando uma funcionalidade da plataforma é descontinuada, os dados pessoais associados a ela são eliminados, já que a finalidade que justificava sua coleta se encerrou."
        },
        {
          titulo: "8. Exclusão da conta",
          texto: "Você pode excluir sua conta a qualquer momento, sem precisar solicitar nada a ninguém: o botão \"Deletar minha conta\" está disponível na sua própria página de perfil. Por segurança, a plataforma pedirá que você confirme sua identidade fazendo login novamente antes de concluir a operação. São apagados todos os seus dados pessoais, sem exceção: cadastro (nome, e-mail e foto de perfil), mini-bio, links de redes sociais, listas \"Já vi\", \"Quero ver\" e Top 5, registros de sessões assistidas, reações, mensagens diretas, notificações, relações de seguir e seguidores, e o próprio acesso à plataforma. Permanecem apenas as notas que você atribuiu, e exclusivamente como número dentro da média de cada musical — sem nome, sem identificador e sem qualquer vínculo com você. Uma vez desvinculada, a nota deixa de ser um dado pessoal e passa a ser apenas uma informação estatística sobre o musical. A exclusão não pode ser desfeita. Caso prefira, ou caso encontre qualquer dificuldade, você também pode solicitar a exclusão pelo e-mail musicalcastbr@gmail.com, e o pedido será atendido em até 15 dias."
        },
        {
          titulo: "9. Seus direitos",
          texto: "A LGPD garante a você, a qualquer momento, o direito de confirmar se tratamos dados seus e acessá-los; corrigir dados incompletos, inexatos ou desatualizados; solicitar a anonimização, o bloqueio ou a eliminação de dados desnecessários ou tratados em desconformidade com a lei; solicitar a portabilidade dos seus dados; obter informação sobre com quem compartilhamos seus dados; revogar seu consentimento e solicitar a eliminação da conta; e ser informado sobre a possibilidade de não fornecer consentimento e sobre as consequências disso. Boa parte desses direitos pode ser exercida diretamente na plataforma: você edita suas informações de perfil, ajusta a privacidade das suas reações e exclui sua conta sem intermediários. Para os demais casos, escreva para musicalcastbr@gmail.com. Responderemos em até 15 dias."
        },
        {
          titulo: "10. Segurança",
          texto: "Adotamos medidas técnicas para proteger seus dados, incluindo conexão criptografada (HTTPS) em toda a plataforma, autenticação delegada ao Google — de modo que não armazenamos senhas — e regras de acesso ao banco de dados que restringem cada usuário aos seus próprios dados. Nenhum sistema é totalmente imune a incidentes. Caso ocorra algum incidente de segurança relevante que possa acarretar risco ou dano a você, comunicaremos os usuários afetados e a Autoridade Nacional de Proteção de Dados (ANPD), conforme exige a lei."
        },
        {
          titulo: "11. Menores de idade",
          texto: "A plataforma não é direcionada a menores de 13 anos. Caso identifiquemos um cadastro nessa faixa etária, a conta será excluída. Se você é responsável por um menor e acredita que ele forneceu dados à plataforma, entre em contato pelo e-mail indicado."
        },
        {
          titulo: "12. Dados de profissionais catalogados",
          texto: "O MCDb cataloga informações profissionais sobre artistas, equipes criativas, produtoras e demais profissionais do teatro musical brasileiro. Essas informações são obtidas de fontes públicas — sites oficiais, materiais de divulgação, publicações jornalísticas e assessorias de imprensa — e se limitam à atuação profissional dessas pessoas em produções teatrais, com finalidade documental e de interesse histórico e cultural. Profissionais que desejem solicitar correção ou revisão de informações a seu respeito podem escrever para musicalcastbr@gmail.com."
        },
        {
          titulo: "13. Alterações nesta Política",
          texto: "Esta Política pode ser atualizada a qualquer momento. A data da última atualização consta no topo desta página. Alterações relevantes serão comunicadas aos usuários pelos canais da plataforma."
        },
        {
          titulo: "14. Contato",
          texto: "Para qualquer dúvida, solicitação ou reclamação relacionada a dados pessoais, escreva para musicalcastbr@gmail.com."
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

export default Privacidade
