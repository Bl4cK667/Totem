// Estado global simples do totem (idioma, tela atual, local aberto)
// com aviso para quem quiser reagir às mudanças.

const ouvintes = new Map();

export const estado = {
  dados: null,      // textos da interface (data/locais.json); os lugares ficam em core/lugares.js
  idioma: 'pt',
  tela: null,       // 'inicio' | 'transicao' | 'locais' | 'local'
  localId: null,
  ocupado: false,   // true durante transições (bloqueia toques duplos)
};

export function em(evento, fn) {
  if (!ouvintes.has(evento)) ouvintes.set(evento, new Set());
  ouvintes.get(evento).add(fn);
  return () => ouvintes.get(evento).delete(fn);
}

export function emitir(evento, valor) {
  ouvintes.get(evento)?.forEach((fn) => fn(valor));
}

/**
 * Versão curta da transição do planeta. Só vale se ligada em locais.json: num totem,
 * as animações desligadas no Windows são da máquina, não uma escolha do visitante.
 */
export function transicaoCurta() {
  // "Menos animações" escolhido pelo visitante no painel de acessibilidade vale sempre
  if (document.documentElement.classList.contains('a11y-calmo')) return true;
  return estado.dados.config.transicaoCurtaSemAnimacoes && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

