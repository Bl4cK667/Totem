// Mapa interativo da cidade (MapLibre GL, globo + satélite Esri).
// - É o mesmo mapa da transição: a câmera desce do planeta até Canaã e fica aqui.
// - Só os pontos turísticos (config.js) aparecem, como pins nas cores da Prefeitura.
// - Toque no pin: o mapa dá um zoom curto em direção ao pin e a página do lugar aparece
//   (rola para baixo, em blocos). "Voltar ao mapa" devolve o mapa como estava.
// - Totem: depois que os pins entram, o mapa fica parado (sem arrastar nem zoom), para o
//   visitante acertar o pin com o dedo.
import * as maplibregl from 'maplibre-gl';
// O MapLibre procura o worker ao lado do próprio arquivo, e o Vite muda esse caminho: aponta direto
import urlDoWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import gsap from 'gsap';
import { estado, em, emitir, menosMovimento } from '../core/estado.js';
import { t, tr, html } from '../core/i18n.js';
import { montarStreetView, pontosTuristicos, assuntosDe } from '../componentes/streetview.js';
import { gerarQrComoChegar, urlComoChegar } from '../componentes/qrcode.js';
import { icone, iconeDoPonto } from '../componentes/icones.js';
import { revelarLinhas, surgir, iris, morfarDoPin, centroDe, EASE_ENTRA, EASE_TROCA } from '../core/movimento.js';

const DEG = Math.PI / 180;

// Mesmo campo de visão do planeta Three.js: os dois globos coincidem na troca
export const FOV = 35;

// O mapa é maior que a tela (MAIOR × a largura e a altura, centralizado e cortado nas bordas):
// as bordas e os cantos, onde uma imagem pode chegar por último, ficam fora de vista, e o mapa já
// carrega uma faixa de imagens em volta da tela. O campo de visão do MapLibre aumenta na mesma
// proporção, então o que aparece na tela continua exatamente igual (e igual ao planeta Three.js).
export const MAIOR = 1.15;
const FOV_MAPA = (2 * Math.atan(MAIOR * Math.tan((FOV / 2) * (Math.PI / 180)))) / (Math.PI / 180);
// Tela do totem (a parte visível do mapa), em px
const telaW = () => innerWidth;
const telaH = () => innerHeight;

// Câmera final da transição e "vista geral" da cidade: do alto do Parque do Mirante,
// olhando para o sul, com a cidade à frente
export const VISTA = { lng: -49.8542, lat: -6.5147, zoom: 14, pitch: 55, bearing: 180, alturaDoFoco: 0.62 };
// Tela horizontal (notebook): menos altura, então o foco desce e o zoom abre um pouco,
// para os pins não ficarem embaixo do título
const AJUSTE_HORIZONTAL = { zoom: -0.35, alturaDoFoco: 0.72 };

/** Vista geral para a orientação atual da tela */
export function vista() {
  if (innerHeight >= innerWidth) return VISTA;
  return { ...VISTA, zoom: VISTA.zoom + AJUSTE_HORIZONTAL.zoom, alturaDoFoco: AJUSTE_HORIZONTAL.alturaDoFoco };
}
export const PARA = { lng: -52, lat: -4, zoom: 5.5 };

const ZOOM_APROXIMAR = 1.8; // mergulho em direção ao pin, enquanto a página do lugar nasce dele
const GIRO_APROXIMAR = 24; // graus: a câmera contorna o lugar enquanto desce
const BRILHO_FINAL = 1; // satélite com o brilho natural: o escuro fica só na vinheta das bordas
const PASSOS_SEM_MOVER = 8; // px: mais do que isso é arraste, não toque

// Cor do chão onde a imagem ainda não chegou: azul de oceano no planeta inteiro (some no planeta
// Three.js) e verde-musgo terroso perto da cidade (a média da imagem de satélite de Canaã)
const COR_OCEANO = '#16324a';
const COR_CHAO = '#5f5d3a';
// Limites da vista da cidade (depois da transição): a câmera não sai da região de Canaã,
// não inclina até o horizonte (onde não há imagem) e não se afasta nem se aproxima demais
const LIMITES = { area: [[-50.25, -6.9], [-49.45, -6.15]], inclinacao: 60, zoomMin: 12, zoomMax: 16.5 };

const SATELITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATRIBUICAO = 'Imagens © Esri, Maxar, Earthstar Geographics e comunidade de usuários GIS';

const camada = document.querySelector('.mapa-cidade');
const tela = document.querySelector('[data-tela="locais"]');
const SETA = icone('seta');
const dois = (n) => String(n).padStart(2, '0');

let mapa = null;
let pins = [];
let aberto = null; // ponto com a página aberta
let streetview = null;
let aquecendo = true;

