// Transição cinematográfica: um único movimento de câmera, do planeta aos cards.
// 1) Planeta gira até o Brasil enquanto o contorno se desenha sobre ele
// 2) O planeta some e o mapa, colado na mesma esfera, continua no lugar
// 3) A câmera desce sem parar até o Pará e Canaã, e o fundo vai do escuro ao verde
// 4) O ponto de Canaã cresce e vira o fundo bege da tela dos cards
// Uma timeline só, animando apenas posição da câmera e opacidade.
import gsap from 'gsap';
import { estado } from '../core/estado.js';
import { sairInicio } from './inicio.js';

const tela = document.querySelector('[data-tela="transicao"]');
const rotulos = tela.querySelector('.mapa__rotulos');
const rotulo = (n) => tela.querySelector(`[data-rotulo="${n}"]`);

// Área mostrada em cada etapa da câmera: centro e tamanho em graus, e quanto da tela ela ocupa
const BRASIL = { lat: -14.2, lon: -53, largura: 40, altura: 40, fracao: 0.92 };
const PARA = { lat: -3.7, lon: -52.5, largura: 12.9, altura: 12.5, fracao: 0.84 };
const CANAA = { lat: -6.48, lon: -50.1, largura: 0.95, altura: 0.5, fracao: 0.62 };

// Linha do tempo (segundos). Cada etapa da câmera começa antes de a anterior terminar
const T = {
  planeta: [0, 1.9],
  brasil: [1.45, 1.7],
  canaa: [2.7, 1.7],
  ponto: 4.3, // só passa daqui com as fotos dos cards prontas
  cards: 4.95,
};
const EASE = 'power2.inOut';
const TOQUE_MINIMO = 350; // ms: um toque duplo no botão não conta como "pular"
const TEMPO_DO_PULO = 0.65;

function coordenadas() {
  const { lat, lng } = estado.dados.config.cidade;
  const fmt = (v) => {
    const a = Math.abs(v);
    return `${Math.floor(a)}°${String(Math.round((a % 1) * 60)).padStart(2, '0')}′`;
  };
  const oeste = estado.idioma === 'en' ? 'W' : 'O';
  return `${fmt(lat)} S · ${fmt(lng)} ${oeste}`;
}

/** Duração só para quem pediu menos movimento: fade simples entre as telas */
function versaoCurta(tl, { sinalDasFotos, entrada, aoRevelar, aoAssentar }) {
  tl.add(sairInicio(), 0).add(sinalDasFotos, 0.55).add(aoRevelar, 0.6).add(entrada, 0.6).add(aoAssentar, 0.9);
}

/**
 * Executa a transição.
 * - fotos: promessa resolvida quando as imagens dos cards estão prontas
 * - entrada: timeline de entrada da tela de cards (fica embutida nesta)
 * - aoRevelar: o fundo bege já cobre a tela; aoAssentar: cards visíveis; aoTerminar: fim de tudo
 */
