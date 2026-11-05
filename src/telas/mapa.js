// Mapa interativo da cidade (MapLibre GL, globo + satélite Esri).
// - É o mesmo mapa da transição: a câmera desce do planeta até Canaã e fica aqui.
// - Só os pontos turísticos (config.js) aparecem, como pins nas cores da Prefeitura.
// - Toque no pin: a câmera voa até o local e abre o painel; "Voltar ao mapa" volta à vista geral.
import * as maplibregl from 'maplibre-gl';
// O MapLibre procura o worker ao lado do próprio arquivo, e o Vite muda esse caminho: aponta direto
import urlDoWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import gsap from 'gsap';
import { estado, em } from '../core/estado.js';
import { t, tr, html } from '../core/i18n.js';
import { montarStreetView, pontosTuristicos } from '../componentes/streetview.js';

const DEG = Math.PI / 180;

// Mesmo campo de visão do planeta Three.js: os dois globos coincidem na troca
export const FOV = 35;

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

const ZOOM_DO_PIN = 16.4;
const PITCH_DO_PIN = 60;
const BRILHO_FINAL = 0.66; // satélite escurecido para os pins se destacarem
const PASSOS_SEM_MOVER = 8; // px: mais do que isso é arraste, não toque

const SATELITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ATRIBUICAO = 'Imagens © Esri, Maxar, Earthstar Geographics e comunidade de usuários GIS';

const camada = document.querySelector('.mapa-cidade');
const tela = document.querySelector('[data-tela="locais"]');
const SETA = '<svg class="seta" viewBox="0 0 28 16" aria-hidden="true"><path d="M0 8h26M19 1l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const dois = (n) => String(n).padStart(2, '0');

let mapa = null;
let pins = [];
let aberto = null; // ponto com o painel aberto
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
        // Cor de oceano: onde a imagem ainda não chegou (borda do globo), não aparece um buraco escuro
        { id: 'fundo', type: 'background', paint: { 'background-color': '#16324a' } },
        { id: 'satelite', type: 'raster', source: 'satelite', paint: { 'raster-fade-duration': 250, 'raster-saturation': -0.08 } },
      ],
    },
    center: [VISTA.lng, VISTA.lat],
    zoom: VISTA.zoom,
    pitch: VISTA.pitch,
    bearing: VISTA.bearing,
    maxPitch: 70,
    attributionControl: false,
    // Totem: sem rotação por mouse, sem inclinação por gesto, sem zoom por toque duplo
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    doubleClickZoom: false,
    keyboard: false,
    boxZoom: false,
    fadeDuration: 0,
    cancelPendingTileRequestsWhileZooming: false, // na descida, as imagens chegam mesmo com a câmera em movimento
    maxTileCacheSize: 600,
    renderWorldCopies: false,
  });
  mapa.setVerticalFieldOfView?.(FOV);
  mapa.addControl(new maplibregl.AttributionControl({ compact: false }), 'bottom-left');
  mapa.touchZoomRotate.disableRotation();
  travar(true);

  // Véu escuro com vinheta: fica entre a imagem e os pins
  const veu = document.createElement('div');
  veu.className = 'mapa-cidade__veu';
  mapa.getCanvasContainer().after(veu);

  criarPins();
  montarPainel();
  mapa.on('move', espalharPins);
  window.addEventListener('resize', () => estado.tela === 'locais' && !aberto && mapa && irParaVista({ duracao: 0 }));
  em('idioma', aoMudarIdioma);

  return new Promise((ok) => mapa.once('load', ok)).then(aquecerImagens);
}

export const getMapa = () => mapa;

/** Liga ou desliga os gestos do visitante (desligados durante a transição) */
function travar(sim) {
  for (const h of ['dragPan', 'scrollZoom', 'touchZoomRotate']) mapa[h][sim ? 'disable' : 'enable']();
  if (!sim) mapa.touchZoomRotate.disableRotation();
}

