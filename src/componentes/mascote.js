// Guia do totem: guarda-parque ilustrado em SVG inline (funciona sem internet).
// As animações do personagem ficam em CSS (componentes.css), ligadas por classes:
// "acenando", "pulando" e "falando". O balão "digita" o texto letra por letra.
// Tocar nele mostra a próxima curiosidade.
import gsap from 'gsap';
import { estado, em } from '../core/estado.js';
import { t, tr, limpo, temConfirmar } from '../core/i18n.js';

const raiz = document.querySelector('.mascote');
const el = (s) => raiz.querySelector(s);

// Classes que saem sozinhas quando a animação CSS termina
const CLASSE_DA_ANIMACAO = { 'm-acenar': 'acenando', 'm-pular': 'pulando' };

/** Estrela de 5 pontas centrada em (cx, cy) */
function estrela(cx, cy, r) {
  const pontos = Array.from({ length: 10 }, (_, i) => {
    const raio = i % 2 ? r * 0.42 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + Math.cos(a) * raio).toFixed(2)},${(cy + Math.sin(a) * raio).toFixed(2)}`;
  });
  return pontos.join(' ');
}

const SVG = `
<svg class="mascote__svg" viewBox="0 0 240 300" aria-hidden="true">
  <defs>
    <radialGradient id="m-g-halo"><stop offset="0" stop-color="#e4c77e" stop-opacity="0.2"/><stop offset="1" stop-color="#e4c77e" stop-opacity="0"/></radialGradient>
    <radialGradient id="m-g-sombra"><stop offset="0" stop-color="#120d09" stop-opacity="0.42"/><stop offset="1" stop-color="#120d09" stop-opacity="0"/></radialGradient>
    <radialGradient id="m-g-pele" cx="0.4" cy="0.34" r="0.78"><stop offset="0" stop-color="#e8bb8d"/><stop offset="1" stop-color="#c58f61"/></radialGradient>
    <linearGradient id="m-g-camisa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f7d5b"/><stop offset="1" stop-color="#2c4f39"/></linearGradient>
    <linearGradient id="m-g-manga" gradientUnits="userSpaceOnUse" x1="60" y1="150" x2="180" y2="225"><stop offset="0" stop-color="#46735a"/><stop offset="1" stop-color="#335b43"/></linearGradient>
    <linearGradient id="m-g-chapeu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ead7a4"/><stop offset="1" stop-color="#c9a24a"/></linearGradient>
    <linearGradient id="m-g-calca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4a33"/><stop offset="1" stop-color="#4a3323"/></linearGradient>
    <linearGradient id="m-g-ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0dca6"/><stop offset="1" stop-color="#c9a24a"/></linearGradient>
    <clipPath id="m-clip-tronco"><path d="M84 168C84 150 100 142 120 142S156 150 156 168L164 226C165 238 156 244 146 244H94C84 244 75 238 76 226Z"/></clipPath>
  </defs>

  <!-- brilho claro atrás do corpo: separa o personagem de fotos escuras -->
  <ellipse cx="120" cy="158" rx="116" ry="140" fill="url(#m-g-halo)"/>
  <ellipse class="m-sombra" cx="120" cy="286" rx="74" ry="10" fill="url(#m-g-sombra)"/>

  <g class="m-tudo">
    <!-- pernas e botas -->
    <path class="m-c" d="M92 232H114V268H92Z" fill="url(#m-g-calca)"/>
    <path class="m-c" d="M126 232H148V268H126Z" fill="url(#m-g-calca)"/>
    <path class="m-bota" d="M90 260H116V278A6 6 0 0 1 110 284H82A8 8 0 0 1 74 276C74 268 82 266 90 260Z" fill="#3a2a1e"/>
    <path class="m-bota" d="M150 260H124V278A6 6 0 0 0 130 284H158A8 8 0 0 0 166 276C166 268 158 266 150 260Z" fill="#3a2a1e"/>
    <path d="M92 266H114M126 266H148" stroke="#c9a24a" stroke-width="2" stroke-linecap="round"/>

    <g class="m-superior">
      <!-- pescoço e tronco -->
      <path d="M106 130H134V152H106Z" fill="#b98255"/>
      <path class="m-c" d="M84 168C84 150 100 142 120 142S156 150 156 168L164 226C165 238 156 244 146 244H94C84 244 75 238 76 226Z" fill="url(#m-g-camisa)"/>
      <g clip-path="url(#m-clip-tronco)">
        <path d="M120 170V226" stroke="#1f3b2c" stroke-width="2"/>
        <circle cx="120" cy="186" r="2.4" fill="#e4c77e"/>
        <circle cx="120" cy="204" r="2.4" fill="#e4c77e"/>
        <!-- bolso -->
        <path d="M86 182H108V202Q97 208 86 202Z" fill="#335b43"/>
        <path d="M84 180H110L109 188Q97 193 85 188Z" fill="#3f6b4e"/>
        <!-- cinto -->
        <rect x="70" y="224" width="100" height="10" fill="#2a1d14"/>
        <rect x="111" y="222" width="18" height="14" rx="3" fill="url(#m-g-ouro)"/>
        <rect x="116" y="226" width="8" height="6" rx="1.5" fill="#2a1d14"/>
      </g>

      <!-- lenço amarelo -->
      <path class="m-c" d="M96 146Q120 160 144 146L147 154L120 182L93 154Z" fill="#e4c77e"/>
      <path d="M99 150Q120 162 141 150L120 174Z" fill="#f0dca6" opacity="0.6"/>

      <!-- brasão da prefeitura no peito -->
      <g transform="translate(142 196) scale(0.24) translate(-100 -100)">
        <path d="M100 56L136 70V106C136 128 120 140 100 148C80 140 64 128 64 106V70Z" fill="url(#m-g-ouro)" stroke="#7a5a17" stroke-width="4"/>
        <path d="M64 108C78 98 88 104 100 94C112 104 122 98 136 108C135 128 120 140 100 148C80 140 65 128 64 108Z" fill="#3f6b4e"/>
        <polygon points="${estrela(100, 82, 18)}" fill="#2a1d14"/>
      </g>

      <!-- braço esquerdo -->
      <g class="m-braco-esq">
        <path class="m-braco m-braco--borda" d="M90 162Q68 186 72 212"/>
        <path class="m-braco" d="M90 162Q68 186 72 212"/>
        <circle class="m-c" cx="72" cy="218" r="11.5" fill="url(#m-g-pele)"/>
      </g>
      <!-- braço direito (acena) -->
      <g class="m-braco-dir">
        <path class="m-braco m-braco--borda" d="M150 162Q172 186 168 212"/>
        <path class="m-braco" d="M150 162Q172 186 168 212"/>
        <circle class="m-c" cx="168" cy="218" r="11.5" fill="url(#m-g-pele)"/>
      </g>

      <!-- cabeça -->
      <g class="m-cabeca">
        <circle class="m-c" cx="64" cy="98" r="9.5" fill="#d9a877"/>
        <circle class="m-c" cx="176" cy="98" r="9.5" fill="#d9a877"/>
        <ellipse class="m-c" cx="120" cy="92" rx="56" ry="53" fill="url(#m-g-pele)"/>
        <path d="M65 84C66 68 74 60 84 58L80 80Q72 80 69 96ZM175 84C174 68 166 60 156 58L160 80Q168 80 171 96Z" fill="#3a2a1e"/>

        <path d="M87 83Q97 76 108 82M132 82Q143 76 153 83" fill="none" stroke="#3a2a1e" stroke-width="4" stroke-linecap="round"/>
        <g class="m-olho">
          <ellipse cx="98" cy="101" rx="9.5" ry="12" fill="#2a1d14"/>
          <circle cx="101.5" cy="96" r="3.6" fill="#f6f1e7"/>
          <circle cx="95" cy="106" r="1.7" fill="#f6f1e7"/>
        </g>
        <g class="m-olho">
          <ellipse cx="142" cy="101" rx="9.5" ry="12" fill="#2a1d14"/>
          <circle cx="145.5" cy="96" r="3.6" fill="#f6f1e7"/>
          <circle cx="139" cy="106" r="1.7" fill="#f6f1e7"/>
        </g>
        <ellipse cx="82" cy="118" rx="10.5" ry="6.5" fill="#c9694a" opacity="0.32"/>
        <ellipse cx="158" cy="118" rx="10.5" ry="6.5" fill="#c9694a" opacity="0.32"/>
        <ellipse cx="120" cy="112" rx="4" ry="2.8" fill="#a8734a"/>
        <path class="m-sorriso" d="M104 122Q120 138 136 122" fill="none" stroke="#2a1d14" stroke-width="4.4" stroke-linecap="round"/>
        <path class="m-boca" d="M105 121H135Q134 141 120 141T105 121Z" fill="#4a2318"/>

        <!-- chapéu de guarda-parque -->
        <path class="m-c" d="M82 62C84 42 98 16 112 18C116 24 124 24 128 18C142 16 156 42 158 62Z" fill="url(#m-g-chapeu)"/>
        <path d="M112 18C116 24 124 24 128 18C128 30 124 40 120 44C116 40 112 30 112 18Z" fill="#c9a24a" opacity="0.55"/>
        <path d="M83 50Q120 58 157 50L158 62Q120 70 82 62Z" fill="#3f6b4e"/>
        <polygon points="${estrela(120, 59, 6.4)}" fill="#e4c77e"/>
        <path class="m-c" d="M46 62C60 54 88 60 120 62S180 54 194 62C198 70 176 78 120 78S42 70 46 62Z" fill="url(#m-g-chapeu)"/>
        <path d="M60 70Q120 82 180 70Q150 79 120 79T60 70Z" fill="#7a5a17" opacity="0.32"/>
      </g>
    </g>
  </g>
</svg>`;

const TEMPO_CONVITE = 6000; // ms

let falas = [];
let indiceFala = 0;
let indiceCidade = 0;
let timerDigitar = null;
let timerOcultar = null;
let visivel = false;

const semMovimento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function montarMascote() {
  raiz.innerHTML = `
    <div class="mascote__balao" role="status">
      <p class="legenda mascote__rotulo"></p>
      <p class="mascote__texto"></p>
      <p class="legenda mascote__dica"></p>
    </div>
    <button class="mascote__corpo" aria-label="${t('mascote.dica')}">${SVG}</button>`;

  gsap.set(raiz, { autoAlpha: 0 });
  gsap.set(el('.mascote__balao'), { autoAlpha: 0 });

  el('.mascote__svg').addEventListener('animationend', (e) => {
    const classe = CLASSE_DA_ANIMACAO[e.animationName];
    if (classe) e.currentTarget.classList.remove(classe);
  });

  // Toque fora do mascote (ou rolagem com mouse) esconde o balão
  window.addEventListener('pointerdown', (e) => !raiz.contains(e.target) && esconderBalao(), true);
  window.addEventListener('wheel', esconderBalao, { passive: true });

  el('.mascote__corpo').addEventListener('click', () => {
    animar('pulando');
    proximaFala();
  });

  em('tela', atualizarPorTela);
  em('local', (l) => {
    falas = [...(l.falas || []), ...(l.curiosidades || []).map((c) => c.texto)];
    indiceFala = 0;
    gsap.delayedCall(1.6, () => estado.localId === l.id && falar(falas[0]));
  });
  em('idioma', () => {
    el('.mascote__corpo').setAttribute('aria-label', t('mascote.dica'));
    if (!visivel) return;
    if (estado.tela === 'locais') convidar();
    else if (falas.length) falar(falas[indiceFala]);
  });
}

/** Reinicia uma animação CSS do personagem, mesmo se ela ainda estiver rodando */
function animar(classe) {
  const svg = el('.mascote__svg');
  svg.classList.remove(classe);
  svg.getBoundingClientRect();
  svg.classList.add(classe);
}

function atualizarPorTela(tela) {
  const mostrar = tela === 'locais' || tela === 'local';
  if (mostrar && !visivel) {
    visivel = true;
    gsap.fromTo(raiz, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, delay: 0.8, ease: 'expo.out' });
  } else if (!mostrar && visivel) {
    visivel = false;
    esconderBalao();
    gsap.to(raiz, { autoAlpha: 0, y: 24, duration: 0.5, ease: 'power2.in' });
  }
  if (tela === 'locais') {
    // Na lista de locais ele acena e convida; o balão some sozinho para não cobrir os cards
    gsap.delayedCall(1.8, () => estado.tela === 'locais' && convidar());
  }
}

/** Convite curto da lista de locais, sem o título "Você sabia?" */
function convidar() {
  falar(t('mascote.convite'), TEMPO_CONVITE, { simples: true });
}

function proximaFala() {
  if (estado.tela === 'local' && falas.length) {
    indiceFala = (indiceFala + 1) % falas.length;
    return falar(falas[indiceFala]);
  }
  // Fora dos locais: saudação e, a cada toque, uma curiosidade da cidade
  const lista = [t('mascote.saudacao'), ...(estado.dados.curiosidadesCidade || [])];
  falar(lista[indiceCidade++ % lista.length]);
}

/** Mostra o balão e "digita" o texto letra por letra, com boca e braço animados */
export function falar(conteudo, duracao = 12000, { simples = false } = {}) {
  const texto = tr(conteudo);
  const balao = el('.mascote__balao');
  const alvo = el('.mascote__texto');
  const calmo = semMovimento();
  balao.classList.toggle('mascote__balao--simples', simples);
  el('.mascote__rotulo').textContent = t('mascote.rotulo');
  el('.mascote__dica').textContent = t('mascote.dica');

  clearInterval(timerDigitar);
  clearTimeout(timerOcultar);
  timerOcultar = setTimeout(esconderBalao, duracao);
  gsap.fromTo(balao, { autoAlpha: 0, y: calmo ? 0 : 18 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out', overwrite: true });
  animar('acenando');

  const puro = limpo(texto);
  const sufixo = temConfirmar(texto) ? ' <span class="confirmar">CONFIRMAR</span>' : '';
  const concluir = () => {
    alvo.textContent = puro;
    alvo.insertAdjacentHTML('beforeend', sufixo);
    definirFala(false);
  };
  if (calmo) return concluir();

  // O texto inteiro já ocupa seu espaço (invisível) — o balão não "cresce" enquanto digita
  definirFala(true);
  alvo.innerHTML = '<span></span><span class="mascote__resto"></span>';
  const [visivelEl, restoEl] = alvo.children;
  restoEl.textContent = puro;
  let i = 0;
  timerDigitar = setInterval(() => {
    i += 1;
    visivelEl.textContent = puro.slice(0, i);
    restoEl.textContent = puro.slice(i);
    if (i >= puro.length) {
      clearInterval(timerDigitar);
      concluir();
    }
  }, 32);
}

function definirFala(ligar) {
  el('.mascote__svg').classList.toggle('falando', ligar);
}

function esconderBalao() {
  const balao = el('.mascote__balao');
  if (!balao || gsap.getProperty(balao, 'autoAlpha') === 0) return;
  clearInterval(timerDigitar);
  clearTimeout(timerOcultar);
  definirFala(false);
  gsap.to(balao, { autoAlpha: 0, y: 10, duration: 0.5, ease: 'power2.in', overwrite: true });
}
