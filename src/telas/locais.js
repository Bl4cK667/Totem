// Tela de locais: carrossel arrastável com foto grande, nome e frase.
// Toque no card central abre o local; toque num card lateral traz ele ao centro.
import gsap from 'gsap';
import { estado, locaisAtivos } from '../core/estado.js';
import { t, tr, html } from '../core/i18n.js';
import { preCarregar } from '../util/preload.js';

const tela = document.querySelector('[data-tela="locais"]');
const SETA = '<svg class="seta" viewBox="0 0 28 16" aria-hidden="true"><path d="M0 8h26M19 1l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

let indice = 0;
let trilhoX = 0;
let aoAbrir = () => {};
let els = {};

const QUASE_INVISIVEL = 0.001;

const dois = (n) => String(n).padStart(2, '0');

export function montarLocais({ aoAbrirLocal }) {
  aoAbrir = aoAbrirLocal;
  renderizar();
  window.addEventListener('resize', () => estado.tela === 'locais' && posicionar(false));
}

/** Monta (ou remonta, ao trocar idioma) o HTML da tela */
export function renderizar() {
  const lista = locaisAtivos();
  tela.innerHTML = `
    <header class="locais__cabecalho">
      <p class="legenda locais__sobretitulo"><span class="filete"></span>${html(t('locais.sobretitulo'))}</p>
      <h2 class="locais__titulo"><span class="linha"><span>${html(t('locais.titulo'))}</span></span></h2>
    </header>

    <div class="carrossel" role="listbox">
      <div class="carrossel__trilho">
        ${lista
          .map(
            (l, i) => `
          <article class="card-local" data-id="${l.id}" data-i="${i}" role="option">
            <div class="card-local__foto"><img src="${l.fotos.miniatura || l.fotos.capa}" alt="" decoding="sync" /></div>
            <div class="card-local__veu"></div>
            <div class="card-local__texto">
              <p class="card-local__num serif">${dois(i + 1)}</p>
              <p class="legenda card-local__categoria">${html(tr(l.categoria))}</p>
              <h3 class="card-local__nome">${html(tr(l.nome))}</h3>
              <p class="card-local__frase">${html(tr(l.frase))}</p>
              <span class="botao botao--ouro card-local__abrir">${html(t('locais.abrir'))}${SETA}</span>
            </div>
          </article>`
          )
          .join('')}
      </div>
    </div>

    <footer class="locais__rodape">
      <button class="seta-redonda" data-dir="-1" aria-label="anterior">${SETA}</button>
      <div class="locais__progresso">
        <p class="locais__contador serif"><span class="locais__atual">${dois(indice + 1)}</span><span class="locais__total"> / ${dois(lista.length)}</span></p>
        <div class="locais__barra">${lista.map(() => '<i></i>').join('')}</div>
        <p class="legenda locais__dica">${html(t('locais.dica'))}</p>
      </div>
      <button class="seta-redonda" data-dir="1" aria-label="próximo">${SETA}</button>
    </footer>`;

  els = {
    carrossel: tela.querySelector('.carrossel'),
    trilho: tela.querySelector('.carrossel__trilho'),
    cards: [...tela.querySelectorAll('.card-local')],
    atual: tela.querySelector('.locais__atual'),
    barras: [...tela.querySelectorAll('.locais__barra i')],
  };
  ligarArraste();
  tela.querySelectorAll('.seta-redonda').forEach((b) => b.addEventListener('click', () => irPara(indice + Number(b.dataset.dir))));
  posicionar(false);
}

// --- Geometria do carrossel ---------------------------------------------------
function medidas() {
  const card = els.cards[0];
  const w = card.offsetWidth;
  const gap = parseFloat(getComputedStyle(els.trilho).columnGap) || 0;
  return { passo: w + gap, w, centro: els.carrossel.offsetWidth / 2 };
}

function xParaIndice(i) {
  const { passo, w, centro } = medidas();
  return centro - (i * passo + w / 2);
}

/** Aplica escala/parallax em cada card conforme a distância do centro */
function atualizarCards() {
  const { passo } = medidas();
  const base = xParaIndice(0);
  els.cards.forEach((card, i) => {
    const d = (trilhoX - base) / passo + i; // 0 = no centro
    const ad = Math.min(Math.abs(d), 1.6);
    card.style.setProperty('--d', d.toFixed(3));
    card.style.transform = `scale(${1 - ad * 0.09})`;
    card.querySelector('img').style.transform = `translate3d(${(-d * 10).toFixed(2)}%,0,0) scale(1.22)`;
    card.querySelector('.card-local__texto').style.opacity = String(Math.max(0, 1 - ad * 1.6));
    card.classList.toggle('atual', Math.round(-d) === 0 && Math.abs(d) < 0.5);
  });
  els.trilho.style.transform = `translate3d(${trilhoX}px,0,0)`;
}

function marcarIndice() {
  els.atual.textContent = dois(indice + 1);
  els.barras.forEach((b, i) => b.classList.toggle('ativa', i === indice));
}

function posicionar(animar = true) {
  if (!els.cards?.length) return;
  const alvo = xParaIndice(indice);
  marcarIndice();
  gsap.killTweensOf(estadoTrilho);
  if (!animar) {
    trilhoX = alvo;
    atualizarCards();
    return;
  }
  estadoTrilho.x = trilhoX;
  gsap.to(estadoTrilho, {
    x: alvo,
    duration: 0.9,
    ease: 'expo.out',
    onUpdate: () => {
      trilhoX = estadoTrilho.x;
      atualizarCards();
    },
  });
}
const estadoTrilho = { x: 0 };

