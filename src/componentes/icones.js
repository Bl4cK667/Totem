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
  // Pins: um desenho por tipo de lugar (não são uma sequência, então não levam número)
  predio: '<path d="M3.5 20h17M5 9.5h14M5 9.5 12 5l7 4.5M7.5 12.5v5M12 12.5v5M16.5 12.5v5"/>',
  agua: '<path d="M3.5 9.5q2.125-2 4.25 0t4.25 0 4.25 0 4.25 0M3.5 14.5q2.125-2 4.25 0t4.25 0 4.25 0 4.25 0"/>',
  onibus: '<rect x="5" y="3.5" width="14" height="14" rx="2.5"/><path d="M5 11h14M8 17.5v3M16 17.5v3M8.5 14.25h.01M15.5 14.25h.01"/>',
  mirante: '<path d="M2.5 19.5 8.5 12l4 4.5 2.5-3 6.5 6"/><circle cx="16.5" cy="6.5" r="2"/>',
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