// --- Mapa ------------------------------------------------------------------------
export function montarMapa() {
  maplibregl.setWorkerUrl(new URL(urlDoWorker, location.href).href);
  mapa = new maplibregl.Map({
    container: camada,
    style: {
      version: 8,
      projection: { type: 'globe' },
      sky: { 'atmosphere-blend': 0 }, // o halo vem do planeta Three.js, que fica atrás
      sources: {
        satelite: { type: 'raster', tiles: [SATELITE], tileSize: 256, maxzoom: 19, attribution: ATRIBUICAO },
      },
      layers: [
        // Onde a imagem ainda não chegou: oceano no planeta, cor do chão perto da cidade
        { id: 'fundo', type: 'background', paint: { 'background-color': ['interpolate', ['linear'], ['zoom'], 6, COR_OCEANO, 9, COR_CHAO] } },
        { id: 'satelite', type: 'raster', source: 'satelite', paint: { 'raster-fade-duration': 250, 'raster-saturation': 0.14, 'raster-contrast': 0.08, 'raster-brightness-min': 0.03 } },
      ],
    },
    center: [VISTA.lng, VISTA.lat],
    zoom: VISTA.zoom,
    pitch: VISTA.pitch,
    bearing: VISTA.bearing,
    maxPitch: LIMITES.inclinacao,
    attributionControl: false,
    // Totem: sem rotação por mouse, sem inclinação por gesto, sem zoom por toque duplo
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    doubleClickZoom: false,
    keyboard: false,
    boxZoom: false,
    fadeDuration: 0,
    maxParallelImageRequests: 32, // a descida pede muitas imagens de uma vez: o padrão (16) enfileira
    cancelPendingTileRequestsWhileZooming: false, // na descida, as imagens chegam mesmo com a câmera em movimento
    // Imagens já carregadas ficam na memória: a câmera volta sem piscar (a cidade inteira cabe aqui)
    maxTileCacheSize: 2000,
    renderWorldCopies: false,
  });
  mapa.setVerticalFieldOfView?.(FOV_MAPA);
  if (import.meta.env.DEV) window.__mapa = mapa; // só para os testes
  mapa.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-left');
  travar();

  // Vinheta leve nas bordas: fica entre a imagem e os pins
  const veu = document.createElement('div');
  veu.className = 'mapa-cidade__veu';
  mapa.getCanvasContainer().after(veu);

  criarPins();
  montarTela();
  mapa.on('move', espalharPins);
  // Fundo da camada na cor do chão só perto da cidade: no planeta, ela é transparente
  const perto = () => camada.classList.toggle('perto', mapa.getZoom() >= 9);
  mapa.on('zoom', perto);
  perto();
  window.addEventListener('resize', () => estado.tela === 'locais' && !aberto && mapa && irParaVista({ duracao: 0 }));
  em('idioma', aoMudarIdioma);

  return new Promise((ok) => mapa.once('load', ok)).then(() => {
    baixarCaminho();
    return aquecerImagens();
  });
}

export const getMapa = () => mapa;

/** Gestos do visitante no mapa: sempre desligados. O mapa só se move pelos toques nos pins */
function travar() {
  for (const h of ['dragPan', 'scrollZoom', 'touchZoomRotate']) mapa[h].disable();
}

/**
 * Enquanto a tela inicial está parada, a câmera passa (invisível) pela cidade e pelo Pará:
 * as imagens de satélite ficam no cache e a descida não mostra a cidade borrada.
 */
async function aquecerImagens() {
  const ocioso = () => new Promise((ok) => {
    const fim = setTimeout(ok, 9000);
    mapa.once('idle', () => (clearTimeout(fim), ok()));
  });
  // A cidade primeiro; depois o caminho da descida, de perto para longe, com a mesma
  // inclinação e o mesmo giro que a câmera terá em cada altura (as mesmas imagens que ela vai pedir)
  const etapas = [
    () => irParaVista({ duracao: 0 }),
    ...[12.5, 11, 9.5, 8, 6.8].map((z) => () => mapa.jumpTo(cameraDoCaminho(z))),
    () => mapa.jumpTo({ center: [PARA.lng, PARA.lat], zoom: PARA.zoom, pitch: 0, bearing: 0 }),
    () => mapa.jumpTo({ center: [PARA.lng, PARA.lat], zoom: 2.4, pitch: 0, bearing: 0 }),
  ];
  for (const etapa of etapas) {
    if (!aquecendo) return;
    etapa();
    await ocioso();
  }
}

// --- Imagens do caminho -------------------------------------------------------------
const suaveC = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};
/** Fração do deslocamento Pará → Canaã num zoom da descida (mesma conta de telas/transicao.js) */
const fracaoDoCaminho = (z) => {
  const salto = vista().zoom - PARA.zoom;
  const p = Math.min(1, Math.max(0, (z - PARA.zoom) / salto));
  return { p, pan: (1 - 2 ** (-p * salto)) / (1 - 2 ** -salto) };
};
/** Câmera da descida num zoom: centro, inclinação, giro e recuo como na transição */
function cameraDoCaminho(z) {
  const v = vista();
  const { p, pan } = fracaoDoCaminho(z);
  const r = recuoDaVista();
  return {
    center: [PARA.lng + pan * (v.lng - PARA.lng), PARA.lat + pan * (v.lat - PARA.lat)],
    zoom: z,
    pitch: VISTA.pitch * suaveC(0.4, 1, p),
    bearing: VISTA.bearing * suaveC(0.3, 1, p),
    padding: { top: r.top * suaveC(0.4, 1, p), bottom: 0, left: 0, right: 0 },
  };
}

/**
 * Baixa em segundo plano as imagens de satélite de todo o caminho da descida e de perto de cada
 * pin. O service worker guarda cada uma para sempre (cache próprio do mapa): depois da primeira
 * vez, a descida inteira sai do disco, sem esperar a internet. Pausa enquanto a câmera se move.
 */
