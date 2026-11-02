// Street View (Google Maps Embed API) dentro da página do local.
// Sem chave ou sem internet → mostra uma imagem elegante com aviso,
// nunca uma tela quebrada. Se a conexão voltar, carrega sozinho.
import { estado } from '../core/estado.js';
import { t, html } from '../core/i18n.js';

const CHAVE = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const TEMPO_LIMITE = 9000;

function urlStreetView(sv) {
  const p = new URLSearchParams({
    key: CHAVE,
    location: `${sv.lat},${sv.lng}`,
    heading: sv.heading ?? 0,
    pitch: sv.pitch ?? 0,
    fov: sv.fov ?? 80,
    language: estado.idioma === 'pt' ? 'pt-BR' : estado.idioma,
  });
  if (sv.pano) p.set('pano', sv.pano);
  return `https://www.google.com/maps/embed/v1/streetview?${p}`;
}

function fallback(caixa) {
  caixa.classList.remove('carregado');
  caixa.innerHTML = `
    <div class="streetview__off">
      <img src="assets/img/streetview-offline.webp" alt="" />
      <div class="streetview__off-texto">
        <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="1"/><path d="M14 30c3-6 7-9 10-9s7 3 10 9M24 12v5M24 21v0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10 38L38 10" stroke="currentColor" stroke-width="1.2"/></svg>
        <p class="serif">${html(t('local.streetviewOff'))}</p>
        <p class="streetview__off-sub">${html(t('local.streetviewOffSub'))}</p>
      </div>
    </div>`;
}

export function montarStreetView(caixa, sv) {
  let iframe = null;
  let timer = null;

  const tentar = () => {
    if (!CHAVE || !navigator.onLine || !sv) return fallback(caixa);
    caixa.innerHTML = '<div class="streetview__carregando"><i></i></div>';
    iframe = document.createElement('iframe');
    iframe.loading = 'eager';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.allow = 'accelerometer; gyroscope; fullscreen';
    iframe.title = 'Street View';
    iframe.src = urlStreetView(sv);
    timer = setTimeout(() => fallback(caixa), TEMPO_LIMITE);
    iframe.addEventListener('load', () => {
      clearTimeout(timer);
      caixa.classList.add('carregado');
    });
    caixa.appendChild(iframe);
  };

  const off = () => fallback(caixa);
  window.addEventListener('online', tentar);
  window.addEventListener('offline', off);

  return {
    carregar: tentar,
    destruir() {
      clearTimeout(timer);
      window.removeEventListener('online', tentar);
      window.removeEventListener('offline', off);
      iframe?.remove();
    },
  };
}
