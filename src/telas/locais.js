// Tela de locais: carrossel arrastável com foto grande, nome e frase.
// Toque no card ativo abre o local; toque num card lateral traz ele para a frente.
// O carrossel é infinito: do último card volta ao primeiro, sem pulo.
import gsap from 'gsap';
import { estado, emitir, locaisAtivos, transicaoCurta } from '../core/estado.js';
import { t, tr, html } from '../core/i18n.js';
import { preCarregar } from '../util/preload.js';

const tela = document.querySelector('[data-tela="locais"]');
const SETA = '<svg class="seta" viewBox="0 0 28 16" aria-hidden="true"><path d="M0 8h26M19 1l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

const ESCALA_LADO = 0.85;    // tamanho dos cards vizinhos em relação ao ativo
const APAGADO_LADO = 0.4;    // véu creme sobre os vizinhos: equivale a opacidade 0.6
const ESPIADA = 0.11;        // fração da tela em que o card anterior aparece à esquerda
const MOLA_FORCA = 70;
const MOLA_ATRITO = 12.5;    // abaixo do amortecimento crítico: passa um pouco e volta
const TOQUE_MAXIMO = 12;     // px: mais do que isso é arraste, não toque
const QUASE_INVISIVEL = 0.001;

let indice = 0;
let pos = 0;
let alvo = 0;
let vel = 0;
let molaLigada = false;
let geo = {};
const ancora = { folga: 0 }; // 0 = card ativo alinhado com o título; 1 = anterior espiando
let aoAbrir = () => {};
let els = {};

const dois = (n) => String(n).padStart(2, '0');

export function montarLocais({ aoAbrirLocal }) {
  aoAbrir = aoAbrirLocal;
  renderizar();
  window.addEventListener('resize', () => estado.tela === 'locais' && posicionar());
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
            <div class="card-local__apagado"></div>
            <p class="card-local__lado serif">${html(tr(l.nome))}</p>
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
  tela.querySelectorAll('.seta-redonda').forEach((b) => b.addEventListener('click', () => andar(Number(b.dataset.dir))));
  posicionar();
}

// --- Geometria do carrossel ---------------------------------------------------
// "pos" é a posição contínua em cards (2.4 = entre o 3º e o 4º) e cresce sem limite:
// cada card se coloca pela menor distância até ela, por isso o último emenda no primeiro.
function medir() {
  const larguraTela = els.carrossel.offsetWidth;
  const W = els.cards[0].offsetWidth;
  const w = W * ESCALA_LADO;
  const gap = parseFloat(getComputedStyle(els.trilho).columnGap) || 0;
  const margem = parseFloat(getComputedStyle(tela.querySelector('.locais__cabecalho')).paddingLeft) || 0;
  const espiada = larguraTela * ESPIADA;
  geo = { W, w, gap, margem, esquerda: espiada + gap, passo: W / 2 + gap + w / 2 };
}

/** Distância do card i até a posição atual, pelo caminho mais curto do círculo */
function distancia(i) {
  const n = els.cards.length;
  return ((((i - pos + n / 2) % n) + n) % n) - n / 2;
}

/** Aplica posição, escala e parallax em cada card conforme a distância do card ativo */
function atualizarCards() {
  const { W, w, gap, margem, esquerda, passo } = geo;
  const f = ancora.folga;
  const inicio = margem + f * (esquerda - margem); // sem folga, o card ativo alinha com o título
  els.cards.forEach((card, i) => {
    const d = distancia(i);
    const a = Math.abs(d);
    const ad = Math.min(a, 1);
    const desvio = a <= 1 ? a * passo : passo + (a - 1) * (w + gap);
    // Enquanto alinhado com o título, o vizinho da esquerda espera fora da tela
    const x = inicio + Math.sign(d) * desvio - (d < 0 ? (1 - f) * Math.min(-d, 1) * inicio : 0);
    card.style.transform = `translate3d(${x.toFixed(2)}px,0,0) scale(${(1 - ad * (1 - ESCALA_LADO)).toFixed(4)})`;
    card.querySelector('img').style.transform = `translate3d(${(-Math.max(-1.6, Math.min(1.6, d)) * 10).toFixed(2)}%,0,0) scale(1.22)`;
    card.querySelector('.card-local__apagado').style.opacity = (ad * APAGADO_LADO).toFixed(3);
    card.querySelector('.card-local__texto').style.opacity = String(Math.max(0, 1 - a * 1.6));
    card.querySelector('.card-local__lado').style.opacity = String(Math.max(0, Math.min(1, (a - 0.45) * 2)));
    card.classList.toggle('atual', a < 0.5);
    card.classList.toggle('a-esquerda', d < 0);
  });
}

function marcarIndice(i = indice) {
  els.atual.textContent = dois(i + 1);
  els.barras.forEach((b, k) => b.classList.toggle('ativa', k === i));
}

const noCirculo = (v) => ((v % els.cards.length) + els.cards.length) % els.cards.length;

function posicionar() {
  if (!els.cards?.length) return;
  pararMola();
  medir();
  pos = alvo;
  indice = noCirculo(alvo);
  marcarIndice();
  atualizarCards();
}