let filaPausada = false;
function baixarCaminho() {
  const tile = (lng, lat, z) => {
    const n = 2 ** z;
    const r = lat * DEG;
    return [Math.floor(((lng + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n)];
  };
  const urls = new Set();
  const area = (lng, lat, z, [x0, x1], [y0, y1]) => {
    const [cx, cy] = tile(lng, lat, z);
    for (let x = cx + x0; x <= cx + x1; x++) for (let y = cy + y0; y <= cy + y1; y++) urls.add(SATELITE.replace('{z}', z).replace('{y}', y).replace('{x}', x));
  };
  const v = vista();
  // Perto da cidade (olhando para o sul: o fundo da tela é mais ao sul, y maior)
  area(v.lng, v.lat, 14, [-5, 5], [-3, 10]);
  area(v.lng, v.lat, 13, [-4, 4], [-2, 7]);
  area(v.lng, v.lat, 12, [-3, 3], [-2, 5]);
  // O caminho até o Pará
  for (let z = 11; z >= 4; z--) {
    const { pan } = fracaoDoCaminho(z);
    area(PARA.lng + pan * (v.lng - PARA.lng), PARA.lat + pan * (v.lat - PARA.lat), z, [-3, 3], [-4, 4]);
  }
  // Em volta de cada pin, para o mergulho ao tocar nele
  for (const p of pontosTuristicos()) {
    area(p.lng, p.lat, 15, [-2, 2], [-2, 3]);
    area(p.lng, p.lat, 16, [-2, 2], [-2, 3]);
  }
  const fila = [...urls];
  const trabalhador = async () => {
    while (fila.length) {
      while (filaPausada) await new Promise((ok) => setTimeout(ok, 500));
      const url = fila.shift();
      try {
        await fetch(url, { mode: 'cors', credentials: 'omit' });
      } catch {
        // sem internet: o mapa usa o que já está guardado
      }
    }
  };
  for (let i = 0; i < 4; i++) trabalhador();
}

// --- Câmera (usada pela transição) ------------------------------------------------
/** Distância da câmera do planeta Three.js (em raios) → zoom do MapLibre com o mesmo tamanho na tela */
export function zoomDaDistancia(dist, lat) {
  const C = telaH() / 2 / Math.tan((FOV / 2) * DEG);
  const raio = C / (dist - 1);
  return Math.log2((raio * 2 * Math.PI * Math.cos(lat * DEG)) / 512);
}

export function distanciaDoZoom(zoom, lat) {
  const C = telaH() / 2 / Math.tan((FOV / 2) * DEG);
  const raio = (512 * 2 ** zoom) / (2 * Math.PI * Math.cos(lat * DEG));
  return 1 + C / raio;
}

/** Zoom em que o planeta inteiro aparece, com folga, no lado menor da tela */
export function zoomDoPlaneta(lat) {
  const raio = Math.min(telaW(), telaH()) * 0.4;
  return Math.log2((raio * 2 * Math.PI * Math.cos(lat * DEG)) / 512);
}

/** Recuo do topo que deixa o foco da vista geral um pouco abaixo do meio da tela */
export const recuoDaVista = () => ({ top: telaH() * (vista().alturaDoFoco - 0.5) * 2, bottom: 0, left: 0, right: 0 });

export function prepararTransicao() {
  aquecendo = false;
  filaPausada = true; // a descida tem prioridade na internet
  mapa.stop();
  soltarLimites();
  fecharDetalhe({ voltar: false });
  pins.forEach((p) => gsap.set(p.el, { autoAlpha: 0 }));
}

export function camera({ lng, lat, zoom, pitch = 0, bearing = 0, recuo = 0 }) {
  const r = recuoDaVista();
  mapa.jumpTo({ center: [lng, lat], zoom, pitch, bearing, padding: { top: r.top * recuo, bottom: 0, left: 0, right: 0 } });
}

export function brilho(valor) {
  mapa.setPaintProperty('satelite', 'raster-brightness-max', valor);
}
export const BRILHO = { inicio: 1, fim: BRILHO_FINAL };

export function mostrarCamada(opacidade) {
  camada.style.opacity = opacidade;
}

/** Vista geral da cidade (fim da transição e "Voltar ao mapa") */
function irParaVista({ duracao = 2.2 } = {}) {
  const v = vista();
  const alvo = { center: [v.lng, v.lat], zoom: v.zoom, pitch: VISTA.pitch, bearing: VISTA.bearing, padding: recuoDaVista() };
  if (!duracao) return mapa.jumpTo(alvo);
  mapa.flyTo({ ...alvo, duration: duracao * 1000, curve: 1.3, essential: true });
}

// --- Pins ------------------------------------------------------------------------
// Disco creme com aro verde e uma ponta curta até o chão; o ícone do lugar vai por cima.
// Grade 64 × 72: o centro do disco fica em (32, 29), a ponta em (32, 71)
const SVG_PIN = `
  <svg class="pin__gota" viewBox="0 0 64 72" aria-hidden="true">
    <path class="pin__forma" d="M32 71 23.66 54.68A27 27 0 1 1 40.34 54.68Z"/>
  </svg>`;

function criarPins() {
  pins = pontosTuristicos().map((ponto) => {
    const el = document.createElement('div');
    el.className = 'pin';
    // "queda" leva o pin e o nome juntos: os dois entram ao mesmo tempo, sem nada solto
    el.innerHTML = `
      <span class="pin__chao" aria-hidden="true"></span>
      <span class="pin__onda" aria-hidden="true"></span>
      <button class="pin__alvo" data-id="${ponto.id}">
        <span class="pin__queda">
          <span class="pin__corpo">${SVG_PIN}<span class="pin__icone">${icone(iconeDoPonto(ponto))}</span></span>
          <span class="pin__nome"></span>
        </span>
      </button>`;
    const alvo = el.querySelector('.pin__alvo');
    ligarToque(alvo, () => abrirPonto(ponto));
    const marcador = new maplibregl.Marker({ element: el, anchor: 'center', pitchAlignment: 'viewport', rotationAlignment: 'viewport' })
      .setLngLat([ponto.lng, ponto.lat])
      .addTo(mapa);
    gsap.set(el, { autoAlpha: 0 });
    return { ponto, el, alvo, marcador, queda: el.querySelector('.pin__queda'), chao: el.querySelector('.pin__chao'), onda: el.querySelector('.pin__onda'), nome: el.querySelector('.pin__nome') };
  });
  escreverNomes();
}

/** Toque no pin: conta só se o dedo não arrastou o mapa */
function ligarToque(botao, aoTocar) {
  let x = 0;
  let y = 0;
  botao.addEventListener('pointerdown', (e) => ((x = e.clientX), (y = e.clientY)));
  botao.addEventListener('click', (e) => {
    if (Math.hypot(e.clientX - x, e.clientY - y) > PASSOS_SEM_MOVER && e.detail) return;
    aoTocar();
  });
}

function escreverNomes() {
  pins.forEach((p) => {
    p.nome.innerHTML = html(tr(p.ponto.nome));
    p.alvo.setAttribute('aria-label', tr(p.ponto.nome));
  });
  medirPins();
}

function medirPins() {
  pins.forEach((p) => {
    const corpo = p.el.querySelector('.pin__corpo');
    // Medidas a partir do local exato (a ponta da gota): o pin fica acima, o nome abaixo
    p.caixa = { w: Math.max(corpo.offsetWidth, p.nome.offsetWidth), cima: corpo.offsetHeight, baixo: p.nome.offsetTop + p.nome.offsetHeight - corpo.offsetHeight };
  });
  espalharPins();
}

/**
 * Segurança para telas estreitas: se dois pins encostarem, eles se afastam um pouco na tela
 * (o pin inteiro, com o ponto do chão junto, sem haste). Na vista geral, com os 4 pontos,
 * nenhum deles precisa se mexer.
 */
function espalharPins() {
  if (!pins.length || !pins[0].caixa) return;
  const pos = pins.map((p) => mapa.project([p.ponto.lng, p.ponto.lat]));
  const off = pins.map(() => ({ x: 0, y: 0 }));
  const folga = 10;
  for (let volta = 0; volta < 6; volta++) {
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const a = pins[i].caixa;
        const b = pins[j].caixa;
        const ax = pos[i].x + off[i].x;
        const bx = pos[j].x + off[j].x;
        const ay = pos[i].y + off[i].y;
        const by = pos[j].y + off[j].y;
        const sobraX = (a.w + b.w) / 2 + folga - Math.abs(ax - bx);
        const sobraY = Math.min(ay + a.baixo, by + b.baixo) - Math.max(ay - a.cima, by - b.cima) + folga;
        if (sobraX <= 0 || sobraY <= 0) continue;
        // Afasta pelo lado que precisa de menos deslocamento
        if (sobraX < sobraY * 1.4) {
          const s = ax < bx || (ax === bx && i < j) ? -1 : 1;
          off[i].x += (s * sobraX) / 2;
          off[j].x -= (s * sobraX) / 2;
        } else {
          const s = ay < by ? -1 : 1;
          off[i].y += (s * sobraY) / 2;
          off[j].y -= (s * sobraY) / 2;
        }
      }
    }
  }
  pins.forEach((p, i) => {
    const { x, y } = off[i];
    p.el.style.setProperty('--dx', `${x.toFixed(1)}px`);
    p.el.style.setProperty('--dy', `${y.toFixed(1)}px`);
  });
}

