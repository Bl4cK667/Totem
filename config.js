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
// Ao tocar num pin, abre a página do lugar (rola para baixo): abertura com a foto,
// "Sobre o lugar" com dados rápidos, "Você sabia?", "Como chegar" (QR Code e
// Street View) e, no fim, os outros lugares. Cada ponto tem:
//   id           sem espaços nem acentos (ex.: "praca-central")
//   nome         nome do local
//   lat, lng     coordenadas (no Google Maps: clique com o botão direito no local
//                e clique nos números para copiar; o primeiro é lat, o segundo lng)
//   foto         foto da abertura da página (fica em assets/img/locais/). Use a
//                versão grande (sem "-sm"): ela ocupa a tela toda. Sem foto certa,
//                deixe "" e a página mostra um espaço marcado "Foto em breve".
//   fotoProjeto  true quando a imagem é a ilustração do projeto, e não uma foto
//   frase        uma frase curta, por cima da foto (no máximo 2 linhas)
//   descricao    "Sobre o lugar": no máximo 4 frases
//   dados        2 ou 3 dados rápidos: { valor: "2022", legenda: "Inauguração" }
//   curiosidades 2 ou 3 curiosidades curtas ("Você sabia?")
//   O QR Code "Como chegar" usa o lat/lng do ponto: não precisa configurar.
//   streetView   link de incorporação do Google Maps (opcional, veja abaixo)
//
// Dois lugares vizinhos num pin só (ex.: Prefeitura e Lago): o texto é um só, e
// "assuntos" lista o Street View de cada um (nome, lat, lng, streetView). A tela
// do Street View mostra um botão para cada um.
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
    id: "prefeitura-lago",
    nome: { pt: "Prefeitura e Lago", en: "City Hall and Lake", es: "Alcaldía y Lago" },
    lat: -6.5502, lng: -49.8478, // entre os dois: o pin fica no meio
    foto: "assets/img/locais/prefeitura-capa.webp", // mostra o prédio e o lago
    frase: { pt: "A sede da Prefeitura, de frente para o lago.", en: "City Hall, right in front of the lake.", es: "La sede de la Alcaldía, frente al lago." },
    descricao: {
      pt: "O Centro Administrativo foi inaugurado em outubro de 2022, no bairro Novo Horizonte 3. O prédio tem rampas, elevador e um amplo espaço de convivência. Em frente, o lago tem pista de caminhada, playground e academia ao ar livre.",
      en: "The Administrative Center opened in October 2022 in the Novo Horizonte 3 neighborhood. The building has ramps, an elevator and a large common area. In front, the lake has a walking track, a playground and an outdoor gym.",
      es: "El Centro Administrativo se inauguró en octubre de 2022, en el barrio Novo Horizonte 3. El edificio tiene rampas, ascensor y un amplio espacio de convivencia. Enfrente, el lago tiene pista para caminar, parque infantil y gimnasio al aire libre.",
    },
    dados: [
      { valor: "2022", legenda: { pt: "Inauguração", en: "Opened", es: "Inauguración" } },
      { valor: { pt: "6 mil m²", en: "6,000 m²", es: "6.000 m²" }, legenda: { pt: "Área do prédio", en: "Building area", es: "Área del edificio" } },
      { valor: { pt: "15 mil m²", en: "15,000 m²", es: "15.000 m²" }, legenda: { pt: "Lago em frente", en: "Lake in front", es: "Lago enfrente" } },
    ],
    curiosidades: [
      { pt: "Com rampas e elevador, o prédio foi entregue totalmente acessível.", en: "With ramps and an elevator, the building was delivered fully accessible.", es: "Con rampas y ascensor, el edificio se entregó totalmente accesible." },
      { pt: "No Natal de 2025, o lago teve telão e fogos.", en: "At Christmas 2025, the lake had a big screen and fireworks.", es: "En Navidad de 2025, el lago tuvo pantalla y fuegos." },
      { pt: "A bandeira da cidade tem o lema \"União de Todos\".", en: "The city flag bears the motto \"União de Todos\".", es: "La bandera lleva el lema \"União de Todos\"." },
    ],
    assuntos: [
      {
        nome: { pt: "Prefeitura", en: "City Hall", es: "Alcaldía" },
        lat: -6.5509, lng: -49.8476, // CONFERIR NO GOOGLE MAPS
        streetView: "https://www.google.com/maps/embed?pb=!4v1730000000000!6m8!1m7!1snTva48pWX3Rhwqh616TfAg!2m2!1d-6.5509258!2d-49.8476188!3f12.01!4f0.85!5f0.78",
      },
      {
        nome: { pt: "Lago da Prefeitura", en: "City Hall Lake", es: "Lago de la Alcaldía" },
        lat: -6.5494, lng: -49.8480, // CONFERIR NO GOOGLE MAPS
        streetView: "https://www.google.com/maps/embed?pb=!4v1730000000000!6m8!1m7!1skJBdBrF35pl7t5LGv4rcbg!2m2!1d-6.549383!2d-49.8479887!3f167.04!4f1.12!5f0.78",
      },
    ],
  },
  {
    id: "lago-buritis",
    nome: { pt: "Lago dos Buritis", en: "Buritis Lake", es: "Lago de los Buritíes" },
    lat: -6.5218, lng: -49.8514, // CONFERIR NO GOOGLE MAPS
    foto: "assets/img/locais/lago-buritis-capa.webp",
    frase: { pt: "Um parque linear com ciclovia em volta do lago.", en: "A linear park with a bike path around the lake.", es: "Un parque lineal con ciclovía alrededor del lago." },
    descricao: {
      pt: "Ao lado do lago fica o Parque Linear Zulmira Arrais da Silva, inaugurado em 2024. São mais de 37 mil m² de gramados, pistas de caminhada e ciclovia.",
      en: "Next to the lake is the Zulmira Arrais da Silva Linear Park, opened in 2024. It has over 37,000 m² of lawns, walking tracks and bike paths.",
      es: "Junto al lago está el Parque Lineal Zulmira Arrais da Silva, inaugurado en 2024. Tiene más de 37.000 m² de césped, pistas para caminar y ciclovía.",
    },
    dados: [
      { valor: "2024", legenda: { pt: "Inauguração do parque", en: "Park opened", es: "Inauguración del parque" } },
      { valor: { pt: "37 mil m²", en: "37,000 m²", es: "37.000 m²" }, legenda: { pt: "Área do parque", en: "Park area", es: "Área del parque" } },
      { valor: { pt: "1.239 m", en: "1,239 m", es: "1.239 m" }, legenda: { pt: "De ciclovia", en: "Of bike path", es: "De ciclovía" } },
    ],
    curiosidades: [
      { pt: "O buriti é uma palmeira típica das áreas úmidas da Amazônia e do Cerrado.", en: "The buriti is a palm typical of wetlands in the Amazon and the Cerrado.", es: "El buriti es una palmera típica de las zonas húmedas de la Amazonia y el Cerrado." },
      { pt: "O parque protege o córrego Palmeirim e ajuda a evitar enchentes.", en: "The park protects the Palmeirim stream and helps prevent floods.", es: "El parque protege el arroyo Palmeirim y ayuda a evitar inundaciones." },
    ],
    streetView: "https://www.google.com/maps/embed?pb=!4v1793600572350!6m8!1m7!1sCAoSHENJQUJJaEExQVVOQ3AtZzRBbzB5SUozbVgxa0o.!2m2!1d-6.521768408169661!2d-49.85137378687036!3f319.08!4f-2.25!5f0.7820865974627469",
  },
  {
    id: "rodoviaria",
    nome: { pt: "Rodoviária", en: "Bus Terminal", es: "Terminal de Autobuses" },
    lat: -6.5340, lng: -49.8610, // CONFERIR NO GOOGLE MAPS (posição aproximada)
    // Sem foto verificada do terminal: a tela mostra "Foto em breve".
    // Quando tiver a foto, coloque em fotos-originais/rodoviaria-capa.jpg,
    // rode "npm run imagens" e escreva aqui: "assets/img/locais/rodoviaria-capa.webp"
    foto: "",
    frase: { pt: "A porta de entrada de quem chega pela estrada.", en: "The gateway for everyone arriving by road.", es: "La puerta de entrada de quien llega por carretera." },
    descricao: {
      pt: "O Terminal Rodoviário liga Canaã dos Carajás à região e a outros estados. É a porta de entrada de quem chega pela estrada. Ao lado, a Avenida Minas Gerais está sendo renovada.",
      en: "The Bus Terminal connects Canaã dos Carajás to the region and to other states. It is the gateway for everyone arriving by road. Next to it, Minas Gerais Avenue is being renewed.",
      es: "La Terminal de Autobuses conecta Canaã dos Carajás con la región y con otros estados. Es la puerta de entrada de quien llega por carretera. Al lado, la Avenida Minas Gerais está siendo renovada.",
    },
    dados: [
      { valor: { pt: "1,5 km", en: "1.5 km", es: "1,5 km" }, legenda: { pt: "De ciclovia na avenida ao lado", en: "Of bike path on the avenue", es: "De ciclovía en la avenida" } },
      { valor: "3 km", legenda: { pt: "De calçadas renovadas", en: "Of renewed sidewalks", es: "De aceras renovadas" } },
    ],
    curiosidades: [
      { pt: "Daqui saem linhas do transporte público da cidade.", en: "City bus routes start from here.", es: "De aquí salen líneas del transporte público de la ciudad." },
      { pt: "As linhas 5A e 5B vão até a Vila dos Imigrantes e o Chacreamento Jerusalém.", en: "Routes 5A and 5B go to Vila dos Imigrantes and Chacreamento Jerusalém.", es: "Las líneas 5A y 5B van hasta la Vila dos Imigrantes y el Chacreamento Jerusalém." },
    ],
    streetView: "",
  },
  {
    id: "parque-mirante",
    nome: { pt: "Parque do Mirante", en: "Lookout Park", es: "Parque del Mirador" },
    lat: -6.5147, lng: -49.8542, // CONFERIR NO GOOGLE MAPS
    foto: "assets/img/locais/parque-mirante-capa.webp",
    fotoProjeto: true, // ilustração do projeto: a tela mostra a legenda "Imagem ilustrativa do projeto"
    frase: { pt: "Turismo e lazer no alto do morro, com vista para a cidade.", en: "Tourism and leisure on the hilltop, overlooking the city.", es: "Turismo y ocio en lo alto del cerro, con vista a la ciudad." },
    descricao: {
      pt: "Projeto de turismo e lazer com mais de 40 mil m². Duas torres de elevador levam à crista do morro. Uma trilha acessível chega ao mirante do pôr do sol.",
      en: "A tourism and leisure project covering over 40,000 m². Two elevator towers rise to the ridge. An accessible trail leads to the sunset viewpoint.",
      es: "Proyecto de turismo y ocio con más de 40.000 m². Dos torres de ascensor llevan a la cresta del cerro. Un sendero accesible llega al mirador del atardecer.",
    },
    dados: [
      { valor: { pt: "40 mil m²", en: "40,000 m²", es: "40.000 m²" }, legenda: { pt: "Área do projeto", en: "Project area", es: "Área del proyecto" } },
      { valor: "2", legenda: { pt: "Torres de elevador", en: "Elevator towers", es: "Torres de ascensor" } },
      { valor: "2024", legenda: { pt: "Projeto premiado", en: "Award-winning design", es: "Proyecto premiado" } },
    ],
    curiosidades: [
      { pt: "O projeto foi premiado em 2024 no 6º Congresso BIM CREA-SC, em Florianópolis.", en: "The design won an award in 2024 at the 6th BIM CREA-SC Congress in Florianópolis.", es: "El proyecto fue premiado en 2024 en el 6.º Congreso BIM CREA-SC, en Florianópolis." },
      { pt: "As torres têm acabamento de vidro temperado.", en: "The towers have a tempered glass finish.", es: "Las torres tienen acabado de vidrio templado." },
    ],
    streetView: "",
  },
];