/** Limites da cidade para o visitante não se perder arrastando o mapa */
function limitar(sim) {
  if (!sim) {
    mapa.setMaxBounds(null);
    mapa.setMinZoom(0);
    return;
  }
  const lista = pontosTuristicos();
  const lngs = [VISTA.lng, ...lista.map((p) => p.lng)];
  const lats = [VISTA.lat, ...lista.map((p) => p.lat)];
  const folga = 0.05;
  mapa.setMaxBounds([
    [Math.min(...lngs) - folga, Math.min(...lats) - folga],
    [Math.max(...lngs) + folga, Math.max(...lats) + folga],
  ]);
  mapa.setMinZoom(12);
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
  const etapas = [
    () => irParaVista({ duracao: 0 }),
    ...pontosTuristicos().map((p) => () => mapa.jumpTo({ center: [p.lng, p.lat], zoom: ZOOM_DO_PIN, pitch: PITCH_DO_PIN, bearing: VISTA.bearing })),
    () => mapa.jumpTo({ center: [PARA.lng, PARA.lat], zoom: PARA.zoom, pitch: 0, bearing: 0 }),
    () => mapa.jumpTo({ center: [PARA.lng, PARA.lat], zoom: 2.4, pitch: 0, bearing: 0 }),
  ];
  for (const etapa of etapas) {
    if (!aquecendo) return;
    etapa();
    await ocioso();
  }
}

// --- Câmera (usada pela transição) ------------------------------------------------
/** Distância da câmera do planeta Three.js (em raios) → zoom do MapLibre com o mesmo tamanho na tela */
export function zoomDaDistancia(dist, lat) {
  const C = camada.clientHeight / 2 / Math.tan((FOV / 2) * DEG);
  const raio = C / (dist - 1);
  return Math.log2((raio * 2 * Math.PI * Math.cos(lat * DEG)) / 512);
}

export function distanciaDoZoom(zoom, lat) {
  const C = camada.clientHeight / 2 / Math.tan((FOV / 2) * DEG);
  const raio = (512 * 2 ** zoom) / (2 * Math.PI * Math.cos(lat * DEG));
  return 1 + C / raio;
}

/** Zoom em que o planeta inteiro aparece, com folga, no lado menor da tela */
export function zoomDoPlaneta(lat) {
  const raio = Math.min(camada.clientWidth, camada.clientHeight) * 0.4;
  return Math.log2((raio * 2 * Math.PI * Math.cos(lat * DEG)) / 512);
}

/** Recuo do topo que deixa o foco da vista geral um pouco abaixo do meio da tela */
export const recuoDaVista = () => ({ top: camada.clientHeight * (vista().alturaDoFoco - 0.5) * 2, bottom: 0, left: 0, right: 0 });

