// Transição cinematográfica: planeta → Brasil → Pará → Canaã.
// 1) O globo gira até Canaã e aproxima (Three.js)
// 2) O mapa vetorial (contornos do IBGE) assume no mesmo enquadramento
// 3) O "zoom" continua no SVG até o município, e um círculo revela a próxima tela
import gsap from 'gsap';
import { BRASIL, PARA, CANAA, PROJ } from '../componentes/mapa-dados.js';
import { estado } from '../core/estado.js';
import { sairInicio } from './inicio.js';

const tela = document.querySelector('[data-tela="transicao"]');
const svg = tela.querySelector('.mapa');
const rotulo = (n) => tela.querySelector(`[data-rotulo="${n}"]`);

// Lon/lat → coordenadas do SVG (mesma projeção do mapa-dados.js)
const px = (lon) => (lon - PROJ.lon0) * PROJ.k;
const py = (lat) => (PROJ.lat0 - lat) * PROJ.k;

function montarSvg() {
  const { lat, lng } = estado.dados.config.cidade;
  let grade = '';
  for (let lon = -75; lon <= -30; lon += 5) grade += `<line x1="${px(lon)}" y1="${py(8)}" x2="${px(lon)}" y2="${py(-36)}"/>`;
  for (let la = 5; la >= -35; la -= 5) grade += `<line x1="${px(-76)}" y1="${py(la)}" x2="${px(-32)}" y2="${py(la)}"/>`;

  svg.innerHTML = `
    <g class="mapa__grade">${grade}</g>
    <path class="mapa__brasil" d="${BRASIL}" pathLength="1" vector-effect="non-scaling-stroke"/>
    <path class="mapa__para" d="${PARA}" pathLength="1" vector-effect="non-scaling-stroke"/>
    <path class="mapa__canaa" d="${CANAA}" pathLength="1" vector-effect="non-scaling-stroke"/>
    <g class="mapa__ponto" transform="translate(${px(lng)} ${py(lat)})">
      <circle class="mapa__onda" r="1" vector-effect="non-scaling-stroke"/>
      <circle class="mapa__nucleo" r="0.6"/>
    </g>`;
}

/** viewBox centrado em (cx, cy) com a largura pedida, na proporção da tela */
function vb(cx, cy, largura) {
  const aspect = window.innerWidth / window.innerHeight;
  const altura = largura / aspect;
  return `${cx - largura / 2} ${cy - altura / 2} ${largura} ${altura}`;
}

/** Largura do viewBox para caber uma área (em graus) ocupando "fracao" da tela */
function encaixar(grausLon, grausLat, fracao) {
  const aspect = window.innerWidth / window.innerHeight;
  return Math.max((grausLon * PROJ.k) / fracao, ((grausLat * PROJ.k) / fracao) * aspect);
}

function coordenadas() {
  const { lat, lng } = estado.dados.config.cidade;
  const fmt = (v) => {
    const a = Math.abs(v);
    return `${Math.floor(a)}°${String(Math.round((a % 1) * 60)).padStart(2, '0')}′`;
  };
  const oeste = estado.idioma === 'en' ? 'W' : 'O';
  return `${fmt(lat)} S · ${fmt(lng)} ${oeste}`;
}

/**
 * Executa a transição. aoRevelar(x, y) é chamado no final com a posição
 * do ponto da cidade na tela, para a próxima tela abrir em círculo dali.
 */
