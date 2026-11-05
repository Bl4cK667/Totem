// ============================================================================
//  CONFIGURAÇÃO DO MAPA E DO STREET VIEW
//  Tudo o que você precisa ajustar fica aqui. Não precisa mexer no resto.
//  Depois de salvar, é só recarregar o totem (não precisa compilar de novo).
// ============================================================================

// Chave da Google Maps Embed API. É opcional.
// - Local COM "streetView" preenchido: usa o link de incorporação, sem chave.
// - Local com "streetView" vazio: se houver chave, abre o Street View mais
//   próximo de lat/lng pela Embed API; sem chave, mostra "em preparação".
const GOOGLE_MAPS_EMBED_KEY = "";

// ----------------------------------------------------------------------------
//  PONTOS TURÍSTICOS (os pins do mapa, na ordem em que aparecem)
// ----------------------------------------------------------------------------
// Cada ponto tem:
//   id           sem espaços nem acentos (ex.: "praca-central")
//   nome         nome do local
//   lat, lng     coordenadas (no Google Maps: clique com o botão direito no local
//                e clique nos números para copiar; o primeiro é lat, o segundo lng)
//   foto         foto do painel (opcional; fica em assets/img/locais/)
//   descricao    texto curto do painel
//   curiosidades lista de curiosidades
//   streetView   link de incorporação do Google Maps (opcional, veja abaixo)
//
// Textos: pode escrever só em português ("Texto") ou nos três idiomas
// ({ pt: "Texto", en: "Text", es: "Texto" }). Sem tradução, aparece o português.
//
// Como pegar o link do Street View:
//   a) No Google Maps, abra o Street View no ponto e na direção que você quer.
//   b) Clique em Compartilhar > Incorporar um mapa > Copiar HTML.
//   c) Do código copiado, pegue só o que está entre as aspas de src="...".
//   d) Cole em "streetView". O link começa com https://www.google.com/maps/embed
//   O link curto (maps.app.goo.gl) não funciona dentro do site.
const PONTOS_TURISTICOS = [
  {
    id: "prefeitura",
    nome: { pt: "Prefeitura", en: "City Hall", es: "Alcaldía" },
    lat: -6.5509, lng: -49.8476, // CONFERIR NO GOOGLE MAPS
    foto: "assets/img/locais/prefeitura-capa-sm.webp",
    descricao: {
      pt: "O Centro Administrativo foi inaugurado em outubro de 2022, no bairro Novo Horizonte 3. O prédio tem mais de 6 mil m², rampas, elevador e um amplo espaço de convivência.",
      en: "The Administrative Center opened in October 2022 in the Novo Horizonte 3 neighborhood. The building covers over 6,000 m², with ramps, an elevator and a large common area.",
      es: "El Centro Administrativo se inauguró en octubre de 2022, en el barrio Novo Horizonte 3. El edificio tiene más de 6.000 m², rampas, ascensor y un amplio espacio de convivencia.",
    },
    curiosidades: [
      {
        pt: "Com rampas e elevador, o prédio foi entregue como totalmente acessível.",
        en: "With ramps and an elevator, the building was delivered as fully accessible.",
        es: "Con rampas y ascensor, el edificio se entregó como totalmente accesible.",
      },
      {
        pt: "Em setembro de 2026, o maior desfile cívico da história da cidade percorreu a Avenida São João até o Centro Administrativo.",
        en: "In September 2026, the largest civic parade in the city's history marched along São João Avenue to the Administrative Center.",
        es: "En septiembre de 2026, el mayor desfile cívico de la historia de la ciudad recorrió la Avenida São João hasta el Centro Administrativo.",
      },
      {
        pt: "A bandeira da cidade traz uma estrela e o lema \"União de Todos\".",
        en: "The city flag features a star and the motto \"União de Todos\", Unity of All.",
        es: "La bandera de la ciudad lleva una estrella y el lema \"União de Todos\", Unión de Todos.",
      },
    ],
    streetView: "https://www.google.com/maps/embed?pb=!4v1730000000000!6m8!1m7!1snTva48pWX3Rhwqh616TfAg!2m2!1d-6.5509258!2d-49.8476188!3f12.01!4f0.85!5f0.78",
  },
  {
    id: "lago-prefeitura",
    nome: { pt: "Lago da Prefeitura", en: "City Hall Lake", es: "Lago de la Alcaldía" },
    lat: -6.5494, lng: -49.8480, // CONFERIR NO GOOGLE MAPS
    foto: "assets/img/locais/lago-prefeitura-capa-sm.webp",
    descricao: {
      pt: "Um lago de 15 mil m² em frente à Prefeitura, entregue em 2022. A área urbanizada reúne pista de caminhada, playground e academia ao ar livre.",
      en: "A 15,000 m² lake in front of City Hall, opened in 2022. The landscaped area has a walking track, playground and outdoor gym.",
      es: "Un lago de 15.000 m² frente a la Alcaldía, entregado en 2022. El área urbanizada reúne pista para caminar, parque infantil y gimnasio al aire libre.",
    },
    curiosidades: [
      {
        pt: "No Natal de 2025, o lago recebeu um espetáculo com telão de LED e fogos, além da Casa do Papai Noel.",
        en: "At Christmas 2025, the lake hosted a show with an LED screen and fireworks, plus Santa's House.",
        es: "En la Navidad de 2025, el lago recibió un espectáculo con pantalla LED y fuegos artificiales, además de la Casa de Papá Noel.",
      },
      {
        pt: "Em fevereiro de 2026, as margens ganharam mudas nativas, frutíferas e ornamentais.",
        en: "In February 2026, native, fruit and ornamental seedlings were planted along its shores.",
        es: "En febrero de 2026, las orillas recibieron plantones nativos, frutales y ornamentales.",
      },
    ],
    streetView: "https://www.google.com/maps/embed?pb=!4v1730000000000!6m8!1m7!1skJBdBrF35pl7t5LGv4rcbg!2m2!1d-6.549383!2d-49.8479887!3f167.04!4f1.12!5f0.78",
  },
  {
    id: "lago-buritis",
    nome: { pt: "Lago dos Buritis", en: "Buritis Lake", es: "Lago de los Buritíes" },
    lat: -6.5218, lng: -49.8514, // CONFERIR NO GOOGLE MAPS
    foto: "assets/img/locais/lago-buritis-capa-sm.webp",
    descricao: {
      pt: "Ao lado do lago fica o Parque Linear Zulmira Arrais da Silva, inaugurado em 2024, com mais de 37 mil m² de pistas de caminhada, ciclovia e gramados.",
      en: "Next to the lake is the Zulmira Arrais da Silva Linear Park, opened in 2024, with over 37,000 m² of walking tracks, bike paths and lawns.",
      es: "Junto al lago está el Parque Lineal Zulmira Arrais da Silva, inaugurado en 2024, con más de 37.000 m² de pistas para caminar, ciclovía y céspedes.",
    },
    curiosidades: [
      {
        pt: "O buriti é uma palmeira típica de áreas úmidas da Amazônia e do Cerrado.",
        en: "The buriti is a palm typical of wetlands in the Amazon and the Cerrado.",
        es: "El buriti es una palmera típica de zonas húmedas de la Amazonia y el Cerrado.",
      },
      {
        pt: "A ciclovia do parque tem 1.239 metros.",
        en: "The park's bike path is 1,239 meters long.",
        es: "La ciclovía del parque tiene 1.239 metros.",
      },
      {
        pt: "O parque também protege o córrego Palmeirim e ajuda a evitar inundações.",
        en: "The park also protects the Palmeirim stream and helps prevent floods.",
        es: "El parque también protege el arroyo Palmeirim y ayuda a evitar inundaciones.",
      },
    ],
    streetView: "https://www.google.com/maps/embed?pb=!4v1793600572350!6m8!1m7!1sCAoSHENJQUJJaEExQVVOQ3AtZzRBbzB5SUozbVgxa0o.!2m2!1d-6.521768408169661!2d-49.85137378687036!3f319.08!4f-2.25!5f0.7820865974627469",
  },
  {
    id: "rodoviaria",
    nome: { pt: "Rodoviária", en: "Bus Terminal", es: "Terminal de Autobuses" },
    lat: -6.5340, lng: -49.8610, // CONFERIR NO GOOGLE MAPS (posição aproximada)
    foto: "assets/img/locais/rodoviaria-capa-sm.webp",
    descricao: {
      pt: "O Terminal Rodoviário liga Canaã dos Carajás à região e a outros estados. É a porta de entrada de quem chega à cidade pela estrada.",
      en: "The Bus Terminal connects Canaã dos Carajás to the region and to other states. It is the gateway for everyone arriving by road.",
      es: "La Terminal de Autobuses conecta Canaã dos Carajás con la región y con otros estados. Es la puerta de entrada para quien llega por carretera.",
    },
    curiosidades: [
      {
        pt: "A obra da Avenida Minas Gerais, ao lado, prevê 1,5 km de ciclovia e 3 km de calçadas renovadas.",
        en: "Work on nearby Minas Gerais Avenue includes 1.5 km of bike path and 3 km of renewed sidewalks.",
        es: "La obra de la Avenida Minas Gerais, al lado, prevé 1,5 km de ciclovía y 3 km de aceras renovadas.",
      },
    ],
    streetView: "",
  },
  {
    id: "parque-mirante",
    nome: { pt: "Parque do Mirante", en: "Lookout Park", es: "Parque del Mirador" },
    lat: -6.5147, lng: -49.8542, // CONFERIR NO GOOGLE MAPS
    foto: "assets/img/locais/parque-mirante-capa-sm.webp",
    descricao: {
      pt: "Projeto de turismo e lazer com mais de 40 mil m². Duas torres de elevador levam à crista do morro, e uma trilha acessível chega ao ponto de vista do pôr do sol.",
      en: "A tourism and leisure project covering over 40,000 m². Two elevator towers rise to the ridge, and an accessible trail leads to the sunset viewpoint.",
      es: "Proyecto de turismo y ocio con más de 40.000 m². Dos torres de ascensor llevan a la cresta del cerro, y un sendero accesible llega al mirador del atardecer.",
    },
    curiosidades: [
      {
        pt: "O projeto foi premiado em 2024 no 6º Congresso BIM CREA-SC, em Florianópolis.",
        en: "The design won an award in 2024 at the 6th BIM CREA-SC Congress in Florianópolis.",
        es: "El proyecto fue premiado en 2024 en el 6.º Congreso BIM CREA-SC, en Florianópolis.",
      },
      {
        pt: "As torres e os elevadores foram projetados com revestimento de vidro temperado.",
        en: "The towers and elevators were designed with a tempered glass finish.",
        es: "Las torres y los ascensores se proyectaron con revestimiento de vidrio templado.",
      },
    ],
    streetView: "",
  },
];