// Entrada: um pin de cada vez, de perto para longe. O ponto do chão acende, uma onda dourada
// corre no chão e o pin assenta em cima dele, com o nome logo depois
const ENTRADA_PINS = 0.9;
const INTERVALO_PINS = 0.16;
export const DURACAO_PINS = () => (menosMovimento() ? 0.6 : ENTRADA_PINS + INTERVALO_PINS * (pins.length - 1));

export function entrarPins() {
  medirPins();
  const tl = gsap.timeline();
  if (menosMovimento()) {
    pins.forEach((p) => tl.fromTo(p.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: 'sine.out' }, 0));
    return tl;
  }
  // Mais perto da câmera (mais embaixo na tela) primeiro
  const ordem = [...pins].sort((a, b) => mapa.project([b.ponto.lng, b.ponto.lat]).y - mapa.project([a.ponto.lng, a.ponto.lat]).y);
  ordem.forEach((p, i) => {
    const t0 = i * INTERVALO_PINS;
    tl.set(p.el, { autoAlpha: 1 }, t0)
      .fromTo(p.chao, { scale: 0 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, t0)
      .fromTo(p.onda, { scale: 0.4, autoAlpha: 0.9 }, { scale: 3.2, autoAlpha: 0, duration: 1.3, ease: 'expo.out' }, t0 + 0.05)
      .fromTo(p.queda, { y: -36, autoAlpha: 0, scale: 0.86 }, { y: 0, autoAlpha: 1, scale: 1, duration: ENTRADA_PINS, ease: EASE_ENTRA, clearProps: 'transform' }, t0 + 0.08)
      .fromTo(p.nome, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform' }, t0 + 0.3);
  });
  return tl;
}

// --- Entrada / saída da tela ---------------------------------------------------------
/** Fim da transição. O mapa continua parado: os gestos ficam desligados no totem */
export function liberarMapa() {
  filaPausada = false;
  travar();
  prenderLimites();
}

/** Vista da cidade: a câmera fica na região de Canaã (a descida do planeta precisa do mundo todo) */
function prenderLimites() {
  mapa.setMinZoom(LIMITES.zoomMin);
  mapa.setMaxZoom(LIMITES.zoomMax);
  mapa.setMaxBounds(LIMITES.area);
}
function soltarLimites() {
  mapa.setMaxBounds(null);
  mapa.setMinZoom(0);
  mapa.setMaxZoom(22);
}

export const imagensCarregadas = () => !mapa || mapa.areTilesLoaded();

/** Imagens da tela já carregadas? Espera o mapa ficar ocioso, no máximo "limite" ms */
export function esperarImagens(limite = 4000) {
  return new Promise((ok) => {
    if (imagensCarregadas()) return ok();
    const fim = setTimeout(() => (mapa.off('idle', pronto), ok()), limite);
    function pronto() {
      clearTimeout(fim);
      ok();
    }
    mapa.once('idle', pronto);
  });
}

/** Timeline de entrada (vai embutida na transição: nada aparece antes da hora) */
export function entrarMapa() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  const cab = tela.querySelector('.mapa__cabecalho');
  tl.set(tela, { autoAlpha: 1 }, 0)
    .set(cab, { autoAlpha: 1 }, 0)
    .set(cab.querySelectorAll('.mapa__sobretitulo, .mapa__titulo'), { autoAlpha: 0 }, 0)
    .add(surgir(cab.querySelector('.mapa__sobretitulo')), 0.1)
    .add(revelarLinhas(cab.querySelector('.mapa__titulo')), 0.2)
    .add(entrarPins(), 0);
  return tl;
}

