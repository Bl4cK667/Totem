// Ponto de entrada do totem.
// Carrega o conteúdo (data/locais.json: interface; data/lugares.json: lugares; data/config.json:
// chave do Google), prepara o planeta e o mapa e liga os módulos.
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/telas/inicio.css';
import './styles/telas/transicao.css';
import './styles/telas/mapa.css';
import './styles/componentes.css';
import './styles/acessibilidade.css';

import gsap from 'gsap';
import { estado, emitir } from './core/estado.js';
import { aplicarTextos, montarSeletores } from './core/i18n.js';
import { ativarModoQuiosque } from './core/kiosk.js';
import { ativarOndaDeToque } from './core/touch-ripple.js';
import { iniciarDescanso } from './core/idle.js';
import { iniciarRotas, comecar, irInicio } from './core/router.js';
import { Globo } from './componentes/globo.js';
import { montarMascote, despedir } from './componentes/mascote.js';
import { montarInicio, entrarInicio } from './telas/inicio.js';
import { montarMapa } from './telas/mapa.js';
import { carregarLugares, fotosDosLugares, modoEdicao, lugaresVisiveis } from './core/lugares.js';
import { montarAcessibilidade } from './core/acessibilidade.js';
import { vigiarRede } from './core/rede.js';
import { iniciarBatimento } from './core/registro.js';

async function iniciar() {
  [estado.dados] = await Promise.all([fetch('data/locais.json', { cache: 'no-cache' }).then((r) => r.json()), carregarLugares()]);
  const { config } = estado.dados;
  document.documentElement.classList.toggle('modo-edicao', modoEdicao);
  // Modo totem (abrir-totem.bat abre com ?totem, ou tela cheia): sem cursor
  const totem = new URLSearchParams(location.search).has('totem') || matchMedia('(display-mode: fullscreen)').matches;
  document.documentElement.classList.toggle('modo-totem', totem);
  document.body.classList.toggle('sem-confirmar', !config.mostrarMarcasConfirmar);

  ativarModoQuiosque();
  ativarOndaDeToque(document.querySelector('.toques'));
  montarSeletores();
  aplicarTextos();
  montarAcessibilidade({ haLibras: lugaresVisiveis().some((l) => l.video_libras) });

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

  // Botões "Início": marca da barra do topo e tela do lugar
  document.addEventListener('click', (e) => e.target.closest('[data-acao="inicio"]') && irInicio());

  // Modo descanso após N segundos sem toque: volta ao planeta e o idioma volta para PT
  // (o mascote dá tchau e sai pulando antes da troca de tela)
  const descanso = iniciarDescanso({
    segundos: config.tempoDescansoSegundos || 60,
    aoDescansar: async () => {
      emitir('descanso'); // áudio, vídeo e acessibilidade voltam ao normal
      await despedir();
      irInicio({ descanso: true });
    },
  });
  recarregarDeVezEmQuando(descanso);
  vigiarRede();
  iniciarBatimento();

  // Só em desenvolvimento: permite aos testes desacelerar as animações
  if (import.meta.env.DEV) window.__gsap = gsap;

  estado.tela = 'inicio';
  gsap.to('.carregando', { autoAlpha: 0, duration: 0.8, onComplete: () => document.querySelector('.carregando')?.remove() });
  gsap.fromTo('#globo', { opacity: 0 }, { opacity: 1, duration: 2.4, ease: 'power2.out' });
  gsap.from(globo.pose, { dist: globo.pose.dist * 1.2, duration: 3.6, ease: 'expo.out' });
  entrarInicio();

  registrarOffline();
}

/**
 * Para o totem não ficar lento com o tempo (memória), a página recarrega sozinha:
 * - uma vez por dia, entre 4h e 5h da manhã;
 * - depois de 8 horas ligada.
 * Só quando está na tela inicial e ninguém toca há 2 minutos.
 */
function recarregarDeVezEmQuando(descanso) {
  const LIGOU = Date.now();
  const OITO_HORAS = 8 * 3600 * 1000;
  const ler = () => {
    try {
      return localStorage.getItem('totem-ultima-recarga');
    } catch {
      return null;
    }
  };
  setInterval(() => {
    if (estado.tela !== 'inicio' || descanso.semToqueHa() < 120000) return;
    const agora = new Date();
    const hoje = agora.toDateString();
    const madrugada = agora.getHours() === 4 && ler() !== hoje && Date.now() - LIGOU > 3600 * 1000;
    if (!madrugada && Date.now() - LIGOU < OITO_HORAS) return;
    try {
      localStorage.setItem('totem-ultima-recarga', hoje);
    } catch {
      /* sem localStorage: recarrega mesmo assim */
    }
    location.reload();
  }, 60000);
}

/** Service worker: guarda em cache tudo o que o totem usa (funciona sem internet) */
function registrarOffline() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  navigator.serviceWorker.register('./sw.js').then(async () => {
    const sw = (await navigator.serviceWorker.ready).active;
    const fotos = fotosDosLugares();
    const recursos = performance.getEntriesByType('resource').map((r) => r.name).filter((u) => u.startsWith(location.origin));
    sw?.postMessage({
      tipo: 'precache',
      urls: [...new Set(['./', 'data/locais.json', 'data/lugares.json', 'data/config.json', 'assets/img/streetview-offline.webp', ...fotos, ...recursos])],
    });
  });
}

iniciar();
