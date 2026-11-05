// Transição cinematográfica, em um movimento de câmera contínuo:
// 1) Mundo: o planeta (Three.js) vai para o centro e gira até o Brasil. No caminho, ele se
//    funde com o globo de satélite do MapLibre, que tem o mesmo tamanho e a mesma posição
// 2) Pará: a câmera desce e enquadra o estado
// 3) Canaã dos Carajás: desce até a cidade, inclina em 3D e para no Parque do Mirante
// Quando a cidade já aparece, entra o título "Canaã dos Carajás". A câmera para, o título sai
// e os pins aparecem, um por um, com o mapa parado. Uma timeline só (GSAP) move as duas câmeras.
import gsap from 'gsap';
import { estado, transicaoCurta } from '../core/estado.js';
import { sairInicio } from './inicio.js';
import * as M from './mapa.js';

const DEG = Math.PI / 180;
const tela = document.querySelector('[data-tela="transicao"]');
const rotulos = tela.querySelector('.mapa__rotulos');
const rotulo = (n) => tela.querySelector(`[data-rotulo="${n}"]`);

// Linha do tempo (segundos): [início, duração]. As etapas se sobrepõem um pouco: a câmera nunca para
const T = {
  centro: [0, 1.5], // planeta sai do canto e vai para o centro da tela
  mundo: [0.15, 2.75],
  fusao: [1.5, 1], // o globo do MapLibre aparece por cima do planeta
  para: [2.6, 2.8],
  canaa: [5.15, 4.3], // a câmera para em 9,45 s
  cidade: [8.9, 1.3], // título: entra com a cidade já nítida na tela, fica 1,3 s e sai até 11,4 s
  pins: 11.4, // o mapa já está parado e o título já saiu: um de cada vez
};
const FADE_TITULO = 0.6;
const EASE = 'power2.inOut';
const TOQUE_MINIMO = 350; // ms: um toque duplo no botão não conta como "pular"
let atual = null;
let pararAtual = null;

function coordenadas() {
  const { lat, lng } = M.VISTA;
  const fmt = (v) => {
    const a = Math.abs(v);
    return `${Math.floor(a)}°${String(Math.round((a % 1) * 60)).padStart(2, '0')}′`;
  };
  const oeste = estado.idioma === 'en' ? 'W' : 'O';
  return `${fmt(lat)} S · ${fmt(lng)} ${oeste}`;
}

/** Longitude no centro do planeta Three.js (inverso de globo.rotacaoPara) */
const lngDoGiro = (rotY) => {
  const lng = (Math.PI / 2 - rotY) / DEG - 180;
  return ((((lng + 180) % 360) + 360) % 360) - 180;
};
const giroDaLng = (lng) => Math.PI / 2 - (lng + 180) * DEG;

/** Progresso do deslocamento numa descida de "salto" níveis de zoom: o alvo vem para o centro
 *  na mesma proporção em que a tela se aproxima, e nunca escapa pela borda */
const panDaDescida = (p, salto) => (1 - 2 ** (-p * salto)) / (1 - 2 ** -salto);
const suave = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/**
 * Executa a transição.
 * - aoRevelar: o mapa já cobre a tela; aoAssentar: pins na tela; aoTerminar: fim de tudo
 */
