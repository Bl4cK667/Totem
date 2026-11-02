// Idiomas (PT / EN / ES). Todos os textos vêm de data/locais.json.
import { estado, emitir } from './estado.js';

export const IDIOMAS = ['pt', 'en', 'es'];
const HTML_LANG = { pt: 'pt-BR', en: 'en', es: 'es' };

/** Texto da interface: t('inicio.botao') */
export function t(chave) {
  const d = estado.dados.interface;
  return d[estado.idioma]?.[chave] ?? d.pt[chave] ?? chave;
}

/** Texto de conteúdo no idioma atual: tr({ pt, en, es }) */
export function tr(obj) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[estado.idioma] ?? obj.pt ?? '';
}

function escapar(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Converte texto em HTML seguro, transformando [CONFIRMAR] em uma etiqueta discreta */
export function html(texto) {
  return escapar(texto).replace(/\s*\[CONFIRMAR\]/g, ' <span class="confirmar">CONFIRMAR</span>');
}

/** Texto puro sem a marca [CONFIRMAR] (para animações letra a letra, números etc.) */
export function limpo(texto) {
  return String(texto).replace(/\s*\[CONFIRMAR\]/g, '').trim();
}

export function temConfirmar(texto) {
  return /\[CONFIRMAR\]/.test(String(texto));
}

/** Atualiza todos os elementos com data-i18n dentro de raiz */
export function aplicarTextos(raiz = document) {
  raiz.querySelectorAll('[data-i18n]').forEach((el) => {
    el.innerHTML = html(t(el.dataset.i18n));
  });
  raiz.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
}

/** Monta os botões PT/EN/ES em todos os seletores da página */
export function montarSeletores() {
  document.querySelectorAll('.idiomas').forEach((grupo) => {
    grupo.innerHTML = IDIOMAS.map(
      (id) => `<button data-idioma="${id}" aria-pressed="${id === estado.idioma}"><span>${id.toUpperCase()}</span></button>`
    ).join('');
    grupo.addEventListener('click', (e) => {
      const b = e.target.closest('[data-idioma]');
      if (b) mudarIdioma(b.dataset.idioma);
    });
  });
}

export function mudarIdioma(id) {
  if (!IDIOMAS.includes(id) || id === estado.idioma) return;
  estado.idioma = id;
  document.documentElement.lang = HTML_LANG[id];
  document.querySelectorAll('[data-idioma]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.idioma === id)));
  aplicarTextos();
  emitir('idioma', id);
}
