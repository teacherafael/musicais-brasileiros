// src/data/teatros.js
// Arquivo de configuração dos teatros.
// Para agrupar um teatro que mudou de nome, adicione os nomes antigos no array "aliases".
// O campo "id" é usado na URL: /teatro/:id

export const teatros = [
  {
    id: "teatro-municipal-sp",
    nomeOficial: "Teatro Municipal de São Paulo",
    aliases: ["Teatro Municipal", "Teatro Municipal SP"],
    endereco: "Praça Ramos de Azevedo, s/n",
    bairro: "Centro",
    cidade: "São Paulo – SP",
  },
  {
    id: "teatro-renaissance",
    nomeOficial: "Teatro Renaissance",
    aliases: ["Renaissance Teatro"],
    endereco: "Alameda Santos, 2233",
    bairro: "Jardim Paulista",
    cidade: "São Paulo – SP",
  },
   {
    id: "teatro-renault",
    nomeOficial: "Teatro Renault",
    aliases: ["Teatro Abril"],
    endereco: "Avenida Brigadeiro Luís Antônio, 411",
    bairro: "Bela Vista",
    cidade: "São Paulo – SP",
  }// Adicione mais teatros aqui seguindo o mesmo padrão
];

// Função auxiliar: dado um nome de teatro vindo do banco de dados,
// retorna o objeto do teatro correspondente (pelo nome oficial ou por qualquer alias).
export function encontrarTeatroPorNome(nome) {
  if (!nome) return null;
  const normalizar = (s) => s.trim().toLowerCase();
  const nomeNorm = normalizar(nome);
  return (
    teatros.find(
      (t) =>
        normalizar(t.nomeOficial) === nomeNorm ||
        t.aliases.some((a) => normalizar(a) === nomeNorm)
    ) || null
  );
}