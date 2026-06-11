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
  id: "teatro-joao-caetano-sp",
  nomeOficial: "Teatro João Caetano",
  aliases: ["Teatro João Caetano SP"],
  endereco: "Rua Borges Lagoa, 650",
  bairro: "Vila Clementino",
  cidade: "São Paulo – SP",
},
{
  id: "teatro-joao-caetano-rj",
  nomeOficial: "Teatro João Caetano",
  aliases: ["Teatro João Caetano RJ"],
  endereco: "Praça Tiradentes, s/n",
  bairro: "Centro",
  cidade: "Rio de Janeiro – RJ",
},
  {
    id: "teatro-sergio-cardoso",
    nomeOficial: "Teatro Sérgio Cardoso",
    aliases: [],
    endereco: "R. Rui Barbosa, 153",
    bairro: "Bela Vista",
    cidade: "São Paulo – SP",
  },
  {
    id: "teatro-santander",
    nomeOficial: "Teatro Santander",
    aliases: [],
    endereco: "Av. Presidente Juscelino Kubitschek, 2041",
    bairro: "Vila Nova Conceição",
    cidade: "São Paulo – SP",
  },
  {
    id: "teatro-popular-sesi-sp",
    nomeOficial: "Teatro Popular do Sesi",
    aliases: ["Teatro SESI"],
    endereco: "Av. Paulista, 1313",
    bairro: "Bela Vista",
    cidade: "São Paulo – SP",
  },
  {
    id: "teatro-liberdade",
    nomeOficial: "Teatro Liberdade",
    aliases: [],
    endereco: "Rua Hipódromo, 85",
    bairro: "Liberdade",
    cidade: "São Paulo – SP",
  },
  {
    id: "teatro-porto",
    nomeOficial: "Teatro Porto",
    aliases: [],
    endereco: "Rua Fradique Coutinho, 1284",
    bairro: "Vila Madalena",
    cidade: "São Paulo – SP",
  },
  {
    id: "teatro-casagrande-rj",
    nomeOficial: "Teatro Casagrande",
    aliases: [],
    endereco: "Rua Voluntários da Pátria, 53",
    bairro: "Botafogo",
    cidade: "Rio de Janeiro – RJ",
  },
  {
    id: "cidade-das-artes",
    nomeOficial: "Cidade das Artes",
    aliases: ["Cidade das Artes RJ"],
    endereco: "Av. das Américas, 5300",
    bairro: "Barra da Tijuca",
    cidade: "Rio de Janeiro – RJ",
  },
  {
    id: "teatro-totalenergies-rj",
    nomeOficial: "Teatro TotalEnergies",
    aliases: ["Teatro Adolpho Bloch", "Teatro Prudential"],
    endereco: "Rua do Russel, 804",
    bairro: "Glória",
    cidade: "Rio de Janeiro – RJ",
  },
  {
    id: "teatro-riachuelo-rj",
    nomeOficial: "Teatro Riachuelo",
    aliases: ["Teatro Riachuelo Rio"],
    endereco: "R. do Passeio, 38",
    bairro: "Centro",
    cidade: "Rio de Janeiro – RJ",
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