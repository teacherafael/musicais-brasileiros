// src/data/teatros.js

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
  },
  {
    id: "teatro-claro-mais-sp",
    nomeOficial: "Teatro Claro Mais SP",
    aliases: ["Teatro Net SP"],
    endereco: "Rua Olimpíadas, 360",
    bairro: "Vila Olímpia",
    cidade: "São Paulo – SP",
  },
  {
    id: "teatro-btg-pactual-hall",
    nomeOficial: "BTG Pactual Hall",
    aliases: ["Teatro Alfa"],
    endereco: "R. Bento Branco de Andrade Filho, 722",
    bairro: "Santo Amaro",
    cidade: "São Paulo – SP",
  },
  {
    id: "teatro-sergio-cardoso",
    nomeOficial: "Teatro Sérgio Cardoso",
    aliases: [],
    endereco: "R. Rui Barbosa, 153",
    bairro: "Bela Vista",
    cidade: "São Paulo – SP",
  },
  // Adicione mais teatros aqui seguindo o mesmo padrão
];

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