/** Volta ao início: esconde tudo e deixa o mapa pronto para a próxima descida */
export function resetarMapa() {
  fecharStreetView();
  fecharDetalhe({ voltar: false });
  pins.forEach((p) => {
    p.el.classList.remove('visto');
    gsap.killTweensOf(p.el);
    gsap.set(p.el, { autoAlpha: 0 });
  });
  gsap.set(tela, { autoAlpha: 0 });
  mostrarCamada(0);
  if (!mapa) return;
  mapa.stop();
  soltarLimites();
  brilho(BRILHO.inicio);
  mapa.jumpTo({ center: [PARA.lng, PARA.lat], zoom: 2.4, pitch: 0, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } });
}

// --- Página do lugar ---------------------------------------------------------------------
// Abre por cima do mapa e rola para baixo, um bloco por vez:
// 1) abertura com a foto (100% da altura), 2) sobre o lugar e dados rápidos, 3) você sabia?
// (com o guia), 4) como chegar (QR Code e Street View), 5) outros lugares.
// A barra do topo (voltar ao mapa, início, idiomas) fica fixa enquanto a página rola.
const ICONE_SV = icone('streetview');
const VOLTA = icone('voltar');


let detalhe = null;
let rolagem = null;
let sv = null;
let svAssunto = null; // lugar aberto no Street View
let cameraSalva = null; // o mapa volta exatamente para cá
let lente = null; // disco do pin tocado na tela ({ x, y, r }): a página nasce dele e volta para ele
let veuMapa = null; // escurece o mapa atrás do cartão enquanto ele cresce
let trocando = false;
let observador = null;
const guia = { pai: null, depois: null }; // de onde o guia saiu (ele volta para lá ao fechar)
const qrs = new Map(); // QR Codes já gerados, por ponto

// Título de bloco: o mesmo texto do antigo rótulo, agora como título legível (Lora, escala h2)
const tituloBloco = (chave) => `<h2 class="titulo bloco__titulo" data-i18n="${chave}">${html(t(chave))}</h2>`;

function montarTela() {
  tela.innerHTML = `
    <header class="mapa__cabecalho">
      <p class="legenda mapa__sobretitulo"><span class="filete"></span><span data-i18n="locais.sobretitulo">${html(t('locais.sobretitulo'))}</span></p>
      <h2 class="mapa__titulo serif" data-i18n="mapa.titulo">${html(t('mapa.titulo'))}</h2>
    </header>`;

  detalhe = document.createElement('section');
  detalhe.className = 'detalhe';
  detalhe.setAttribute('aria-hidden', 'true');
  detalhe.innerHTML = `
    <div class="detalhe__rolagem">
      <header class="bloco abertura">
        <div class="abertura__fundo"></div>
        <p class="legenda abertura__legenda-foto" hidden></p>
        <div class="abertura__texto">
          <p class="legenda abertura__etiqueta"></p>
          <h1 class="titulo abertura__nome"></h1>
          <p class="abertura__frase"></p>
        </div>
        <button class="abertura__deslize" data-acao="deslize"><span class="legenda" data-i18n="detalhe.deslize">${html(t('detalhe.deslize'))}</span><span class="abertura__linha" aria-hidden="true"></span></button>
      </header>

      <section class="bloco bloco--claro sobre">
        <div class="bloco__dentro">
          ${tituloBloco('detalhe.sobre')}
          <p class="sobre__texto"></p>
          <ul class="sobre__dados"></ul>
        </div>
      </section>

      <section class="bloco bloco--verde sabia">
        <div class="bloco__dentro" data-contar>
          <div class="sabia__topo">
            ${tituloBloco('detalhe.voceSabia')}
            <div class="sabia__guia"></div>
          </div>
          <ul class="sabia__cards"></ul>
        </div>
      </section>

      <section class="bloco bloco--claro chegar">
        <div class="bloco__dentro">
          ${tituloBloco('detalhe.comoChegar')}
          <div class="chegar__grade">
            <figure class="chegar__qr">
              <img alt="QR Code" width="640" height="640" />
              <figcaption data-i18n="detalhe.qr">${html(t('detalhe.qr'))}</figcaption>
            </figure>
            <div class="chegar__sv">
              <h3 class="titulo chegar__sv-titulo">Street View</h3>
              <p class="chegar__sv-texto" data-i18n="detalhe.streetviewTexto">${html(t('detalhe.streetviewTexto'))}</p>
              <button class="botao botao--principal chegar__botao" data-acao="street-view">${ICONE_SV}<span data-i18n="mapa.streetview">${html(t('mapa.streetview'))}</span></button>
            </div>
          </div>
        </div>
      </section>

      <footer class="bloco bloco--escuro fim">
        <div class="bloco__dentro">
          ${tituloBloco('detalhe.outros')}
          <div class="fim__lugares">
            <button class="fim__lugar" data-acao="anterior">
              <span class="legenda fim__direcao">${VOLTA}<span data-i18n="detalhe.anterior">${html(t('detalhe.anterior'))}</span></span>
              <span class="titulo fim__nome"></span>
            </button>
            <button class="fim__lugar fim__lugar--proximo" data-acao="proximo">
              <span class="legenda fim__direcao"><span data-i18n="detalhe.proximo">${html(t('detalhe.proximo'))}</span>${SETA}</span>
              <span class="titulo fim__nome"></span>
            </button>
          </div>
          <button class="botao botao--principal fim__voltar" data-acao="voltar-mapa">${VOLTA}<span data-i18n="mapa.voltar">${html(t('mapa.voltar'))}</span></button>
        </div>
      </footer>
    </div>
    <div class="detalhe__progresso" aria-hidden="true"><i></i></div>`;
  document.getElementById('app').appendChild(detalhe);
  rolagem = detalhe.querySelector('.detalhe__rolagem');

  // Street View em tela cheia, com "Fechar" para voltar à página do lugar
  sv = document.createElement('div');
  sv.className = 'sv-tela';
  sv.setAttribute('aria-hidden', 'true');
  sv.innerHTML = `
    <div class="sv-tela__moldura"><div class="streetview"></div></div>
    <div class="sv-tela__barra">
      <p class="sv-tela__nome serif"></p>
      <div class="sv-tela__lugares"></div>
      <button class="botao botao--ouro sv-tela__fechar" data-acao="fechar-sv"><span data-i18n="detalhe.fechar">${html(t('detalhe.fechar'))}</span></button>
    </div>`;
  document.getElementById('app').appendChild(sv);

  // "Voltar ao mapa": no fim da página e na barra do topo (fixa enquanto rola)
  for (const b of [...detalhe.querySelectorAll('[data-acao="voltar-mapa"]'), document.querySelector('.barra-topo__voltar')]) {
    b.addEventListener('click', () => fecharDetalhe());
  }
  detalhe.querySelector('[data-acao="street-view"]').addEventListener('click', () => abrirStreetView());
  detalhe.querySelector('[data-acao="anterior"]').addEventListener('click', () => passar(-1));
  detalhe.querySelector('[data-acao="proximo"]').addEventListener('click', () => passar(1));
  detalhe.querySelector('[data-acao="deslize"]').addEventListener('click', () => {
    rolagem.scrollTo({ top: detalhe.querySelector('.sobre').offsetTop, behavior: 'smooth' });
  });
  rolagem.addEventListener('scroll', mostrarProgresso, { passive: true });
  sv.querySelector('[data-acao="fechar-sv"]').addEventListener('click', fecharStreetView);
  // Prefeitura e Lago: um botão para cada Street View
  sv.querySelector('.sv-tela__lugares').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lugar]');
    if (!b || !aberto) return;
    svAssunto = assuntosDe(aberto)[Number(b.dataset.lugar)];
    carregarStreetView();
  });
  window.addEventListener('resize', () => aberto && medirBarra());
}

