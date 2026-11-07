// Lugares do totem: tudo vem de data/lugares.json (nada de texto de lugar no código).
// - Produção: só os lugares com status "publicado".
// - Modo de edição (endereço com ?edicao): os rascunhos também aparecem, marcados.
// Os números dos pins (01, 02...) seguem o campo "numero" e contam só os lugares visíveis.
import { estado } from './estado.js';
import { registrarErro } from './registro.js';

let todos = [];
let categorias = [];
let config = {};

export const modoEdicao = new URLSearchParams(location.search).has('edicao');

/** Carrega lugares.json e config.json. Um arquivo com problema não derruba o totem */
export async function carregarLugares() {
  const ler = (url) =>
    fetch(url, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${url}: ${r.status}`))))
      .catch((e) => (registrarErro('dados', e.message), null));
  const [dados, cfg] = await Promise.all([ler('data/lugares.json'), ler('data/config.json')]);
  config = cfg || {};
  categorias = dados?.categorias || [];
  todos = (dados?.lugares || []).filter(valido).sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999));
}

function valido(l) {
  if (l && typeof l.id === 'string' && l.id && l.nome) return true;
  registrarErro('dados', 'lugar ignorado no lugares.json (falta id ou nome)');
  return false;
}

export const publicado = (l) => l.status === 'publicado';
export const temPosicao = (l) => Number.isFinite(l.latitude) && Number.isFinite(l.longitude);

/** Lugares que aparecem agora (produção: só os publicados), na ordem do "numero" */
export function lugaresVisiveis() {
  return todos.filter((l) => publicado(l) || modoEdicao);
}

/** Lugares com pin no mapa (precisam de latitude e longitude) */
export function lugaresNoMapa() {
  return lugaresVisiveis().filter(temPosicao);
}

/** Rascunhos (só no modo de edição) */
export function rascunhos() {
  return modoEdicao ? todos.filter((l) => !publicado(l)) : [];
}

/** Número do pin: 1, 2, 3... entre os lugares do mapa */
export function numeroDe(l) {
  return lugaresNoMapa().indexOf(l) + 1;
}

export function nomeDaCategoria(id) {
  return categorias.find((c) => c.id === id)?.nome || '';
}

export const chaveGoogle = () => (typeof config.googleMapsEmbedKey === 'string' ? config.googleMapsEmbedKey.trim() : '');

/**
 * Texto de um lugar no idioma atual. Campo vazio ou sem tradução: usa o português.
 * campo: 'frase' | 'descricao' | 'curiosidades' | 'dados' | 'dica_guia'
 */
export function textoDe(l, campo, idioma = estado.idioma) {
  const vazio = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
  const v = l.textos?.[idioma]?.[campo];
  if (!vazio(v)) return v;
  const pt = l.textos?.pt?.[campo];
  return vazio(pt) ? (campo === 'curiosidades' || campo === 'dados' ? [] : '') : pt;
}

/** Fotos para carregar antes (só as dos lugares visíveis) */
export function fotosDosLugares() {
  return lugaresVisiveis()
    .map((l) => l.foto?.arquivo)
    .filter(Boolean);
}
