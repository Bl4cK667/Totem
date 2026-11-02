// Estado global simples do totem (idioma, tela atual, local aberto)
// com aviso para quem quiser reagir às mudanças.

const ouvintes = new Map();

export const estado = {
  dados: null,      // conteúdo de data/locais.json
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

/** Locais ativos, na ordem do JSON */
export function locaisAtivos() {
  return estado.dados.locais.filter((l) => l.ativo !== false);
}

export function localPorId(id) {
  return locaisAtivos().find((l) => l.id === id);
}

export function proximoLocal(id) {
  const lista = locaisAtivos();
  const i = lista.findIndex((l) => l.id === id);
  return lista[(i + 1) % lista.length];
}