/** Linha dourada fina à direita: quanto da página já rolou */
function mostrarProgresso() {
  const total = rolagem.scrollHeight - rolagem.clientHeight;
  const y = rolagem.scrollTop;
  detalhe.querySelector('.detalhe__progresso i').style.transform = `scaleY(${total > 0 ? (y / total).toFixed(4) : 0})`;
  // Abertura: a foto desce mais devagar que a página e o nome se apaga ao subir (só na primeira tela)
  if (menosMovimento() || y > innerHeight * 1.2) return;
  detalhe.querySelector('.abertura__fundo').style.transform = `translate3d(0, ${(y * 0.42).toFixed(1)}px, 0)`;
  detalhe.querySelector('.abertura__texto').style.opacity = Math.max(0, 1 - y / (innerHeight * 0.45)).toFixed(3);
}

/** Altura da barra fixa: os blocos param logo abaixo dela */
function medirBarra() {
  const barra = document.querySelector('.barra-topo');
  detalhe.style.setProperty('--barra-h', `${barra.offsetHeight}px`);
}

/** Foto da abertura (ou o espaço marcado "Foto em breve", se o lugar ainda não tem foto certa) */
function fotoDaAbertura(ponto) {
  if (ponto.foto) return `<img class="abertura__foto" src="${ponto.foto}" alt="" />`;
  return `<div class="abertura__sem-foto"><span class="legenda">${html(t('detalhe.semFoto'))}</span><span class="abertura__sem-foto-nome serif">${html(tr(ponto.nome))}</span></div>`;
}

const vizinho = (ponto, direcao) => {
  const lista = pontosTuristicos();
  return lista[(lista.indexOf(ponto) + direcao + lista.length) % lista.length];
};

/** Conteúdo da página (sem animação: usado também na troca de idioma) */
function preencherDetalhe(ponto) {
  const lista = pontosTuristicos();
  detalhe.setAttribute('aria-label', tr(ponto.nome));
  detalhe.querySelector('.abertura__fundo').innerHTML = fotoDaAbertura(ponto);
  const legenda = detalhe.querySelector('.abertura__legenda-foto');
  legenda.textContent = ponto.fotoProjeto ? t('detalhe.fotoProjeto') : '';
  legenda.hidden = !ponto.fotoProjeto;
  detalhe.querySelector('.abertura__etiqueta').textContent = `${dois(lista.indexOf(ponto) + 1)} / ${dois(lista.length)} · Canaã dos Carajás`;
  detalhe.querySelector('.abertura__nome').innerHTML = html(tr(ponto.nome));
  detalhe.querySelector('.abertura__frase').innerHTML = html(tr(ponto.frase));

  detalhe.querySelector('.sobre__texto').innerHTML = html(tr(ponto.descricao));
  const dados = (ponto.dados || []).slice(0, 3);
  const listaDados = detalhe.querySelector('.sobre__dados');
  listaDados.style.setProperty('--n', dados.length);
  listaDados.hidden = !dados.length;
  listaDados.innerHTML = dados.map((d) => `<li><span class="titulo sobre__valor">${html(tr(d.valor))}</span><span class="sobre__legenda">${html(tr(d.legenda))}</span></li>`).join('');

  const cur = (ponto.curiosidades || []).slice(0, 3);
  const cards = detalhe.querySelector('.sabia__cards');
  cards.style.setProperty('--n', cur.length);
  cards.innerHTML = cur.map((c) => `<li><p>${html(tr(c))}</p></li>`).join('');

  const [ant, prox] = [vizinho(ponto, -1), vizinho(ponto, 1)];
  detalhe.querySelector('[data-acao="anterior"] .fim__nome').innerHTML = html(tr(ant.nome));
  detalhe.querySelector('[data-acao="proximo"] .fim__nome').innerHTML = html(tr(prox.nome));
  mostrarQr(ponto);
}

/** QR Code "Como chegar" (Google Maps com o destino do pin), gerado no próprio totem */
async function mostrarQr(ponto) {
  const img = detalhe.querySelector('.chegar__qr img');
  img.dataset.destino = urlComoChegar(ponto);
  if (!qrs.has(ponto.id)) qrs.set(ponto.id, gerarQrComoChegar(ponto));
  const src = await qrs.get(ponto.id);
  if (aberto === ponto) img.src = src;
}