// --- Mola: o carrossel sai com a velocidade do dedo e assenta no card -------------
function passoDaMola(_tempo, deltaMs) {
  const dt = Math.min(deltaMs, 34) / 1000;
  vel += (-MOLA_FORCA * (pos - alvo) - MOLA_ATRITO * vel) * dt;
  pos += vel * dt;
  if (Math.abs(vel) < 0.02 && Math.abs(pos - alvo) < 0.002) {
    pos = alvo;
    pararMola();
  }
  atualizarCards();
}

function soltarMola() {
  const anterior = indice;
  indice = noCirculo(alvo);
  marcarIndice();
  // O mascote reage à troca de card (setas ou arraste)
  if (indice !== anterior) emitir('card', locaisAtivos()[indice]);
  if (molaLigada) return;
  molaLigada = true;
  gsap.ticker.add(passoDaMola);
}

function pararMola() {
  molaLigada = false;
  vel = 0;
  gsap.ticker.remove(passoDaMola);
}

/** Na primeira passada, o carrossel abre espaço para o card anterior espiar à esquerda */
function liberarEspiada() {
  if (ancora.folga === 1 || gsap.isTweening(ancora)) return;
  gsap.to(ancora, { folga: 1, duration: 0.7, ease: 'power2.out', onUpdate: atualizarCards });
}

function andar(cards) {
  alvo += cards;
  liberarEspiada();
  soltarMola();
}

// --- Arraste com o dedo -------------------------------------------------------
function ligarArraste() {
  let inicioX = 0;
  let inicioPos = 0;
  let ultimoX = 0;
  let ultimoT = 0;
  let movido = 0;
  let ativo = false;

  els.carrossel.addEventListener('pointerdown', (e) => {
    ativo = true;
    movido = 0;
    inicioX = ultimoX = e.clientX;
    ultimoT = performance.now();
    inicioPos = pos;
    pararMola();
    els.carrossel.setPointerCapture(e.pointerId);
  });

  els.carrossel.addEventListener('pointermove', (e) => {
    if (!ativo) return;
    const dx = e.clientX - inicioX;
    movido = Math.max(movido, Math.abs(dx));
    if (movido >= TOQUE_MAXIMO) liberarEspiada();
    const agora = performance.now();
    const instante = (-(e.clientX - ultimoX) / geo.passo / Math.max(1, agora - ultimoT)) * 1000;
    vel = vel * 0.6 + instante * 0.4; // suaviza a leitura do dedo (cards por segundo)
    ultimoX = e.clientX;
    ultimoT = agora;
    pos = inicioPos - dx / geo.passo; // o card acompanha o dedo, sem atraso
    marcarIndice(noCirculo(Math.round(pos)));
    atualizarCards();
  });

  const soltar = (e) => {
    if (!ativo) return;
    ativo = false;
    if (movido < TOQUE_MAXIMO) {
      // Foi um toque, não um arraste
      const card = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.classList?.contains('card-local'));
      if (!card) return soltarMola();
      const d = Math.round(distancia(Number(card.dataset.i)));
      if (d === 0) aoAbrir(card.dataset.id, card.querySelector('.card-local__foto'));
      else andar(d);
      return;
    }
    // Um arraste curto volta ou passa um card; um empurrão forte pode passar mais
    if (performance.now() - ultimoT > 120) vel = 0; // o dedo parou antes de soltar
    const projetado = Math.round(pos + vel * 0.18);
    alvo = Math.max(Math.round(inicioPos) - 3, Math.min(Math.round(inicioPos) + 3, projetado));
    soltarMola();
  };
  els.carrossel.addEventListener('pointerup', soltar);
  els.carrossel.addEventListener('pointercancel', soltar);
}

// --- Entrada / saída ----------------------------------------------------------
export function entrarLocais({ chegada = false } = {}) {
  if (chegada) {
    // Quem chega pelo planeta sempre começa no primeiro card, alinhado com o título
    alvo = 0;
    ancora.folga = 0;
  }
  posicionar();
  if (chegada) return entrarDaTransicao();

  estado.tela = 'locais';
  preCarregar(locaisAtivos().map((l) => l.fotos.capa));
  gsap.set(tela, { autoAlpha: 1 });

  // A máscara de entrada mantém os cantos arredondados (o GSAP precisa do valor em px)
  const RAIO = getComputedStyle(els.cards[0]).borderTopLeftRadius;
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo(tela.querySelector('.locais__sobretitulo'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0)
    .fromTo(tela.querySelector('.locais__titulo .linha > span'), { yPercent: 110 }, { yPercent: 0, duration: 1.4 }, 0.05)
    // Os cards têm transform próprio (escala do carrossel): a entrada usa máscara + deslocamento do contêiner
    .fromTo(els.carrossel, { x: () => innerWidth * 0.18 }, { x: 0, duration: 1.6 }, 0.1)
    .fromTo(els.cards, { clipPath: `inset(100% 0% 0% 0% round ${RAIO})` }, { clipPath: `inset(0% 0% 0% 0% round ${RAIO})`, duration: 1.3, stagger: 0.09, ease: 'expo.inOut', clearProps: 'clipPath' }, 0.05)
    .fromTo(tela.querySelector('.locais__rodape'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.4);
  return tl;
}

/**
 * Parte final da transição do planeta: o fundo bege já está na tela e os cards
 * entram um depois do outro, a partir do card em destaque. Na versão curta, só fade.
 */
function entrarDaTransicao() {
  const calmo = transicaoCurta();
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
  if (i >= 0) alvo = i;
}
