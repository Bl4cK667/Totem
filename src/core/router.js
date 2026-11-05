// Navegação entre as telas, com as transições entre elas.
// Fluxo: inicio → (transição do planeta) → mapa da cidade → … → inicio (botão ou descanso)
import gsap from 'gsap';
import { estado, emitir } from './estado.js';
import { mudarIdioma } from './i18n.js';
import { entrarInicio, definirDescanso } from '../telas/inicio.js';
import { executarTransicao, limparTransicao } from '../telas/transicao.js';
import { resetarMapa } from '../telas/mapa.js';

const barra = document.querySelector('.barra-topo');
const cortina = document.querySelector('.cortina');
let globo = null;

export function iniciarRotas(g) {
  globo = g;
}

function definirTela(nome) {
  estado.tela = nome;
  emitir('tela', nome);
}

function mostrarBarra(mostrar) {
  gsap.to(barra, { autoAlpha: mostrar ? 1 : 0, duration: 0.6, ease: 'power2.out' });
}

/** Libera novos toques depois de um tempo (evita toques duplos durante a animação) */
function ocupar(segundos) {
  estado.ocupado = true;
  gsap.delayedCall(segundos, () => (estado.ocupado = false));
}

// --- Início → Mapa da cidade -----------------------------------------------------
export function comecar() {
  if (estado.ocupado) return;
  estado.ocupado = true;
  definirTela('transicao');
  executarTransicao({
    globo,
    aoRevelar: () => {
      // Barra clara sobre o mapa escuro
      barra.classList.remove('veu-claro', 'no-local');
      barra.classList.add('sobre-escuro', 'com-veu');
      mostrarBarra(true);
    },
    // O mascote reage a este aviso: entra quando os pins já estão na tela
    aoAssentar: () => definirTela('locais'),
    aoTerminar: () => {
      limparTransicao();
      globo.pausar();
      estado.ocupado = false;
    },
  });
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

  mostrarBarra(false);
  gsap.set('.tela:not(.tela-inicio)', { autoAlpha: 0 });
  limparTransicao();
  resetarMapa();
  definirTela('inicio');

  // Planeta volta: começa próximo e se afasta até a pose de repouso
  gsap.killTweensOf(globo.pose);
  globo.emTransicao = false;
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
