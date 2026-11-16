// Conjunto de ícones do totem: todos na mesma grade (24 × 24), com o mesmo traço
// (--icone em tokens.css, 1,5 px na grade) e pontas arredondadas. A cor vem do texto
// (currentColor), então cada ícone segue a cor do botão ou do pin onde está.
//
// Uso no HTML:  <span data-icone="seta"></span>   (trocado pelo SVG em aplicarIcones)
// Uso no JS:    icone('casa')  ->  string com o <svg>

const DESENHOS = {
  seta: '<path d="M4 12h16M14 6l6 6-6 6"/>',
  voltar: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
  baixo: '<path d="M12 4v16M6 14l6 6 6-6"/>',
  casa: '<path d="M3.5 11 12 4l8.5 7M6.5 9v11h4v-5h3v5h4V9"/>',
  idioma: '<circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="3.6" ry="8.5"/><path d="M3.5 12h17"/>',
  streetview: '<circle cx="12" cy="6" r="2.25"/><path d="M9 17v-4a3 3 0 0 1 6 0v4"/><ellipse cx="12" cy="19.5" rx="7" ry="1.75"/>',
  // Pins: um desenho por lugar, contando o que ele é (não são uma sequência, então sem número).
  // Mesma grade e mesmo traço; a linha d'água embaixo repete nos lugares com lago
  // Centro Administrativo: o prédio com janelas, a porta e a bandeira hasteada no alto
  predio:
    '<path d="M3.5 20h17M5 20V9h14v11M16.5 9V3.5M16.5 4H20l-1 1.25 1 1.25h-3.5M10.5 20v-3.5h3V20"/>' +
    '<path d="M7.75 12.25h1.5M11.25 12.25h1.5M14.75 12.25h1.5M7.75 15.5h1.5M14.75 15.5h1.5"/>',
  // Lago dos Buritis: o buriti (palmeira de folha em leque) na beira do lago
  agua:
    '<path d="M12 18.5V9.5M12 9.5 6 8.25M12 9.5 6.9 5.25M12 9.5 9.1 3.4M12 9.5V2.75M12 9.5l2.9-6.1M12 9.5l5.1-4.25M12 9.5l6-1.25M9.5 9.75c1.25-.15 2.25-.15 5 0"/>' +
    '<path d="M3 20.5q1.5-1.3 3 0t3 0 3 0 3 0 3 0 3 0"/>',
  // Rodoviária: ônibus de viagem de frente, com para-brisa, retrovisores e faróis
  onibus:
    '<rect x="6" y="3.5" width="12" height="14" rx="2.5"/><rect x="7.75" y="6" width="8.5" height="5.5" rx="1"/>' +
    '<path d="M6 8.5H4.5V11M18 8.5h1.5V11M8 17.5v2.5M16 17.5v2.5M8.75 14.5h.01M15.25 14.5h.01"/>',
  // Parque do Mirante: o quiosque do mirante no alto do morro, com o sol sobre a serra
  mirante:
    '<path d="M2.5 20h19M3.5 20c2.8-4.4 5.6-6.6 8.5-6.6s5.7 2.2 8.5 6.6M8.75 8.5 12 5.75l3.25 2.75ZM10 8.5v4.9M14 8.5v4.9"/>' +
    '<circle cx="18.75" cy="5" r="1.75"/>',
  ponto: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.5"/>',
};

/** SVG do ícone; classe extra opcional (ex.: 'icone--grande') */
export function icone(nome, classe = '') {
  const desenho = DESENHOS[nome] || DESENHOS.ponto;
  return `<svg class="icone ${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${desenho}</svg>`;
}

/** Troca cada <span data-icone="nome"> do HTML pelo SVG correspondente */
export function aplicarIcones(raiz = document) {
  raiz.querySelectorAll('[data-icone]').forEach((el) => {
    el.outerHTML = icone(el.dataset.icone, el.className);
  });
}

/** Ícone de um ponto turístico: pelo campo "icone" do ponto, se houver, ou pelo tipo no id */
const REGRAS = [
  [/prefeitura|camara|paco|predio/, 'predio'],
  [/rodoviaria|terminal|onibus/, 'onibus'],
  [/mirante|parque|serra|morro/, 'mirante'],
  [/lago|rio|praia|cachoeira|agua/, 'agua'],
];
export function iconeDoPonto(ponto) {
  if (ponto.icone && DESENHOS[ponto.icone]) return ponto.icone;
  const id = String(ponto.id || '');
  const regra = REGRAS.find(([re]) => re.test(id));
  return regra ? regra[1] : 'ponto';
}
