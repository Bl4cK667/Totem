// ============================================================================
//  CONFIGURAÇÃO DO STREET VIEW
//  Tudo o que você precisa ajustar fica aqui. Não precisa mexer no resto.
//  Depois de salvar, é só recarregar o totem.
// ============================================================================

// Cada local tem um link de incorporação do Google Maps. Não precisa de chave.
//
// Como trocar ou adicionar o link de um local:
//   a) No Google Maps, abra o Street View no ponto e na direção que você quer.
//   b) Clique em Compartilhar > Incorporar um mapa > Copiar HTML.
//   c) Do código copiado, pegue só o que está entre as aspas de src="...".
//   d) Cole em "link", abaixo. O link começa com https://www.google.com/maps/embed
//
// Local com link vazio ("") mostra a tela "Street View indisponível".
// O "id" liga ao local do site: NÃO altere (é o mesmo id de data/locais.json).
const LOCAIS_STREET_VIEW = [
  {
    id: "lago-prefeitura",
    nome: "Lago da Prefeitura",
    link: "https://www.google.com/maps/embed?pb=!4v1730000000000!6m8!1m7!1skJBdBrF35pl7t5LGv4rcbg!2m2!1d-6.549383!2d-49.8479887!3f167.04!4f1.12!5f0.78",
  },
  {
    id: "lago-buritis",
    nome: "Lago dos Buritis",
    link: "https://www.google.com/maps/embed?pb=!4v1793600572350!6m8!1m7!1sCAoSHENJQUJJaEExQVVOQ3AtZzRBbzB5SUozbVgxa0o.!2m2!1d-6.521768408169661!2d-49.85137378687036!3f319.08!4f-2.25!5f0.7820865974627469",
  },
  {
    id: "prefeitura",
    nome: "Prefeitura",
    link: "https://www.google.com/maps/embed?pb=!4v1730000000000!6m8!1m7!1snTva48pWX3Rhwqh616TfAg!2m2!1d-6.5509258!2d-49.8476188!3f12.01!4f0.85!5f0.78",
  },
  { id: "cidade",         nome: "Canaã dos Carajás", link: "" },
  { id: "parque-mirante", nome: "Parque do Mirante", link: "" },
  { id: "parque-veredas", nome: "Parque Veredas",    link: "" },
  { id: "rodoviaria",     nome: "Rodoviária",        link: "" },
];