export function executarTransicao({ globo, aoRevelar }) {
  montarSvg();
  tela.querySelector('.mapa__coord').textContent = coordenadas();

  const { lat, lng } = estado.dados.config.cidade;
  const foco = globo.poseFoco();
  const grausBrasil = globo.grausVisiveis(foco.dist);

  const vbBrasil = vb(px(lng), py(lat), grausBrasil * PROJ.k);
  const vbPara = vb(px(-52.5), py(-3.7), encaixar(12.9, 12.5, 0.84));
  const vbCanaa = vb(px(-50.1), py(-6.48), encaixar(0.95, 0.5, 0.62));

  const brasil = svg.querySelector('.mapa__brasil');
  const para = svg.querySelector('.mapa__para');
  const canaa = svg.querySelector('.mapa__canaa');
  const ponto = svg.querySelector('.mapa__ponto');
  const onda = svg.querySelector('.mapa__onda');

  svg.setAttribute('viewBox', vbBrasil);
  gsap.set([brasil, para, canaa], { strokeDasharray: 1, strokeDashoffset: 1, fillOpacity: 0 });
  gsap.set(svg.querySelector('.mapa__grade'), { opacity: 0 });
  gsap.set(ponto, { opacity: 0 });
  gsap.set(tela.querySelectorAll('.mapa__rotulo'), { autoAlpha: 0 });
  gsap.set(tela, { autoAlpha: 0 });

  // Se tocarem durante a aproximação inicial, a transição assume a câmera sem disputa
  gsap.killTweensOf(globo.pose);
  globo.emTransicao = true;
  globo.girando = false;

  const tl = gsap.timeline({
    onComplete: () => {
      globo.emTransicao = false;
    },
  });

  // 1) Globo: gira até Canaã e aproxima
  tl.add(sairInicio(), 0)
    .to(globo.pose, { rotY: foco.rotY, rotX: foco.rotX, rotZ: 0, x: 0, y: 0, duration: 1.25, ease: 'power3.inOut' }, 0)
    .to(globo.pose, { dist: foco.dist, duration: 1.35, ease: 'power3.inOut' }, 0.05)
    .to(globo.pose, { flutuar: 0, duration: 0.6, ease: 'power2.out' }, 0)
    .to(globo.pose, { nuvens: 0, estrelas: 0, atmo: 0.4, duration: 0.9, ease: 'power1.in' }, 0.25)

    // 2) Mapa assume: Brasil desenhado em linha dourada
    .set(tela, { autoAlpha: 1 }, 0.95)
    .to(brasil, { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' }, 0.95)
    .to(brasil, { fillOpacity: 1, duration: 0.6 }, 1.2)
    .to(svg.querySelector('.mapa__grade'), { opacity: 1, duration: 0.6 }, 1.1)
    .to('#globo', { opacity: 0, duration: 0.5, ease: 'power1.inOut' }, 1.15)
    .fromTo(rotulo('brasil'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 1.05)

    // 3) Pará
    .to(svg, { attr: { viewBox: vbPara }, duration: 0.75, ease: 'power3.inOut' }, 1.45)
    .to(para, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.inOut' }, 1.5)
    .to(para, { fillOpacity: 1, duration: 0.5 }, 1.75)
    .to(rotulo('brasil'), { autoAlpha: 0, y: -12, duration: 0.3 }, 1.55)
    .fromTo(rotulo('para'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, 1.7)

    // 4) Canaã dos Carajás
    .to(svg, { attr: { viewBox: vbCanaa }, duration: 0.8, ease: 'power3.inOut' }, 2.05)
    .to(rotulo('para'), { autoAlpha: 0, y: -12, duration: 0.3 }, 2.1)
    .to(canaa, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut' }, 2.35)
    .to(canaa, { fillOpacity: 1, duration: 0.4 }, 2.5)
    .to(ponto, { opacity: 1, duration: 0.3 }, 2.45)
    .fromTo(onda, { attr: { r: 0.2 }, opacity: 1 }, { attr: { r: 2.2 }, opacity: 0, duration: 0.9, ease: 'power2.out' }, 2.5)
    .fromTo(rotulo('cidade'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 2.45)

    // 5) Revela a próxima tela a partir do ponto
    .add(() => {
      const r = ponto.getBoundingClientRect();
      aoRevelar(r.left + r.width / 2, r.top + r.height / 2);
    }, 2.85);

  return tl;
}

/** Esconde a tela de transição depois que a próxima já está visível */
export function limparTransicao() {
  gsap.set(tela, { autoAlpha: 0 });
}