export function prepararTransicao() {
  aquecendo = false;
  mapa.stop();
  limitar(false);
  travar(true);
  fecharPainel({ voltar: false });
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
const SVG_PIN = `
  <svg class="pin__gota" viewBox="0 0 64 80" aria-hidden="true">
    <path class="pin__forma" d="M32 78C32 78 4 47 4 30a28 28 0 0 1 56 0c0 17-28 48-28 48Z"/>
    <circle class="pin__miolo" cx="32" cy="30" r="17"/>
  </svg>`;

function criarPins() {
  pins = pontosTuristicos().map((ponto, i) => {
    const el = document.createElement('div');
    el.className = 'pin';
    el.innerHTML = `
      <span class="pin__chao" aria-hidden="true"><i class="pin__onda"></i></span>
      <span class="pin__haste" aria-hidden="true"></span>
      <button class="pin__alvo" data-id="${ponto.id}">
        <span class="pin__corpo">${SVG_PIN}<span class="pin__num serif">${dois(i + 1)}</span></span>
        <span class="pin__nome"></span>
      </button>`;
    const alvo = el.querySelector('.pin__alvo');
    ligarToque(alvo, () => abrirPonto(ponto));
    const marcador = new maplibregl.Marker({ element: el, anchor: 'center', pitchAlignment: 'viewport', rotationAlignment: 'viewport' })
      .setLngLat([ponto.lng, ponto.lat])
      .addTo(mapa);
    gsap.set(el, { autoAlpha: 0 });
    return { ponto, el, alvo, marcador, nome: el.querySelector('.pin__nome'), haste: el.querySelector('.pin__haste'), onda: el.querySelector('.pin__onda'), dx: 0, dy: 0 };
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
 * Pins muito próximos (ex.: Prefeitura e lago) se afastam na tela, cada um com uma haste fina
 * apontando para o lugar exato. Quando o zoom aumenta e eles se separam, voltam ao lugar.
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
    const comprimento = Math.hypot(x, y);
    p.haste.style.width = `${comprimento.toFixed(1)}px`;
    p.haste.style.transform = `rotate(${Math.atan2(y, x)}rad)`;
    p.haste.style.opacity = comprimento > 6 ? '1' : '0';
    p.el.classList.toggle('afastado', comprimento > 6);
  });
}

/** Pins entram um por um: caem do alto, quicam e a onda dourada começa a pulsar */
export function entrarPins() {
  medirPins();
  const tl = gsap.timeline();
  pins.forEach((p, i) => {
    const corpo = p.el.querySelector('.pin__corpo');
    const at = i * 0.2;
    tl.set(p.el, { autoAlpha: 1 }, at)
      .fromTo(corpo, { y: -70, scale: 0.6, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.75, ease: 'back.out(2.2)', transformOrigin: '50% 100%' }, at)
      .fromTo(p.el.querySelector('.pin__chao'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'power2.out' }, at + 0.35)
      .fromTo(p.nome, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, at + 0.4)
      .add(() => pulsar(p, i * 0.35), at + 0.5);
  });
  return tl;
}

/** Onda no chão (GSAP: o modo "menos movimento" do Windows desliga animações CSS) */
function pulsar(p, atraso) {
  gsap.killTweensOf(p.onda);
  gsap.fromTo(p.onda, { scale: 0.4, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 2.2, ease: 'power1.out', repeat: -1, delay: atraso });
}

// --- Entrada / saída da tela ---------------------------------------------------------
/** Fim da transição: o visitante já pode mexer no mapa */
export function liberarMapa() {
  limitar(true);
  travar(false);
}

/** Timeline de entrada (vai embutida na transição: nada aparece antes da hora) */
export function entrarMapa() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.set(tela, { autoAlpha: 1 }, 0).fromTo(tela.querySelector('.mapa__cabecalho'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.4).add(entrarPins(), 0);
  return tl;
}

/** Volta ao início: esconde tudo e deixa o mapa pronto para a próxima descida */
export function resetarMapa() {
  fecharStreetView();
  fecharPainel({ voltar: false });
  pins.forEach((p) => {
    gsap.killTweensOf([p.onda, p.el]);
    gsap.set(p.el, { autoAlpha: 0 });
  });
  gsap.set(tela, { autoAlpha: 0 });
  mostrarCamada(0);
  if (!mapa) return;
  mapa.stop();
  travar(true);
  limitar(false);
  brilho(BRILHO.inicio);
  mapa.jumpTo({ center: [PARA.lng, PARA.lat], zoom: 2.4, pitch: 0, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 } });
}