function irPara(i) {
  indice = Math.max(0, Math.min(els.cards.length - 1, i));
  posicionar(true);
}

// --- Arraste com o dedo -------------------------------------------------------
function ligarArraste() {
  let inicioX = 0;
  let inicioTrilho = 0;
  let ultimoX = 0;
  let ultimoT = 0;
  let vel = 0;
  let movido = 0;
  let ativo = false;

  els.carrossel.addEventListener('pointerdown', (e) => {
    ativo = true;
    movido = 0;
    inicioX = ultimoX = e.clientX;
    ultimoT = performance.now();
    inicioTrilho = trilhoX;
    vel = 0;
    gsap.killTweensOf(estadoTrilho);
    els.carrossel.setPointerCapture(e.pointerId);
  });

  els.carrossel.addEventListener('pointermove', (e) => {
    if (!ativo) return;
    const dx = e.clientX - inicioX;
    movido = Math.max(movido, Math.abs(dx));
    const agora = performance.now();
    vel = (e.clientX - ultimoX) / Math.max(1, agora - ultimoT);
    ultimoX = e.clientX;
    ultimoT = agora;
    // Resistência nas pontas
    const min = xParaIndice(els.cards.length - 1);
    const max = xParaIndice(0);
    let x = inicioTrilho + dx;
    if (x > max) x = max + (x - max) * 0.35;
    if (x < min) x = min + (x - min) * 0.35;
    trilhoX = x;
    atualizarCards();
  });

  const soltar = (e) => {
    if (!ativo) return;
    ativo = false;
    if (movido < 12) {
      // Foi um toque, não um arraste
      const card = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.classList?.contains('card-local'));
      if (!card) return posicionar(true);
      const i = Number(card.dataset.i);
      if (i === indice) aoAbrir(card.dataset.id, card.querySelector('.card-local__foto'));
      else irPara(i);
      return;
    }
    const { passo } = medidas();
    const projetado = trilhoX + vel * 220;
    irPara(Math.round((xParaIndice(0) - projetado) / passo));
  };
  els.carrossel.addEventListener('pointerup', soltar);
  els.carrossel.addEventListener('pointercancel', soltar);
}

// --- Entrada / saída ----------------------------------------------------------
export function entrarLocais({ chegada = false } = {}) {
  posicionar(false);
  if (chegada) return entrarDaTransicao();

  estado.tela = 'locais';
  preCarregar(locaisAtivos().map((l) => l.fotos.capa));
  gsap.set(tela, { autoAlpha: 1 });

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo(tela.querySelector('.locais__sobretitulo'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0)
    .fromTo(tela.querySelector('.locais__titulo .linha > span'), { yPercent: 110 }, { yPercent: 0, duration: 1.4 }, 0.05)
    // Os cards têm transform próprio (escala do carrossel): a entrada usa máscara + deslocamento do contêiner
    .fromTo(els.carrossel, { x: () => innerWidth * 0.18 }, { x: 0, duration: 1.6 }, 0.1)
    .fromTo(els.cards, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, stagger: 0.09, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.05)
    .fromTo(tela.querySelector('.locais__rodape'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.4);
  return tl;
}

/**
 * Parte final da transição do planeta: o fundo bege já está na tela e os cards
 * entram um depois do outro, a partir do card em destaque. Com menos movimento, só fade.
 */
function entrarDaTransicao() {
  const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sobe = (px) => (calmo ? 0 : px);
  gsap.set(tela, { autoAlpha: 0 });
  const tl = gsap.timeline({ defaults: { ease: 'power2.out', duration: 0.7 } });
  if (calmo) tl.to(tela, { autoAlpha: 1, duration: 0.5 }, 0);
  else tl.set(tela, { autoAlpha: 1 }, 0);
  return tl
    .fromTo(tela.querySelector('.locais__sobretitulo'), { autoAlpha: 0, y: sobe(16) }, { autoAlpha: 1, y: 0 }, 0)
    .fromTo(tela.querySelector('.locais__titulo .linha > span'), { yPercent: 110 }, { yPercent: 0 }, 0.05)
    .fromTo(
      els.cards,
      { opacity: 0, translate: `0px ${sobe(36)}px` },
      { opacity: 1, translate: '0px 0px', duration: 0.6, stagger: { amount: 0.25, from: indice } },
      0
    )
    .fromTo(tela.querySelector('.locais__rodape'), { autoAlpha: 0, y: sobe(20) }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.3);
}

/**
 * Mostra a tela e o mascote por um instante, quase invisíveis, para o navegador deixar as fotos
 * prontas para desenhar e não engasgar quando elas aparecerem de verdade.
 */
export async function aquecerCards() {
  await fotosDosCards();
  if (estado.tela !== 'inicio') return;
  gsap.set([tela, '.mascote'], { autoAlpha: QUASE_INVISIVEL });
  gsap.delayedCall(0.3, () => estado.tela === 'inicio' && gsap.set([tela, '.mascote'], { autoAlpha: 0 }));
}

/** Espera as fotos dos cards decodificadas: a tela nunca aparece com um card vazio */
export function fotosDosCards() {
  return Promise.all(els.cards.map((c) => c.querySelector('img').decode().catch(() => {})));
}

export function sairLocais() {
  return gsap.to(tela, { autoAlpha: 0, duration: 0.5, ease: 'power2.out' });
}

export function definirIndice(id) {
  const i = locaisAtivos().findIndex((l) => l.id === id);
  if (i >= 0) indice = i;
}