/** Os blocos não animam ao rolar; só avisa o guia quando "Você sabia?" aparece (uma vez por abertura) */
function prepararRevelacao() {
  observador?.disconnect();
  const sabia = detalhe.querySelector('[data-contar]');
  observador = new IntersectionObserver(
    (entradas) => {
      if (!entradas.some((e) => e.isIntersecting)) return;
      observador.disconnect();
      emitir('contar', detalhe.querySelector('.sabia__cards'));
    },
    { root: rolagem, threshold: 0.18 }
  );
  observador.observe(sabia);
}

/** O guia sai do canto do mapa e fica ao lado das curiosidades, como se estivesse contando */
function guiaNaPagina(sim) {
  const m = document.querySelector('.mascote');
  if (sim && m.parentElement !== detalhe.querySelector('.sabia__guia')) {
    guia.pai = m.parentElement;
    guia.depois = m.nextSibling;
    detalhe.querySelector('.sabia__guia').appendChild(m);
  } else if (!sim && guia.pai) {
    guia.pai.insertBefore(m, guia.depois);
    guia.pai = null;
  }
}

function marcarVisto(ponto) {
  pins.forEach((p) => p.el.classList.toggle('visto', p.ponto === ponto));
}

/** Abertura: sempre no topo */
function irParaOTopo() {
  rolagem.scrollTop = 0;
  mostrarProgresso();
  prepararRevelacao();
}

