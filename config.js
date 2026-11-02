// ============================================================================
//  CONFIGURAÇÃO DO STREET VIEW
//  Tudo o que você precisa ajustar fica aqui. Não precisa mexer no resto.
//  Depois de salvar, é só recarregar o totem.
// ============================================================================

// 1) CHAVE DO GOOGLE
// Troque COLE_AQUI pela sua chave, mantendo as aspas.
// Enquanto estiver COLE_AQUI, o totem mostra a tela "Street View indisponível".
// Atenção: não envie a chave verdadeira para o GitHub, pois o repositório é público.
// No site publicado, a chave fica nas configurações da Vercel (veja o README).
const GOOGLE_MAPS_KEY = "COLE_AQUI";

// 2) TEMPO PARADO
// Segundos sem toque, com o Street View na tela, até voltar para a tela inicial.
const TEMPO_PARADO_SEGUNDOS = 120;

// 3) LOCAIS
// Como trocar a posição de um local:
//   a) No Google Maps, clique com o botão direito no ponto e copie os números
//      (exemplo: -6.53, -49.85). O primeiro é a latitude e o segundo, a longitude.
//   b) Cole em "latitude" e "longitude". O ponto precisa estar a até 50 metros de
//      uma rua com Street View. Para procurar mais longe, acrescente, por
//      exemplo, radius: 200 (em metros).
//
// O que cada campo faz:
//   id        liga ao local do site. NÃO altere (é o mesmo id de data/locais.json).
//   nome      só para você se achar nesta lista.
//   heading   para onde a câmera olha: 0 = norte, 90 = leste, 180 = sul, 270 = oeste.
//   pitch     olhar para cima (até 90) ou para baixo (até -90). 0 = reto.
//   fov       zoom: de 10 (bem perto) a 100 (bem aberto).
//
// ATENÇÃO: os valores abaixo são APROXIMADOS. Vários locais ainda usam o mesmo
// ponto e precisam das coordenadas reais.
const LOCAIS_STREET_VIEW = [
  { id: "cidade",          nome: "Canaã dos Carajás",  latitude: -6.49694, longitude: -49.87778, heading: 0,   pitch: 0, fov: 80 },
  { id: "lago-prefeitura", nome: "Lago da Prefeitura", latitude: -6.531,   longitude: -49.852,   heading: 90,  pitch: 0, fov: 80 },
  { id: "lago-buritis",    nome: "Lago dos Buritis",   latitude: -6.531,   longitude: -49.852,   heading: 180, pitch: 0, fov: 80 },
  { id: "prefeitura",      nome: "Prefeitura",         latitude: -6.531,   longitude: -49.852,   heading: 0,   pitch: 5, fov: 80 },
  { id: "parque-mirante",  nome: "Parque do Mirante",  latitude: -6.531,   longitude: -49.852,   heading: 0,   pitch: 0, fov: 80 },
  { id: "parque-veredas",  nome: "Parque Veredas",     latitude: -6.531,   longitude: -49.852,   heading: 0,   pitch: 0, fov: 80 },
  { id: "rodoviaria",      nome: "Rodoviária",         latitude: -6.51946, longitude: -49.8547,  heading: 0,   pitch: 0, fov: 80 },
];
