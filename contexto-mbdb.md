#### `usuarios/{uid}` (subcoleções)
- `queroVer/{musicalId}` → `{ musicalId, titulo, capa, direcao }`
- `jaVi/{musicalId}` → `{ musicalId, titulo, capa, direcao }`
- `top3/{musicalId}` → `{ musicalId, titulo, capa, direcao, ordem }`

---

## Autenticação

- Login via Google (`signInWithPopup`)
- Admin identificado por UID hardcoded: `LFDNXIXywqQrLsDLobaGzOOmok03`
- Sem login: usuário pode navegar e ver conteúdo, mas não pode votar, comentar ou usar listas

---

## SEO e meta tags

- `react-helmet-async` instalado e configurado no `main.jsx` via `HelmetProvider`
- `Musical.jsx` usa `<Helmet>` para definir título da aba e meta tags OG por musical
- Edge function `api/og-musical.js` intercepta requisições de crawlers (WhatsApp, Telegram, etc.) e serve HTML estático com as meta tags corretas, buscando dados via API REST do Firestore
- `api/package.json` com `"type": "commonjs"` para resolver conflito com `"type": "module"` do projeto principal
- `vercel.json` redireciona `/musical/:id` para a edge function e `(.*)` para o `index.html`

---

## Funcionalidades implementadas

### Página Home (`/`)
- Grid de musicais com busca em tempo real (debounce 300ms)
- Busca em múltiplos campos: título, elenco, direção, produção, etc.
- Filtro por ano
- Ordenação: recentes, antigos, melhor/pior avaliação, mais/menos votados, A→Z, Z→A
- Botões "Já vi" e "Quero ver" nos cards (requer login)
- Contador de musicais na database
- Botão "Sugerir um musical"

### Página Musical (`/musical/:id`)
- Todos os dados do musical com nomes clicáveis (linkam para `/pessoa/:nome`)
- Sistema de avaliação com estrelas (meia estrela, 0.5 a 5.0)
- Remoção de voto
- Botões "Já vi" e "Quero ver"
- Copiar link
- Geração de cartão de avaliação para compartilhar (html2canvas → PNG download)
- Seção de comentários (criar, editar, deletar, denunciar)
- Reportar erro na página
- Edição do musical (apenas admin)
- Toast de confirmação de ações
- Meta tags OG dinâmicas via react-helmet-async

### Página Perfil (`/perfil/:userId`)
- Foto e nome do usuário
- Média pessoal de avaliações + total de avaliações
- Seção "Meu Top 3" (editável pelo próprio dono, com busca e seleção)
- Lista de avaliações com nota
- Lista "Já vi"
- Lista "Quero ver"
- Lista de comentários

### Página Pessoa (`/pessoa/:nome`)
- Lista todos os musicais em que o nome aparece em qualquer campo
- Busca por substring (case-insensitive)

### Página Ranking (`/ranking`)
- Top 15 musicais mais bem avaliados (apenas musicais com votos)
- Medalhas para 1º, 2º e 3º lugar

### Página Sugestão (`/sugestao`)
- Formulário público (funciona sem login, mas registra userId se logado)
- Todos os campos do musical, título obrigatório

### Painel Admin (`/admin`)
- Aba Sugestões: revisar, editar, aprovar (publica na coleção musicais) ou rejeitar
- Aba Relatos/Denúncias: ver detalhes, marcar como resolvido
- Aba Musicais publicados: listar, navegar, deletar

### Componentes globais
- `Header`: logo, link Top 15, login/logout Google, foto e nome do usuário, link para perfil
- `Footer`: links para Termos e Política, copyright
- `ReportarErro`: botão + formulário inline para reportar erros em páginas de musical
- `VoltarAoTopo`: botão fixo que aparece após scroll de 300px

---

## Identidade visual

| Elemento | Valor |
|---|---|
| Cor primária | `#F5C518` (amarelo) |
| Cor de fundo escuro | `#1a1a1a` |
| Borda padrão | `#e8e8e4` |
| Fonte de texto | DM Sans |
| Fonte de títulos | Playfair Display |
| Border radius padrão | 8px (cards: 6px) |

---

## Observações de desenvolvimento

- Rafael é o único desenvolvedor, sem experiência prévia em programação
- Preferência por código simples e direto, sem over-engineering
- Inline styles são usados extensivamente (padrão do projeto)
- Não há TypeScript nem testes automatizados
- Imagens de capa são hospedadas no Cloudinary e referenciadas por URL
- A média de avaliação é sempre calculada na hora: `somaEstrelas / totalVotos`