// --- Painel do ponto -----------------------------------------------------------------
function montarPainel() {
  tela.innerHTML = `
    <header class="mapa__cabecalho">
      <p class="legenda mapa__sobretitulo"><span class="filete"></span><span data-i18n="locais.sobretitulo">${html(t('locais.sobretitulo'))}</span></p>
      <h2 class="mapa__titulo serif" data-i18n="mapa.titulo">${html(t('mapa.titulo'))}</h2>
    </header>

    <aside class="painel" aria-hidden="true">
      <div class="painel__rolagem">
        <figure class="painel__foto"><img alt="" /></figure>
        <p class="legenda painel__sobre"></p>
        <h2 class="painel__nome"></h2>
        <p class="painel__descricao"></p>
        <div class="painel__bloco-curiosidades">
          <p class="legenda painel__titulo"><span class="filete"></span><span data-i18n="local.curiosidades">${html(t('local.curiosidades'))}</span></p>
          <ol class="painel__curiosidades"></ol>
        </div>
      </div>
      <div class="painel__acoes">
        <button class="botao botao--ouro painel__sv" data-acao="street-view">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.6" fill="currentColor"/><path d="M9.5 9.5h5l1 6h-2l-.6 6h-2.8l-.6-6h-2z" fill="currentColor"/><ellipse cx="12" cy="21" rx="8" ry="2" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>
          <span data-i18n="mapa.streetview">${html(t('mapa.streetview'))}</span>
        </button>
        <button class="botao botao--contorno-escuro painel__voltar" data-acao="voltar-mapa">
          ${SETA}<span data-i18n="mapa.voltar">${html(t('mapa.voltar'))}</span>
        </button>
      </div>
    </aside>

`;

  // Street View fica fora da tela do mapa: precisa cobrir também a barra do topo e o mascote
  sv = document.createElement('div');
  sv.className = 'sv-tela';
  sv.setAttribute('aria-hidden', 'true');
  sv.innerHTML = `
    <div class="sv-tela__moldura"><div class="streetview"></div></div>
    <div class="sv-tela__barra">
      <p class="sv-tela__nome serif"></p>
      <button class="botao botao--ouro" data-acao="fechar-sv">${SETA}<span data-i18n="mapa.voltarPainel">${html(t('mapa.voltarPainel'))}</span></button>
    </div>`;
  document.getElementById('app').appendChild(sv);

  tela.querySelector('[data-acao="voltar-mapa"]').addEventListener('click', () => fecharPainel());
  tela.querySelector('[data-acao="street-view"]').addEventListener('click', abrirStreetView);
  sv.querySelector('[data-acao="fechar-sv"]').addEventListener('click', fecharStreetView);
}

let sv = null;
const painel = () => tela.querySelector('.painel');
const retrato = () => innerHeight > innerWidth;

function preencherPainel(ponto) {
  const p = painel();
  const lista = pontosTuristicos();
  const img = p.querySelector('.painel__foto img');
  p.querySelector('.painel__foto').hidden = !ponto.foto;
  if (ponto.foto && img.getAttribute('src') !== ponto.foto) img.src = ponto.foto;
  p.querySelector('.painel__sobre').textContent = `${dois(lista.indexOf(ponto) + 1)} / ${dois(lista.length)}`;
  p.querySelector('.painel__nome').innerHTML = html(tr(ponto.nome));
  p.querySelector('.painel__descricao').innerHTML = html(tr(ponto.descricao));
  const curiosidades = ponto.curiosidades || [];
  p.querySelector('.painel__bloco-curiosidades').hidden = !curiosidades.length;
  p.querySelector('.painel__curiosidades').innerHTML = curiosidades
    .map((c, i) => `<li><span class="painel__num serif">${dois(i + 1)}</span><p>${html(tr(c))}</p></li>`)
    .join('');
}

/**
 * Espaço que o painel ocupa: a câmera centraliza o local na parte livre do mapa.
 * Usa a posição de layout (sem transform): na hora do cálculo, o painel ainda está entrando
 */
function recuoDoPainel() {
  const p = painel();
  const topo = parseFloat(getComputedStyle(tela.querySelector('.mapa__cabecalho')).top) || 0;
  return retrato()
    ? { top: topo * 0.6, bottom: p.offsetHeight, left: 0, right: 0 }
    : { top: topo * 0.6, bottom: 0, left: 0, right: innerWidth - p.offsetLeft };
}