/** Toque no pin: zoom curto em direção a ele e, ao mesmo tempo, a página do lugar aparece */
function abrirPonto(ponto) {
  if (estado.tela !== 'locais' || estado.ocupado || aberto) return;
  aberto = ponto;
  marcarVisto(ponto);
  cameraSalva = { center: mapa.getCenter(), zoom: mapa.getZoom(), pitch: mapa.getPitch(), bearing: mapa.getBearing(), padding: mapa.getPadding() };

  preencherDetalhe(ponto);
  // A barra troca para o modo da página quando já sumiu (barraNaTroca)
  gsap.delayedCall(0.2, () => {
    if (aberto !== ponto) return;
    document.body.classList.add('detalhe-aberto');
    medirBarra();
  });
  detalhe.setAttribute('aria-hidden', 'false');
  irParaOTopo();
  guiaNaPagina(true);
  emitir('ponto', ponto);

  // O mapa mergulha no lugar: aproxima, inclina e contorna um pouco
  mapa.easeTo({
    center: [ponto.lng, ponto.lat],
    zoom: Math.min(mapa.getZoom() + ZOOM_APROXIMAR, LIMITES.zoomMax),
    pitch: LIMITES.inclinacao,
    bearing: mapa.getBearing() + GIRO_APROXIMAR,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
    duration: 1600,
    easing: (x) => 1 - (1 - x) ** 4,
    essential: true, // sem isto o MapLibre pula a animação com "menos movimento" ligado no Windows
  });
  gsap.killTweensOf(rolagem);
  gsap.set(rolagem, { autoAlpha: 1 });

  // A página nasce do disco do pin: vira um cartão com a foto e então ocupa a tela.
  // A foto começa ampliada no ponto do pin e assenta enquanto o cartão cresce
  const pin = pins.find((p) => p.ponto === ponto);
  lente = discoDoPin(pin);
  const foto = detalhe.querySelector('.abertura__fundo');
  if (!menosMovimento() && lente.x != null) {
    gsap.fromTo(foto, { scale: 1.45, transformOrigin: `${lente.x}px ${lente.y}px` }, { scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform,transformOrigin' });
  }
  morfarDoPin(detalhe, lente, { abrir: true });
  mapaAoFundo(true);
  barraNaTroca(1.2);
  entradaDaAbertura(0.95, { foto: false });
}

/** Centro e raio do disco do pin na tela (o SVG tem 64 × 72; o disco tem centro em 32,29 e raio 27) */
function discoDoPin(pin) {
  const c = pin?.el.querySelector('.pin__corpo');
  if (!c) return {};
  const r = c.getBoundingClientRect();
  const k = r.width / 64;
  return { x: r.left + 32 * k, y: r.top + 29 * k, r: 27 * k };
}

/** Atrás do cartão: o mapa escurece e os pins, o título e o guia saem de cena (e voltam no fim) */
function mapaAoFundo(sim) {
  if (!veuMapa) {
    veuMapa = document.createElement('div');
    veuMapa.className = 'mapa-veu-detalhe';
    document.getElementById('app').appendChild(veuMapa);
  }
  const dur = menosMovimento() ? 0.3 : 0.6;
  gsap.to(veuMapa, { autoAlpha: sim ? 1 : 0, duration: dur, ease: 'sine.inOut' });
  gsap.to([...pins.map((p) => p.el), tela.querySelector('.mapa__cabecalho')], { autoAlpha: sim ? 0 : 1, duration: dur * 0.7, ease: 'sine.inOut', delay: sim ? 0.1 : 0 });
}

/** A barra do topo troca de função (mapa ↔ página): some, troca e volta, sem pular na frente */
function barraNaTroca(volta) {
  const barra = document.querySelector('.barra-topo');
  gsap.killTweensOf(barra);
  gsap.to(barra, { autoAlpha: 0, duration: 0.2, ease: 'sine.in' });
  gsap.to(barra, { autoAlpha: 1, duration: 0.5, ease: 'sine.out', delay: volta });
}

/** Foto que assenta (zoom lento para trás) e textos da abertura em sequência */
function entradaDaAbertura(atraso = 0, { foto: comFoto = true } = {}) {
  const a = detalhe.querySelector('.abertura');
  const foto = a.querySelector('.abertura__foto, .abertura__sem-foto');
  gsap.set(a.querySelectorAll('.abertura__etiqueta, .abertura__nome, .abertura__frase, .abertura__deslize'), { autoAlpha: 0 });
  const tl = gsap.timeline({ delay: atraso });
  if (comFoto && foto && !menosMovimento()) tl.fromTo(foto, { scale: 1.16 }, { scale: 1, duration: 2.4, ease: EASE_ENTRA, clearProps: 'transform' }, -atraso);
  tl.add(surgir(a.querySelector('.abertura__etiqueta')), 0.1)
    .add(revelarLinhas(a.querySelector('.abertura__nome'), { duracao: 1.25 }), 0.2)
    .add(surgir(a.querySelector('.abertura__frase')), 0.6)
    .add(surgir(a.querySelector('.abertura__deslize'), { y: -10 }), 1.1);
  return tl;
}

/** Anterior / próximo: troca de lugar sem voltar ao mapa, e a página volta ao topo */
function passar(direcao) {
  if (!aberto || trocando) return;
  const ponto = vizinho(aberto, direcao);
  trocando = true;
  // Cortina de lado: a página atual some, e a foto do próximo lugar entra varrendo no sentido
  // do toque (próximo → da direita; anterior → da esquerda)
  const de = direcao > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
  gsap
    .timeline({ onComplete: () => (trocando = false) })
    .to(rolagem, { autoAlpha: 0, duration: menosMovimento() ? 0 : 0.4, ease: 'power2.in' })
    .add(() => {
      aberto = ponto;
      marcarVisto(ponto);
      preencherDetalhe(ponto);
      irParaOTopo();
      emitir('ponto', ponto);
      gsap.set(rolagem, { autoAlpha: 1 });
      if (!menosMovimento()) gsap.fromTo(detalhe.querySelector('.abertura__fundo'), { clipPath: de }, { clipPath: 'inset(0 0 0 0%)', duration: 1.2, ease: EASE_TROCA, clearProps: 'clipPath' });
      entradaDaAbertura(0.3);
    })
    .to({}, { duration: 1 });
}

/** "Voltar ao mapa": a página some com fade e o mapa volta exatamente como estava */
function fecharDetalhe({ voltar = true } = {}) {
  if (!aberto) return;
  aberto = null;
  trocando = false;
  observador?.disconnect();
  detalhe.setAttribute('aria-hidden', 'true');
  emitir('ponto', null);
  gsap.killTweensOf(rolagem);
  const sair = () => {
    document.body.classList.remove('detalhe-aberto');
    guiaNaPagina(false);
  };
  if (!voltar) {
    gsap.killTweensOf(detalhe);
    gsap.set(detalhe, { autoAlpha: 0, clearProps: 'clipPath' });
    if (veuMapa) gsap.set(veuMapa, { autoAlpha: 0 });
    gsap.set(tela.querySelector('.mapa__cabecalho'), { autoAlpha: 1 });
    sair();
    cameraSalva = null;
    return;
  }
  // A página volta a ser cartão e se recolhe no disco do pin; o mapa sobe de volta ao mesmo tempo
  barraNaTroca(1.15);
  const foto = detalhe.querySelector('.abertura__fundo');
  if (!menosMovimento() && lente?.x != null) {
    gsap.set(foto, { transformOrigin: `${lente.x}px ${lente.y + rolagem.scrollTop}px` });
    gsap.to(foto, { scale: 1.35, duration: 1.1, ease: 'power3.in', clearProps: 'transform,transformOrigin' });
  }
  morfarDoPin(detalhe, lente, { abrir: false }).eventCallback('onComplete', () => {
    gsap.set(detalhe, { autoAlpha: 0, clearProps: 'clipPath' });
    if (!aberto) sair();
  });
  gsap.delayedCall(0.2, () => !aberto && document.body.classList.remove('detalhe-aberto'));
  gsap.delayedCall(menosMovimento() ? 0 : 0.75, () => !aberto && mapaAoFundo(false));
  if (cameraSalva) mapa.easeTo({ ...cameraSalva, duration: 1300, easing: (x) => 1 - (1 - x) ** 3, essential: true });
  cameraSalva = null;
}

// --- Street View em tela cheia ---------------------------------------------------------
function abrirStreetView() {
  if (!aberto) return;
  svAssunto = assuntosDe(aberto)[0];
  sv.setAttribute('aria-hidden', 'false');
  carregarStreetView();
  // Abre a partir do botão tocado, como a página do lugar abre a partir do pin
  iris(sv, { abrir: true, ...centroDe(detalhe.querySelector('[data-acao="street-view"]')), duracao: 1.1 });
}

function carregarStreetView() {
  const lugares = assuntosDe(aberto);
  sv.querySelector('.sv-tela__nome').innerHTML = html(tr(lugares.length > 1 ? aberto.nome : svAssunto.nome));
  sv.querySelector('.sv-tela__lugares').innerHTML =
    lugares.length > 1
      ? lugares.map((l, i) => `<button class="botao botao--contorno-claro" data-lugar="${i}" aria-pressed="${l === svAssunto}">${html(tr(l.nome))}</button>`).join('')
      : '';
  streetview?.destruir();
  streetview = montarStreetView(sv.querySelector('.sv-tela__moldura'), svAssunto);
  streetview.carregar();
}

function fecharStreetView() {
  if (!sv || sv.getAttribute('aria-hidden') === 'true') return;
  sv.setAttribute('aria-hidden', 'true');
  gsap.to(sv, {
    autoAlpha: 0,
    duration: 0.5,
    ease: 'sine.inOut',
    onComplete: () => {
      streetview?.destruir();
      streetview = null;
      sv.querySelector('.streetview').innerHTML = '';
    },
  });
}

function aoMudarIdioma() {
  escreverNomes();
  if (!aberto) return;
  preencherDetalhe(aberto); // a rolagem fica onde estava
  medirBarra();
  if (svAssunto && sv.getAttribute('aria-hidden') === 'false') carregarStreetView();
}