export function executarTransicao({ globo, aoRevelar, aoAssentar, aoTerminar }) {
  const { pose } = globo;

  tela.querySelector('.mapa__coord').textContent = coordenadas();
  gsap.set(tela.querySelectorAll('.mapa__rotulo'), { autoAlpha: 0 });
  gsap.set(rotulos, { opacity: 1 });
  gsap.set(tela, { autoAlpha: 1 });

  // Se tocarem durante a aproximação inicial, a transição assume a câmera sem disputa
  gsap.killTweensOf(pose);
  globo.emTransicao = true;
  globo.girando = false;
  M.prepararTransicao();

  const inicio = performance.now();
  const aoTocar = (e) => {
    e.stopPropagation();
    if (performance.now() - inicio > TOQUE_MINIMO) pular();
  };
  const bloquearClique = (e) => e.stopPropagation();
  const soltarToques = () => {
    window.removeEventListener('pointerdown', aoTocar, true);
    window.removeEventListener('click', bloquearClique, true);
  };
  window.addEventListener('pointerdown', aoTocar, true);
  window.addEventListener('click', bloquearClique, true);

  const tl = gsap.timeline({
    onComplete: () => {
      soltarToques();
      globo.emTransicao = false;
      M.liberarMapa();
      aoTerminar();
    },
  });
  atual = tl;
  pararAtual = () => {
    soltarToques();
    globo.emTransicao = false;
  };

  if (transicaoCurta()) {
    // Fade simples: o mapa já aparece na vista final
    M.camera({ ...M.vista(), recuo: 1 });
    M.brilho(M.BRILHO.fim);
    tl.add(sairInicio(), 0)
      .add(() => esperarImagens(tl), 0.35)
      .fromTo('.mapa-cidade', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.4)
      .to('#globo', { opacity: 0, duration: 0.6 }, 0.4)
      .add(() => globo.pausar(), 1)
      .add(aoRevelar, 0.6)
      .add(M.entrarMapa(), 1)
      .add(aoAssentar, 1.2);
    return tl;
  }

  // --- Câmera única: as etapas somam suas partes, e as duas câmeras seguem o mesmo valor ---
  const lat0 = pose.rotX / DEG;
  const lng0 = lngDoGiro(pose.rotY);
  const voltas = Math.round((pose.rotY - giroDaLng(lng0)) / (Math.PI * 2)); // mantém o giro contínuo
  const Q = [
    { lng: lng0, lat: lat0, zoom: M.zoomDaDistancia(pose.dist, lat0) },
    { lng: M.PARA.lng, lat: M.PARA.lat - 4, zoom: M.zoomDoPlaneta(M.PARA.lat) },
    { lng: M.PARA.lng, lat: M.PARA.lat, zoom: M.PARA.zoom },
    { lng: M.VISTA.lng, lat: M.VISTA.lat, zoom: M.vista().zoom },
  ];
  // Pelo caminho mais curto até o Brasil (no começo, o planeta já gira nesse sentido)
  Q[0].lng = Q[1].lng + (((((lng0 - Q[1].lng) % 360) + 540) % 360) - 180);

  const ini = { x: pose.x, y: pose.y, rotZ: pose.rotZ };
  const e = { centro: 0, a: 0, b: 0, c: 0 };
  const salto = { b: Q[2].zoom - Q[1].zoom, c: Q[3].zoom - Q[2].zoom };

  const mover = () => {
    const pb = panDaDescida(e.b, salto.b);
    const pc = panDaDescida(e.c, salto.c);
    const soma = (k, pb2 = e.b, pc2 = e.c) => Q[0][k] + e.a * (Q[1][k] - Q[0][k]) + pb2 * (Q[2][k] - Q[1][k]) + pc2 * (Q[3][k] - Q[2][k]);
    const cam = {
      lng: soma('lng', pb, pc),
      lat: soma('lat', pb, pc),
      zoom: soma('zoom'),
      pitch: M.VISTA.pitch * suave(0.4, 1, e.c),
      bearing: M.VISTA.bearing * suave(0.3, 1, e.c),
      recuo: suave(0.4, 1, e.c),
    };
    M.camera(cam);
    M.brilho(M.BRILHO.inicio + (M.BRILHO.fim - M.BRILHO.inicio) * suave(0.2, 1, e.c));

    // Planeta Three.js: mesmo centro e mesmo tamanho na tela (enquanto ainda aparece)
    if (globo.ativo) {
      pose.rotX = cam.lat * DEG;
      pose.rotY = giroDaLng(cam.lng) + voltas * Math.PI * 2;
      pose.dist = M.distanciaDoZoom(cam.zoom, cam.lat);
      pose.x = ini.x * (1 - e.centro);
      pose.y = ini.y * (1 - e.centro);
      pose.rotZ = ini.rotZ * (1 - e.centro);
    }
  };
  tl.eventCallback('onUpdate', mover);
  mover();

  tl.add(sairInicio(), 0)
    .to(pose, { flutuar: 0, duration: 0.8, ease: 'power2.out' }, 0)
    .to(pose, { nuvens: 0, duration: 1.3, ease: 'power1.inOut' }, 0.2)

    // 1) Mundo: o planeta vai para o centro e gira até o Brasil
    .to(e, { centro: 1, duration: T.centro[1], ease: EASE }, T.centro[0])
    .to(e, { a: 1, duration: T.mundo[1], ease: EASE }, T.mundo[0])
    .fromTo(rotulo('mundo'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.55)
    // Fusão: o satélite aparece por cima do planeta, que some embaixo dele (estrelas e halo ficam)
    .fromTo('.mapa-cidade', { opacity: 0 }, { opacity: 1, duration: T.fusao[1], ease: 'power1.inOut' }, T.fusao[0])
    .set(pose, { planeta: 0 }, T.fusao[0] + T.fusao[1])
    .add(aoRevelar, T.fusao[0] + T.fusao[1])
    .to(rotulo('mundo'), { autoAlpha: 0, y: -12, duration: 0.45, ease: 'power1.in' }, 2.6)

    // 2) Pará: estrelas e halo somem enquanto a câmera desce
    .to(e, { b: 1, duration: T.para[1], ease: EASE }, T.para[0])
    .to(pose, { estrelas: 0, atmo: 0, duration: 1.6, ease: 'power1.inOut' }, 3)
    .fromTo(rotulo('para'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 3.4)
    .add(() => globo.pausar(), 4.8)
    .to(rotulo('para'), { autoAlpha: 0, y: -12, duration: 0.45, ease: 'power1.in' }, 5.4)

    // 3) Canaã dos Carajás: desce até a cidade, inclina e gira para olhar a cidade do Mirante
    .to(e, { c: 1, duration: T.canaa[1], ease: EASE }, T.canaa[0])
    // Título da cidade: fade suave de 600 ms, só quando a cidade já está visível
    .fromTo(rotulo('cidade'), { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE_TITULO, ease: 'sine.inOut' }, T.cidade[0])
    .to(rotulo('cidade'), { autoAlpha: 0, duration: FADE_TITULO, ease: 'sine.inOut' }, T.cidade[0] + FADE_TITULO + T.cidade[1])

    // Antes dos pins, as imagens da cidade precisam estar na tela: se alguma ainda está chegando
    // (internet lenta), a transição espera um pouco (no máximo 4 s) com o mapa parado
    .add(() => esperarImagens(tl), T.pins - 0.05)
    // Pins, um por um, com a câmera parada; o guia entra quando o último assentou
    .add(M.entrarMapa(), T.pins)
    .add(aoAssentar, T.pins + M.DURACAO_PINS());

  /** Toque durante a transição: acelera até o fim, sem corte */
  let pulou = false;
  function pular() {
    if (pulou) return;
    pulou = true;
    gsap.to(tl, { timeScale: 3.2, duration: 0.3, ease: 'power1.in' });
  }

  return tl;
}

/** Pausa a timeline até as imagens do mapa carregarem (o fim da espera já tem limite) */
function esperarImagens(tl) {
  if (M.imagensCarregadas()) return;
  tl.pause();
  M.esperarImagens().then(() => atual === tl && tl.paused() && tl.resume());
}

/** Esconde a tela de transição (e interrompe a que estiver rodando, ao voltar ao início) */
export function limparTransicao() {
  if (atual?.isActive()) {
    atual.kill();
    pararAtual?.();
  }
  atual = null;
  gsap.set(tela, { autoAlpha: 0 });
  gsap.set(tela.querySelectorAll('.mapa__rotulo'), { autoAlpha: 0 });
}