function abrirPonto(ponto) {
  if (estado.tela !== 'locais' || estado.ocupado) return;
  const trocando = !!aberto;
  aberto = ponto;
  pins.forEach((p) => p.el.classList.toggle('ativo', p.ponto === ponto));
  document.body.classList.add('painel-aberto');

  const p = painel();
  const conteudo = p.querySelector('.painel__rolagem');
  const mostrar = () => {
    preencherPainel(ponto);
    conteudo.scrollTop = 0;
  };
  p.setAttribute('aria-hidden', 'false');
  gsap.killTweensOf([p, conteudo]);
  if (trocando) {
    gsap.timeline().to(conteudo, { autoAlpha: 0, duration: 0.2 }).add(mostrar).to(conteudo, { autoAlpha: 1, duration: 0.45 });
  } else {
    mostrar();
    gsap.set(conteudo, { autoAlpha: 1 });
    const de = retrato() ? { yPercent: 105, xPercent: 0 } : { xPercent: 105, yPercent: 0 };
    gsap.fromTo(p, { ...de, autoAlpha: 1 }, { xPercent: 0, yPercent: 0, duration: 0.9, ease: 'expo.out' });
    gsap.fromTo(tela.querySelector('.mapa__cabecalho'), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.3 });
  }

  mapa.flyTo({
    center: [ponto.lng, ponto.lat],
    zoom: ZOOM_DO_PIN,
    pitch: PITCH_DO_PIN,
    bearing: mapa.getBearing(),
    padding: recuoDoPainel(),
    duration: 2200,
    curve: 1.25,
    essential: true, // sem isto o MapLibre pula a animação com "menos movimento" ligado no Windows
  });
}

function fecharPainel({ voltar = true } = {}) {
  if (!aberto) return;
  aberto = null;
  pins.forEach((p) => p.el.classList.remove('ativo'));
  document.body.classList.remove('painel-aberto');
  const p = painel();
  p.setAttribute('aria-hidden', 'true');
  gsap.killTweensOf(p);
  if (!voltar) {
    gsap.set(p, { autoAlpha: 0 });
    return;
  }
  const para = retrato() ? { yPercent: 105 } : { xPercent: 105 };
  gsap.to(p, { ...para, duration: 0.6, ease: 'power3.in', onComplete: () => gsap.set(p, { autoAlpha: 0 }) });
  gsap.to(tela.querySelector('.mapa__cabecalho'), { autoAlpha: 1, duration: 0.6, delay: 0.5 });
  irParaVista();
}

// --- Street View em tela cheia ---------------------------------------------------------
function abrirStreetView() {
  if (!aberto) return;
  sv.querySelector('.sv-tela__nome').innerHTML = html(tr(aberto.nome));
  sv.setAttribute('aria-hidden', 'false');
  streetview?.destruir();
  streetview = montarStreetView(sv.querySelector('.sv-tela__moldura'), aberto);
  streetview.carregar();
  gsap.fromTo(sv, { autoAlpha: 0, scale: 1.03 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
}

function fecharStreetView() {
  if (!sv || sv.getAttribute('aria-hidden') === 'true') return;
  sv.setAttribute('aria-hidden', 'true');
  gsap.to(sv, {
    autoAlpha: 0,
    duration: 0.4,
    ease: 'power2.out',
    onComplete: () => {
      streetview?.destruir();
      streetview = null;
      sv.querySelector('.streetview').innerHTML = '';
    },
  });
}

function aoMudarIdioma() {
  escreverNomes();
  if (aberto) preencherPainel(aberto);
  if (aberto && sv.getAttribute('aria-hidden') === 'false') {
    sv.querySelector('.sv-tela__nome').innerHTML = html(tr(aberto.nome));
    streetview?.destruir();
    streetview = montarStreetView(sv.querySelector('.sv-tela__moldura'), aberto);
    streetview.carregar();
  }
}
