// Ponto de entrada do totem.
// Carrega o conteúdo (data/locais.json), prepara o planeta e liga os módulos.
import './styles/tokens.css';
import './styles/base.css';
import './styles/telas/inicio.css';
import './styles/telas/transicao.css';
import './styles/telas/locais.css';
import './styles/telas/local.css';
import './styles/componentes.css';

import gsap from 'gsap';
import { estado, locaisAtivos } from './core/estado.js';
import { aplicarTextos, montarSeletores } from './core/i18n.js';
import { ativarModoQuiosque } from './core/kiosk.js';
import { ativarOndaDeToque } from './core/touch-ripple.js';
import { iniciarDescanso } from './core/idle.js';
import { iniciarRotas, comecar, abrirLocal, proximoLocal, voltarLocais, irInicio } from './core/router.js';
import { Globo } from './componentes/globo.js';
import { montarMascote } from './componentes/mascote.js';
import { montarInicio, entrarInicio } from './telas/inicio.js';
import { montarLocais } from './telas/locais.js';
import { montarLocal } from './telas/local.js';

async function iniciar() {
  estado.dados = await fetch('data/locais.json', { cache: 'no-cache' }).then((r) => r.json());
  const { config } = estado.dados;
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

  // Telas e navegação
  iniciarRotas(globo);
  montarInicio({ aoComecar: comecar });
  montarLocais({ aoAbrirLocal: abrirLocal });
  montarLocal({ aoVoltar: voltarLocais, aoProximo: proximoLocal });
  montarMascote();

  document.querySelector('.barra-topo [data-acao="inicio"]').addEventListener('click', () => irInicio());
  document.querySelector('.barra-topo [data-acao="locais"]').addEventListener('click', voltarLocais);

  // Modo descanso após N segundos sem toque
  iniciarDescanso({
    segundos: config.tempoDescansoSegundos || 60,
    segundosStreetView: typeof TEMPO_PARADO_SEGUNDOS === 'number' ? TEMPO_PARADO_SEGUNDOS : 120, // config.js
    aoDescansar: () => irInicio({ descanso: true }),
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
    const fotos = locaisAtivos().flatMap((l) => Object.values(l.fotos).filter((v) => typeof v === 'string'));
    const recursos = performance.getEntriesByType('resource').map((r) => r.name).filter((u) => u.startsWith(location.origin));
    sw?.postMessage({
      tipo: 'precache',
      urls: [...new Set(['./', 'config.js', 'data/locais.json', 'assets/img/streetview-offline.webp', ...fotos, ...recursos])],
    });
  });
}

iniciar();