export function executarTransicao({ globo, fotos, entrada, aoRevelar, aoAssentar, aoTerminar }) {
  const { pose, mapa, ponto } = globo;
  const v = mapa.v;
  const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  tela.querySelector('.mapa__coord').textContent = coordenadas();
  gsap.set(tela.querySelectorAll('.mapa__rotulo'), { autoAlpha: 0 });
  gsap.set(rotulos, { opacity: 1 });
  gsap.set(tela, { autoAlpha: 1 });

  // Se tocarem durante a aproximação inicial, a transição assume a câmera sem disputa
  gsap.killTweensOf(pose);
  globo.emTransicao = true;
  globo.girando = false;

  let fotosProntas = false;
  fotos.then(() => (fotosProntas = true));

  const inicio = performance.now();
  const aoTocar = (e) => {
    e.stopPropagation();
    if (performance.now() - inicio > TOQUE_MINIMO) pular();
  };
  const soltarToques = () => {
    window.removeEventListener('pointerdown', aoTocar, true);
    window.removeEventListener('click', bloquearClique, true);
  };
  const bloquearClique = (e) => e.stopPropagation();

  const tl = gsap.timeline({
    onComplete: () => {
      soltarToques();
      globo.emTransicao = false;
      aoTerminar();
    },
  });

  /** Segura a timeline enquanto as fotos não chegam (o ponto continua pulsando) */
  const sinalDasFotos = () => {
    if (fotosProntas) return;
    tl.pause();
    fotos.then(() => tl.play());
  };

  window.addEventListener('pointerdown', aoTocar, true);
  window.addEventListener('click', bloquearClique, true);

  if (semMovimento) {
    versaoCurta(tl, { sinalDasFotos, entrada, aoRevelar, aoAssentar });
    return tl;
  }

  // Câmera: cada etapa soma sua parte ao movimento. Como elas se sobrepõem, ele nunca para
  const voltas = Math.round((pose.rotY - globo.rotacaoPara(BRASIL.lat, BRASIL.lon).rotY) / (Math.PI * 2));
  const quadro = (a) => {
    const r = globo.rotacaoPara(a.lat, a.lon);
    return { rotX: r.rotX, rotY: r.rotY + voltas * Math.PI * 2, alt: Math.log(globo.altitudePara(a.largura, a.altura, a.fracao)) };
  };
  const q0 = { rotX: pose.rotX, rotY: pose.rotY, alt: Math.log(pose.dist - 1) };
  const q1 = quadro(BRASIL);
  const q2 = quadro(PARA);
  const q3 = quadro(CANAA);
  const ini = { x: pose.x, y: pose.y, rotZ: pose.rotZ };
  const etapas = { a: 0, b: 0, c: 0 };
  const somar = (k) => q0[k] + etapas.a * (q1[k] - q0[k]) + etapas.b * (q2[k] - q1[k]) + etapas.c * (q3[k] - q2[k]);
  const mover = () => {
    pose.rotX = somar('rotX');
    pose.rotY = somar('rotY');
    pose.dist = 1 + Math.exp(somar('alt'));
    pose.x = ini.x * (1 - etapas.a);
    pose.y = ini.y * (1 - etapas.a);
    pose.rotZ = ini.rotZ * (1 - etapas.a);
  };
  tl.eventCallback('onUpdate', mover);

  const creme = { duration: 0.45, ease: 'power1.in' };

  mapa.grupo.visible = true;
  tl.add(sairInicio(), 0)
    .to(pose, { flutuar: 0, duration: 0.8, ease: 'power2.out' }, 0)
    .to(pose, { nuvens: 0, estrelas: 0, atmo: 0, duration: 1.3, ease: 'power1.inOut' }, 0.3)

    // 1) Planeta → Brasil: o contorno se desenha enquanto a câmera chega
    .to(etapas, { a: 1, duration: T.planeta[1], ease: EASE }, T.planeta[0])
    .to(v, { brasilTraco: 1, duration: 1.15, ease: 'power1.inOut' }, 0.65)

    // Crossfade: o mapa aparece embaixo enquanto o planeta some
    .to(v, { grade: 1, brasilFundo: 1, estados: 1, duration: 0.9, ease: EASE }, 1.25)
    .to(pose, { planeta: 0, duration: 1, ease: EASE }, 1.25)
    .fromTo(rotulo('brasil'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 1.3)

    // 2) Brasil → Pará: os outros estados somem e o fundo vai ficando verde
    .to(etapas, { b: 1, duration: T.brasil[1], ease: EASE }, T.brasil[0])
    .to(v, { paraTraco: 1, duration: 0.8, ease: 'power1.inOut' }, 1.6)
    .to(v, { paraFundo: 1, duration: 0.8, ease: EASE }, 1.85)
    .to(v, { estados: 0, brasilFundo: 0, brasilAlfa: 0, grade: 0.4, duration: 1.2, ease: EASE }, 2)
    .to(pose, { fundo: 1, duration: 1.7, ease: EASE }, 1.9)
    .to(rotulo('brasil'), { autoAlpha: 0, y: -12, duration: 0.4, ease: 'power1.in' }, 1.95)
    .fromTo(rotulo('para'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 2.3)

    // 3) Pará → Canaã: o ponto pulsa e o nome da cidade sobe
    .to(etapas, { c: 1, duration: T.canaa[1], ease: EASE }, T.canaa[0])
    .to(rotulo('para'), { autoAlpha: 0, y: -12, duration: 0.4, ease: 'power1.in' }, 3)
    .to(v, { canaaTraco: 1, duration: 0.6, ease: 'power1.inOut' }, 3.25)
    .to(v, { canaaFundo: 1, duration: 0.5, ease: EASE }, 3.5)
    .to(ponto, { alfa: 1, duration: 0.4, ease: 'power1.out' }, 3.3)
    .fromTo(rotulo('cidade'), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 3.45)

    // 4) Canaã → cards: o ponto vira o fundo bege
    .add(sinalDasFotos, T.ponto)
    .to(rotulo('cidade'), { autoAlpha: 0, y: -14, duration: 0.3, ease: 'power1.in' }, T.ponto)
    .to(ponto, { mistura: 1, ...creme }, T.ponto)
    .to(ponto, { raio: () => globo.raioParaCobrir() * 1.03, duration: T.cards - T.ponto, ease: 'power2.in' }, T.ponto)
    .add(aoRevelar, T.cards)
    .add(entrada, T.cards)
    .add(aoAssentar, T.cards + 0.15);

  /** Toque durante a transição: o bege cobre a tela e a timeline salta para os cards */
  let pulou = false;
  function pular() {
    if (pulou) return;
    pulou = true;
    if (tl.time() >= T.ponto - TEMPO_DO_PULO) {
      gsap.to(tl, { timeScale: 2.5, duration: 0.2 });
      return;
    }
    fotos.then(() => {
      if (tl.time() >= T.ponto - TEMPO_DO_PULO) return gsap.to(tl, { timeScale: 2.5, duration: 0.2 });
      gsap.to(rotulos, { opacity: 0, duration: 0.25, ease: 'power1.out' });
      gsap.to(ponto, { alfa: 1, mistura: 1, duration: 0.2, ease: 'power1.out', overwrite: true });
      gsap.to(ponto, {
        raio: Math.hypot(innerWidth, innerHeight) * 2.2, // cobre a tela mesmo com Canaã fora dela
        duration: TEMPO_DO_PULO,
        ease: 'power2.in',
        onComplete: () => tl.seek(T.cards + 0.001, false),
      });
    });
  }

  return tl;
}

/** Esconde a tela de transição depois que a próxima já está visível */
export function limparTransicao() {
  gsap.set(tela, { autoAlpha: 0 });
  gsap.set(tela.querySelectorAll('.mapa__rotulo'), { autoAlpha: 0 });
}
