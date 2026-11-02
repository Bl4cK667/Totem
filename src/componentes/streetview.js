// Street View (Google Maps Embed API) dentro da página do local.
// O link de incorporação de cada local vem de config.js (raiz do projeto).
// Sem link, sem internet ou demorando demais → mostra uma imagem elegante
// com aviso, nunca uma tela quebrada. Se a conexão voltar, carrega sozinho.
import { estado } from '../core/estado.js';
import { t, html } from '../core/i18n.js';

const TEMPO_LIMITE = 15000;
const REPETIR_TESTE = 30000;

// navigator.onLine só sabe se há rede, e o iframe "carrega" mesmo com falha:
// este endereço do Google confirma que a internet chega até lá de verdade
function temInternet() {
  return fetch('https://www.google.com/generate_204', { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(TEMPO_LIMITE) }).then(
    () => true,
    () => false
  );
}

/* global LOCAIS_STREET_VIEW */
function linkDoLocal(id) {
  if (typeof LOCAIS_STREET_VIEW === 'undefined') return '';
  return LOCAIS_STREET_VIEW.find((l) => l.id === id)?.link?.trim() || '';
}

// O idioma do link vale para os textos que o Google mostra na imagem
function urlStreetView(link) {
  return `${link}&hl=${estado.idioma === 'pt' ? 'pt-BR' : estado.idioma}`;
}

// Motivo → explicação para o visitante
const SUBTITULOS = {
  offline: 'local.streetviewOffSub',
  preparo: 'local.streetviewPreparoSub',
  demora: 'local.streetviewDemoraSub',
};

function fallback(caixa, motivo) {
  caixa.classList.remove('carregado');
  caixa.innerHTML = `
    <div class="streetview__off">
      <img src="assets/img/streetview-offline.webp" alt="" />
      <div class="streetview__off-texto">
        <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" stroke-width="1"/><path d="M14 30c3-6 7-9 10-9s7 3 10 9M24 12v5M24 21v0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M10 38L38 10" stroke="currentColor" stroke-width="1.2"/></svg>
        <p class="serif">${html(t('local.streetviewOff'))}</p>
        <p class="streetview__off-sub">${html(t(SUBTITULOS[motivo]))}</p>
      </div>
    </div>`;
}

export function montarStreetView(moldura, id) {
  const caixa = moldura.querySelector('.streetview');
  const link = linkDoLocal(id);
  let iframe = null;
  let timer = null;
  let pedido = false; // a pessoa já chegou perto do capítulo
  let tentativa = 0; // respostas de tentativas antigas são ignoradas

  const limpar = () => {
    tentativa++;
    clearTimeout(timer);
    iframe?.remove();
    iframe = null;
  };

  const erro = (motivo) => {
    limpar();
    moldura.classList.add('sem-street-view');
    fallback(caixa, motivo);
  };

  // Rede ligada, mas sem internet: nenhum evento avisa quando ela volta
  const aguardarInternet = () => {
    const esta = tentativa;
    timer = setTimeout(async () => {
      const voltou = await temInternet();
      if (esta !== tentativa) return;
      if (voltou) tentar();
      else aguardarInternet();
    }, REPETIR_TESTE);
  };

  const tentar = async () => {
    limpar();
    if (!navigator.onLine) return erro('offline');
    if (!link) return erro('preparo');
    moldura.classList.remove('sem-street-view');
    caixa.classList.remove('carregado');
    caixa.innerHTML = `<div class="streetview__carregando"><i></i><span class="legenda">${html(t('local.streetviewCarregando'))}</span></div>`;
    timer = setTimeout(() => erro('demora'), TEMPO_LIMITE);

    const esta = tentativa;
    const internet = await temInternet();
    if (esta !== tentativa) return;
    if (!internet) {
      erro('offline');
      return aguardarInternet();
    }

    iframe = document.createElement('iframe');
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.allow = 'accelerometer; gyroscope; fullscreen';
    iframe.allowFullscreen = true;
    iframe.title = 'Street View';
    iframe.src = urlStreetView(link);
    iframe.addEventListener('load', () => {
      clearTimeout(timer);
      caixa.classList.add('carregado');
    });
    caixa.appendChild(iframe);
  };

  const carregar = () => {
    pedido = true;
    tentar();
  };

  // Antes de a pessoa chegar ao capítulo, internet indo e voltando não carrega nada
  const on = () => pedido && tentar();
  const off = () => pedido && erro('offline');
  window.addEventListener('online', on);
  window.addEventListener('offline', off);

  // A moldura sai do fluxo em tela cheia: ao fechar, a página volta para onde estava
  const scroller = moldura.closest('.local-scroll');
  let rolagem = null;
  const aoMudarTela = () => {
    if (document.fullscreenElement || rolagem === null) return;
    const y = rolagem;
    rolagem = null;
    requestAnimationFrame(() => (scroller.scrollTop = y));
  };
  const aoClicar = (e) => {
    if (e.target.closest('[data-sv="tela-cheia"]')) {
      rolagem = scroller.scrollTop;
      moldura.requestFullscreen().catch(() => (rolagem = null));
    } else if (document.fullscreenElement && e.target.closest('[data-acao="voltar"]')) {
      e.stopPropagation();
      document.exitFullscreen().catch(() => {});
    }
  };
  moldura.classList.toggle('sem-tela-cheia', !document.fullscreenEnabled);
  moldura.addEventListener('click', aoClicar);
  document.addEventListener('fullscreenchange', aoMudarTela);

  return {
    carregar,
    destruir() {
      limpar();
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      moldura.removeEventListener('click', aoClicar);
      document.removeEventListener('fullscreenchange', aoMudarTela);
      if (document.fullscreenElement === moldura) document.exitFullscreen().catch(() => {});
    },
  };
}
