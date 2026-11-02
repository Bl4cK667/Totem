// Navegação entre as telas, com as transições entre elas.
// Fluxo: inicio → (transição) → locais ⇄ local → … → inicio (botão ou descanso)
import gsap from 'gsap';
import { estado, emitir, localPorId, em } from './estado.js';
import { mudarIdioma } from './i18n.js';
import { entrarInicio, definirDescanso } from '../telas/inicio.js';
import { executarTransicao, limparTransicao } from '../telas/transicao.js';
import { renderizar as renderizarLocais, entrarLocais, definirIndice } from '../telas/locais.js';
import { renderizarLocal, abrirLocal as animarAbertura, sairLocal, destruir as destruirLocal } from '../telas/local.js';
import { preCarregar } from '../util/preload.js';

const app = document.getElementById('app');
const barra = document.querySelector('.barra-topo');
const cortina = document.querySelector('.cortina');
let globo = null;

export function iniciarRotas(g) {
  globo = g;
  // Troca de idioma: refaz a tela atual sem perder a posição
  em('idioma', () => {
    if (estado.tela === 'locais') renderizarLocais();
    if (estado.tela === 'local') renderizarLocal(estado.localId, { manterRolagem: true });
  });
}

function definirTela(nome) {
  estado.tela = nome;
  emitir('tela', nome);
}

function barraClara() {
  barra.classList.remove('sobre-escuro', 'com-veu', 'veu-claro', 'no-local');
}

function mostrarBarra(mostrar) {
  gsap.to(barra, { autoAlpha: mostrar ? 1 : 0, duration: 0.6, ease: 'power2.out' });
}

/** Libera novos toques depois de um tempo (evita toques duplos durante a animação) */
function ocupar(segundos) {
  estado.ocupado = true;
  gsap.delayedCall(segundos, () => (estado.ocupado = false));
}

// --- Início → Locais -----------------------------------------------------------
export function comecar() {
  if (estado.ocupado) return;
  ocupar(4.2);
  definirTela('transicao');
  executarTransicao({
    globo,
    aoRevelar: (x, y) => {
      definirTela('locais');
      barraClara();
      mostrarBarra(true);
      entrarLocais({ circulo: { x, y } });
      gsap.delayedCall(1.2, () => {
        limparTransicao();
        globo.pausar();
      });
    },
  });
}

// --- Locais → Local (a foto do card "voa" até a tela cheia) ----------------------
export async function abrirLocal(id, fotoEl) {
  if (estado.ocupado) return;
  ocupar(1.8);
  const l = localPorId(id);
  await Promise.race([preCarregar(l.fotos.capa), new Promise((r) => setTimeout(r, 700))]);

  const r = fotoEl.getBoundingClientRect();
  const voando = document.createElement('div');
  voando.className = 'foto-voando';
  voando.innerHTML = `<img src="${l.fotos.capa}" alt="" />`;
  Object.assign(voando.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  app.appendChild(voando);

  mostrarBarra(false);
  await gsap
    .timeline()
    .fromTo(voando.querySelector('img'), { scale: 1.22 }, { scale: 1.12, duration: 1.05, ease: 'expo.inOut' }, 0)
    .to(voando, { left: 0, top: 0, width: innerWidth, height: innerHeight, duration: 1.05, ease: 'expo.inOut' }, 0)
    .to('[data-tela="locais"]', { autoAlpha: 0, duration: 0.4 }, 0.5);

  await renderizarLocal(id);
  definirTela('local');
  barra.classList.add('no-local');
  mostrarBarra(true);
  animarAbertura();
  gsap.to(voando, { autoAlpha: 0, duration: 0.35, delay: 0.05, onComplete: () => voando.remove() });
}

// --- Local → próximo local (cortina com a foto do próximo subindo) -------------
export async function proximoLocal(id) {
  if (estado.ocupado) return;
  ocupar(1.6);
  const l = localPorId(id);
  await Promise.race([preCarregar(l.fotos.capa), new Promise((r) => setTimeout(r, 700))]);

  const voando = document.createElement('div');
  voando.className = 'foto-voando';
  voando.innerHTML = `<img src="${l.fotos.capa}" alt="" />`;
  Object.assign(voando.style, { inset: '0' });
  app.appendChild(voando);

  await gsap
    .timeline()
    .fromTo(voando, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' })
    .fromTo(voando.querySelector('img'), { scale: 1.3, yPercent: 8 }, { scale: 1.12, yPercent: 0, duration: 1.3, ease: 'expo.out' }, 0);

  await renderizarLocal(id);
  animarAbertura();
  gsap.to(voando, { autoAlpha: 0, duration: 0.35, delay: 0.05, onComplete: () => voando.remove() });
}

// --- Local → Locais -------------------------------------------------------------
export async function voltarLocais() {
  if (estado.ocupado || estado.tela !== 'local') return;
  ocupar(1.2);
  definirIndice(estado.localId);
  await sairLocal();
  destruirLocal();
  barraClara();
  definirTela('locais');
  entrarLocais();
}

// --- Qualquer tela → Início -------------------------------------------------------
export async function irInicio({ descanso = false } = {}) {
  if (descanso && estado.idioma !== 'pt') mudarIdioma('pt');

  if (estado.tela === 'inicio') {
    if (descanso) definirDescanso(true);
    return;
  }
  if (estado.ocupado && !descanso) return;
  ocupar(2);

  await gsap.to(cortina, { opacity: 1, duration: descanso ? 1.4 : 0.7, ease: 'power2.inOut' });

  destruirLocal();
  mostrarBarra(false);
  gsap.set('.tela:not(.tela-inicio)', { autoAlpha: 0 });
  limparTransicao();
  definirTela('inicio');

  // Planeta volta: começa próximo e se afasta até a pose de repouso
  gsap.killTweensOf(globo.pose);
  globo.aplicarPoseInicial();
  const final = { ...globo.pose };
  Object.assign(globo.pose, { dist: final.dist * 0.72, nuvens: 0.4, estrelas: 0, atmo: 0.6 });
  globo.girando = true;
  globo.iniciar();
  gsap.set('#globo', { opacity: 1 });
  gsap.to(globo.pose, { dist: final.dist, nuvens: 1, estrelas: 1, atmo: 1, duration: 2.6, ease: 'expo.out' });

  gsap.to(cortina, { opacity: 0, duration: 1.2, ease: 'power2.out' });
  entrarInicio({ descanso });
}
