// Ponto de entrada do totem.
// Carrega o conteúdo (data/locais.json e config.js), prepara o planeta e o mapa e liga os módulos.
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/telas/inicio.css';
import './styles/telas/transicao.css';
import './styles/telas/mapa.css';
import './styles/componentes.css';

import gsap from 'gsap';
import { estado } from './core/estado.js';
import { preCarregar } from './util/preload.js';
import { aplicarTextos, montarSeletores } from './core/i18n.js';
import { ativarModoQuiosque } from './core/kiosk.js';
import { ativarOndaDeToque } from './core/touch-ripple.js';
import { iniciarDescanso } from './core/idle.js';
import { iniciarRotas, comecar, irInicio } from './core/router.js';
import { Globo } from './componentes/globo.js';
import { montarMascote, despedir } from './componentes/mascote.js';
import { montarInicio, entrarInicio } from './telas/inicio.js';
import { montarMapa } from './telas/mapa.js';
import { pontosTuristicos } from './componentes/streetview.js';

async function iniciar() {
  estado.dados = await fetch('data/locais.json', { cache: 'no-cache' }).then((r) => r.json());
  const { config } = estado.dados;
  // Fotos do painel: carregam já na tela do planeta
  preCarregar(pontosTuristicos().map((p) => p.foto).filter(Boolean));
  document.body.classList.toggle('sem-confirmar', !config.mostrarMarcasConfirmar);

  ativarModoQuiosque();
  ativarOndaDeToque(document.querySelector('.toques'));
  montarSeletores();
  aplicarTextos();

  // Planeta: espera texturas e fontes antes de mostrar a vitrine
  const globo = new Globo(document.getElementById('globo'), { cidade: config.cidade });
  await Promise.all([globo.carregar(), document.fonts.ready]);
  globo.aplicarPoseInicial();
  globo.iniciar();

  // Telas e navegação. O mapa termina de baixar as imagens enquanto a vitrine está na tela
  iniciarRotas(globo);
  montarInicio({ aoComecar: comecar });
  montarMapa();
  montarMascote();

  document.querySelector('.barra-topo [data-acao="inicio"]').addEventListener('click', () => irInicio());

  // Modo descanso após N segundos sem toque
  // (o mascote dá tchau e sai pulando antes da troca de tela)
  iniciarDescanso({
    segundos: config.tempoDescansoSegundos || 120,
    aoDescansar: async () => {
      await despedir();
      irInicio({ descanso: true });
    },
  });

  // Só em desenvolvimento: permite aos testes desacelerar as animações
  if (import.meta.env.DEV) window.__gsap = gsap;

  estado.tela = 'inicio';
  gsap.to('.carregando', { autoAlpha: 0, duration: 0.8, onComplete: () => document.querySelector('.carregando')?.remove() });
  gsap.fromTo('#globo', { opacity: 0 }, { opacity: 1, duration: 2.4, ease: 'power2.out' });
  gsap.from(globo.pose, { dist: globo.pose.dist * 1.2, duration: 3.6, ease: 'expo.out' });
  entrarInicio();

  registrarOffline();
}

/** Service worker: guarda em cache tudo o que o totem usa (funciona sem internet) */
function registrarOffline() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  navigator.serviceWorker.register('./sw.js').then(async () => {
    const sw = (await navigator.serviceWorker.ready).active;
    const fotos = pontosTuristicos().map((p) => p.foto).filter(Boolean);
    const recursos = performance.getEntriesByType('resource').map((r) => r.name).filter((u) => u.startsWith(location.origin));
    sw?.postMessage({
      tipo: 'precache',
      urls: [...new Set(['./', 'config.js', 'data/locais.json', 'assets/img/streetview-offline.webp', ...fotos, ...recursos])],
    });
  });
}

iniciar();
