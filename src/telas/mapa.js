// Mapa interativo da cidade (MapLibre GL, globo + satélite Esri).
// - É o mesmo mapa da transição: a câmera desce do planeta até Canaã e fica aqui.
// - Os pins e as páginas saem de data/lugares.json: um lugar novo no arquivo aparece sozinho.
//   Produção: só os publicados. Modo de edição (?edicao): os rascunhos também, marcados.
// - Toque no pin: o mapa dá um zoom curto em direção ao pin e a página do lugar aparece
//   (rola para baixo, em blocos). "Voltar ao mapa" devolve o mapa como estava.
// - Totem: depois que os pins entram, o mapa fica parado (sem arrastar nem zoom), para o
//   visitante acertar o pin com o dedo.
import * as maplibregl from 'maplibre-gl';
// O MapLibre procura o worker ao lado do próprio arquivo, e o Vite muda esse caminho: aponta direto
import urlDoWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import gsap from 'gsap';
import { estado, em, emitir } from '../core/estado.js';
import { t, tr, html } from '../core/i18n.js';
import { montarStreetView, assuntosDe, linkStreetView } from '../componentes/streetview.js';
import { lugaresVisiveis, lugaresNoMapa, rascunhos, publicado, temPosicao, numeroDe, textoDe, modoEdicao, nomeDaCategoria } from '../core/lugares.js';
import { gerarQrComoChegar, urlComoChegar } from '../componentes/qrcode.js';
import { montarAntesAgora, paresDe } from '../componentes/antes-agora.js';
import { montarGaleria, fotosDoLugar } from '../componentes/galeria.js';
import { temInternet } from '../core/rede.js';
import { registrarErro, registrarUso } from '../core/registro.js';
import { preCarregar } from '../util/preload.js';
import { montarNarracao } from '../componentes/narracao.js';
import { calmo } from '../core/acessibilidade.js';

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

const ZOOM_APROXIMAR = 1.3; // zoom curto em direção ao pin, enquanto a tela do lugar aparece
const FADE_DETALHE = 0.7; // s: a página do lugar aparece e some com fade
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
// Camadas locais (sem internet), geradas por "npm run mapa-offline": ficam embaixo do satélite.
// Com internet o satélite cobre tudo; sem internet (ou enquanto uma imagem não chega), aparece o
// planeta da NASA e, perto da cidade, as ruas, rios e matas do OpenStreetMap
const PASTA = location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
const MUNDO_LOCAL = `${PASTA}assets/mapa/mundo/{z}/{x}/{y}.webp`;
const CIDADE_LOCAL = `${PASTA}assets/mapa/cidade.geojson`;
const ATRIBUICAO_LOCAL = '© colaboradores do OpenStreetMap · NASA Blue Marble';
const largura = (min, max) => ['interpolate', ['exponential', 1.6], ['zoom'], 11, min, 17, max];
const CAMADAS_CIDADE = [
  { id: 'osm-campo', type: 'fill', filter: ['==', ['get', 'c'], 'campo'], paint: { 'fill-color': '#6f6b40', 'fill-opacity': 0.55 } },
  { id: 'osm-mata', type: 'fill', filter: ['==', ['get', 'c'], 'mata'], paint: { 'fill-color': '#3c5530', 'fill-opacity': 0.85 } },
  { id: 'osm-cidade', type: 'fill', filter: ['==', ['get', 'c'], 'cidade'], paint: { 'fill-color': '#7d6a4e', 'fill-opacity': 0.55 } },
  { id: 'osm-parque', type: 'fill', filter: ['==', ['get', 'c'], 'parque'], paint: { 'fill-color': '#56763b', 'fill-opacity': 0.9 } },
  { id: 'osm-agua', type: 'fill', filter: ['==', ['get', 'c'], 'agua'], paint: { 'fill-color': '#3b5654' } },
  { id: 'osm-rio', type: 'line', filter: ['==', ['get', 'c'], 'rio'], paint: { 'line-color': '#3b5654', 'line-width': largura(1, 5) } },
  { id: 'osm-rua', type: 'line', filter: ['==', ['get', 'c'], 'rua'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#a8946f', 'line-width': largura(0.4, 4) } },
  { id: 'osm-via-media', type: 'line', filter: ['==', ['get', 'c'], 'via-media'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#cdb88f', 'line-width': largura(0.9, 7) } },
  { id: 'osm-via-principal', type: 'line', filter: ['==', ['get', 'c'], 'via-principal'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#e0c27c', 'line-width': largura(1.4, 10) } },
].map((c) => ({ ...c, source: 'cidade-local', minzoom: 9 }));

const camada = document.querySelector('.mapa-cidade');
const tela = document.querySelector('[data-tela="locais"]');
const SETA = '<svg class="seta" viewBox="0 0 28 16" aria-hidden="true"><path d="M0 8h26M19 1l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
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
        'mundo-local': { type: 'raster', tiles: [MUNDO_LOCAL], tileSize: 256, maxzoom: 4, attribution: ATRIBUICAO_LOCAL },
        'cidade-local': { type: 'geojson', data: CIDADE_LOCAL, attribution: ATRIBUICAO_LOCAL },
        satelite: { type: 'raster', tiles: [SATELITE], tileSize: 256, maxzoom: 19, attribution: ATRIBUICAO },
      },
      layers: [
        // Onde a imagem ainda não chegou: oceano no planeta, cor do chão perto da cidade
        { id: 'fundo', type: 'background', paint: { 'background-color': ['interpolate', ['linear'], ['zoom'], 6, COR_OCEANO, 9, COR_CHAO] } },
        // Mapa local: o planeta some aos poucos perto da cidade, onde as ruas do OSM aparecem
        { id: 'mundo-local', type: 'raster', source: 'mundo-local', paint: { 'raster-fade-duration': 0, 'raster-opacity': ['interpolate', ['linear'], ['zoom'], 9, 1, 12, 0] } },
        ...CAMADAS_CIDADE,
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
  mapa.on('move', arrumarPins);
  // Fundo da camada na cor do chão só perto da cidade: no planeta, ela é transparente
  const perto = () => camada.classList.toggle('perto', mapa.getZoom() >= 9);
  mapa.on('zoom', perto);
  perto();
  window.addEventListener('resize', () => estado.tela === 'locais' && !aberto && mapa && irParaVista({ duracao: 0 }));
  em('idioma', aoMudarIdioma);

  return new Promise((ok) => mapa.once('load', ok)).then(aquecerImagens);
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
  const etapas = [
    () => irParaVista({ duracao: 0 }),
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
const SVG_PIN = `
  <svg class="pin__gota" viewBox="0 0 64 80" aria-hidden="true">
    <path class="pin__forma" d="M32 78C32 78 4 47 4 30a28 28 0 0 1 56 0c0 17-28 48-28 48Z"/>
    <circle class="pin__miolo" cx="32" cy="30" r="17"/>
  </svg>`;

function criarPins() {
  pins = lugaresNoMapa().map((ponto) => {
    const el = document.createElement('div');
    el.className = 'pin';
    el.classList.toggle('pin--rascunho', !publicado(ponto));
    // "queda" leva o pin e o nome juntos: os dois entram ao mesmo tempo, sem nada solto
    el.innerHTML = `
      <span class="pin__chao" aria-hidden="true"><i class="pin__onda"></i></span>
      <button class="pin__alvo" data-id="${ponto.id}">
        <span class="pin__queda">
          <span class="pin__corpo">${SVG_PIN}<span class="pin__num serif">${dois(numeroDe(ponto))}</span></span>
          <span class="pin__nome"></span>
        </span>
      </button>`;
    const alvo = el.querySelector('.pin__alvo');
    const p = { ponto, el, alvo, grupo: null, dentro: false, queda: el.querySelector('.pin__queda'), chao: el.querySelector('.pin__chao'), nome: el.querySelector('.pin__nome'), onda: el.querySelector('.pin__onda') };
    // Pin agrupado (vários lugares muito perto): abre a lista para escolher
    ligarToque(alvo, () => (p.grupo ? abrirEscolha(p.grupo) : abrirPonto(ponto)));
    p.marcador = new maplibregl.Marker({ element: el, anchor: 'center', pitchAlignment: 'viewport', rotationAlignment: 'viewport' })
      .setLngLat([ponto.longitude, ponto.latitude])
      .addTo(mapa);
    gsap.set(el, { autoAlpha: 0 });
    return p;
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

function nomeDoPin(p) {
  // Filtro "Obras da gestão": o nome vem com o ano de entrega
  const ano = filtro === 'obras' && p.ponto.obra?.ano ? ` · ${p.ponto.obra.ano}` : '';
  const nome = tr(p.ponto.nome) + ano;
  const rascunho = publicado(p.ponto) ? '' : `${t('edicao.rascunho')} · `;
  // Grupo: o nome do primeiro lugar e quantos mais há ali ("Prefeitura e Lago +2")
  return p.grupo ? `${rascunho}${nome} +${p.grupo.length - 1}` : `${rascunho}${nome}`;
}

function escreverNomes() {
  pins.forEach((p) => {
    p.nome.innerHTML = html(nomeDoPin(p));
    const nomes = p.grupo ? p.grupo.map((l) => tr(l.nome)).join(', ') : tr(p.ponto.nome);
    p.alvo.setAttribute('aria-label', nomes);
  });
  arrumarPins();
}

/**
 * Com muitos lugares, nada se encosta, em três passos:
 * 1) pins quase no mesmo lugar viram um pin só, com "+N" no nome; o toque abre uma lista grande
 *    para escolher o lugar (o pin de número menor fica, os outros entram nele);
 * 2) pins que só encostam se afastam um pouco na tela (o pin inteiro, com o ponto do chão junto),
 *    no máximo AFASTAR_MAX px. Na vista geral, o Lago dos Buritis e o Parque do Mirante já usam isso.
 *    Se, mesmo afastados, dois pins ainda se encostam, eles também viram um grupo;
 * 3) se uma etiqueta ainda encostar em outro pin ou etiqueta, ela some (fica o pin com o número,
 *    com a mesma área de toque, e o nome continua no leitor de tela). Quem tem número menor fica.
 */
const AFASTAR_MAX = 90; // px
function arrumarPins() {
  if (!pins.length || !mapa) return;
  const corpo = pins[0].el.querySelector('.pin__corpo');
  const w = corpo.offsetWidth;
  const h = corpo.offsetHeight;
  if (!w) return; // ainda sem layout
  const pos = pins.map((p) => mapa.project([p.ponto.longitude, p.ponto.latitude]));
  // Medidas a partir do local exato (a ponta da gota): o pin fica acima, o nome abaixo
  const medir = (i) => {
    const n = pins[i].nome;
    return { w: Math.max(w, n.offsetWidth), nw: n.offsetWidth, nh: n.offsetHeight, topo: n.offsetTop - h, baixo: n.offsetTop + n.offsetHeight - h };
  };

  // 1) Grupos pela distância; "junto" guarda os pares que o passo 2 não conseguiu separar
  const junto = new Map();
  let lideres;
  let grupos;
  let off;
  let caixa;
  for (let tentativa = 0; tentativa < pins.length; tentativa++) {
    lideres = [];
    grupos = new Map();
    pins.forEach((p, i) => {
      if (!passaFiltro(p.ponto)) return; // fora do filtro: some, sem entrar em grupo
      const lider = junto.has(i) ? junto.get(i) : lideres.find((j) => Math.abs(pos[j].x - pos[i].x) < w * 0.75 && Math.abs(pos[j].y - pos[i].y) < h * 0.6);
      const raiz = lider === undefined ? i : grupos.has(lider) ? lider : [...grupos.keys()].find((k) => grupos.get(k).includes(pins[lider].ponto));
      if (raiz === i) {
        lideres.push(i);
        grupos.set(i, [p.ponto]);
      } else grupos.get(raiz).push(p.ponto);
    });
    // O nome do grupo ("+N") muda a largura da etiqueta: escreve antes de medir
    pins.forEach((p, i) => {
      const grupo = grupos.has(i) && grupos.get(i).length > 1 ? grupos.get(i) : null;
      if ((grupo?.length || 0) !== (p.grupo?.length || 0)) {
        p.grupo = grupo;
        p.nome.innerHTML = html(nomeDoPin(p));
      }
      p.grupo = grupo;
    });
    caixa = new Map(lideres.map((i) => [i, medir(i)]));

    // 2) Afastar: pelo lado que precisa de menos deslocamento
    off = new Map(lideres.map((i) => [i, { x: 0, y: 0 }]));
    const folga = 10;
    for (let volta = 0; volta < 6; volta++) {
      for (let a = 0; a < lideres.length; a++) {
        for (let b = a + 1; b < lideres.length; b++) {
          const [i, j] = [lideres[a], lideres[b]];
          const [A, B] = [caixa.get(i), caixa.get(j)];
          const ax = pos[i].x + off.get(i).x;
          const bx = pos[j].x + off.get(j).x;
          const ay = pos[i].y + off.get(i).y;
          const by = pos[j].y + off.get(j).y;
          const sobraX = (A.w + B.w) / 2 + folga - Math.abs(ax - bx);
          const sobraY = Math.min(ay + A.baixo, by + B.baixo) - Math.max(ay - h, by - h) + folga;
          if (sobraX <= 0 || sobraY <= 0) continue;
          if (sobraX < sobraY * 1.4) {
            const s = ax < bx || (ax === bx && i < j) ? -1 : 1;
            off.get(i).x += (s * sobraX) / 2;
            off.get(j).x -= (s * sobraX) / 2;
          } else {
            const s = ay < by ? -1 : 1;
            off.get(i).y += (s * sobraY) / 2;
            off.get(j).y -= (s * sobraY) / 2;
          }
        }
      }
    }
    const limitar = (v) => Math.max(-AFASTAR_MAX, Math.min(AFASTAR_MAX, v));
    for (const o of off.values()) [o.x, o.y] = [limitar(o.x), limitar(o.y)];

    // Ainda encostam (os corpos dos pins)? O de número maior entra no grupo do outro e refaz
    let encostam = null;
    for (let a = 0; a < lideres.length && !encostam; a++) {
      for (let b = a + 1; b < lideres.length; b++) {
        const [i, j] = [lideres[a], lideres[b]];
        const dx = Math.abs(pos[i].x + off.get(i).x - pos[j].x - off.get(j).x);
        const dy = Math.abs(pos[i].y + off.get(i).y - pos[j].y - off.get(j).y);
        if (dx < w + 4 && dy < h + 4) {
          encostam = [i, j];
          break;
        }
      }
    }
    if (!encostam) break;
    junto.set(encostam[1], encostam[0]);
  }

  pins.forEach((p, i) => {
    p.dentro = !grupos.has(i);
    p.el.classList.toggle('pin--dentro', p.dentro);
    p.el.classList.toggle('pin--grupo', !!p.grupo);
    const o = off.get(i) || { x: 0, y: 0 };
    p.el.style.setProperty('--dx', `${o.x.toFixed(1)}px`);
    p.el.style.setProperty('--dy', `${o.y.toFixed(1)}px`);
  });

  // 3) Etiquetas: os corpos dos pins são obstáculos; cada etiqueta só entra se couber
  const toca = (a, b) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4;
  const ponto = (i) => ({ x: pos[i].x + off.get(i).x, y: pos[i].y + off.get(i).y });
  const ocupados = lideres.map((i) => ({ x: ponto(i).x - w / 2, y: ponto(i).y - h, w, h, dono: i }));
  for (const i of lideres) {
    const c = caixa.get(i);
    const r = { x: ponto(i).x - c.nw / 2, y: ponto(i).y + c.topo, w: c.nw, h: c.nh };
    const cabe = !ocupados.some((o) => o.dono !== i && toca(r, o));
    pins[i].el.classList.toggle('pin--sem-nome', !cabe);
    if (cabe) ocupados.push({ ...r, dono: i });
  }
}

// Entrada: 150 ms entre um pin e outro. Cada um cai do alto, toca o chão e dá um quique curto
const INTERVALO_PINS = 0.15;
const QUEDA = 0.46;
export const DURACAO_PINS = () => (pins.length - 1) * INTERVALO_PINS + QUEDA + 0.34;

/** Pins entram um por um, já com o nome: caem, assentam com um quique leve e a onda pulsa */
export function entrarPins() {
  const tl = gsap.timeline();
  const alto = -Math.max(90, innerHeight * 0.08);
  pins.forEach((p, i) => {
    const at = i * INTERVALO_PINS;
    tl.set(p.el, { autoAlpha: 1 }, at)
      .fromTo(p.queda, { y: alto, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: QUEDA, ease: 'power2.in', immediateRender: true }, at)
      .to(p.queda, { y: -9, duration: 0.15, ease: 'power2.out' }, at + QUEDA)
      .to(p.queda, { y: 0, duration: 0.19, ease: 'power2.in' }, at + QUEDA + 0.15)
      .fromTo(p.chao, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'power2.out' }, at + QUEDA - 0.05)
      .add(() => pulsar(p, i * 0.3), at + QUEDA + 0.34);
  });
  return tl;
}

/** Onda no chão: pulsa devagar, sem sair do lugar (GSAP: o modo "menos movimento" do Windows desliga CSS) */
function pulsar(p, atraso) {
  gsap.killTweensOf(p.onda);
  if (calmo()) return gsap.set(p.onda, { opacity: 0 });
  gsap.fromTo(p.onda, { scale: 0.8, opacity: 0.55 }, { scale: 2, opacity: 0, duration: 2.6, ease: 'sine.out', repeat: -1, repeatDelay: 0.6, delay: atraso });
}

// --- Entrada / saída da tela ---------------------------------------------------------
/** Fim da transição. O mapa continua parado: os gestos ficam desligados no totem */
export function liberarMapa() {
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
  tl.set(tela, { autoAlpha: 1 }, 0)
    .fromTo(tela.querySelector('.mapa__cabecalho'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.4)
    .fromTo(tela.querySelector('.filtros'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.9)
    .add(entrarPins(), 0);
  return tl;
}

/** Volta ao início: esconde tudo e deixa o mapa pronto para a próxima descida */
export function resetarMapa() {
  fecharEscolha();
  if (filtro) aplicarFiltro(null); // o próximo visitante vê todos os lugares
  fecharStreetView();
  fecharDetalhe({ voltar: false });
  pins.forEach((p) => {
    p.el.classList.remove('visto');
    gsap.killTweensOf([p.onda, p.el, p.queda, p.chao]);
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
const ICONE_SV = '<svg class="icone-sv" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.6" fill="currentColor"/><path d="M9.5 9.5h5l1 6h-2l-.6 6h-2.8l-.6-6h-2z" fill="currentColor"/><ellipse cx="12" cy="21" rx="8" ry="2" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>';
const VOLTA = SETA.replace('class="seta"', 'class="seta seta--volta"');
const ABAIXO = '<svg class="seta-baixo" viewBox="0 0 16 28" aria-hidden="true"><path d="M8 0v26M1 19l7 7 7-7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

let detalhe = null;
let rolagem = null;
let sv = null;
let svAssunto = null; // lugar aberto no Street View
let cameraSalva = null; // o mapa volta exatamente para cá
let trocando = false;
let observador = null;
let setaDeslize = null;
const guia = { pai: null, depois: null }; // de onde o guia saiu (ele volta para lá ao fechar)
const qrs = new Map(); // QR Codes já gerados, por ponto
let antesAgora = null; // comparador do lugar aberto
let galeria = null; // fotos do lugar em tela cheia (no lugar do Street View, sem internet)
let narracao = null; // botão "Ouvir", texto da fala e vídeo em Libras
let visita = null; // lugar aberto agora, para o logs/uso.csv: { id, inicio, audio, libras }
const ICONE_FOTOS = '<svg class="icone-sv" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8.5" cy="10" r="1.8" fill="currentColor"/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

const rotulo = (chave) => `<p class="legenda bloco__rotulo"><span class="filete"></span><span data-i18n="${chave}">${html(t(chave))}</span></p>`;

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
          <h2 class="abertura__nome serif"></h2>
          <p class="abertura__frase"></p>
        </div>
        <button class="abertura__deslize" data-acao="deslize"><span class="legenda" data-i18n="detalhe.deslize">${html(t('detalhe.deslize'))}</span>${ABAIXO}</button>
      </header>

      <section class="bloco bloco--claro sobre">
        <div class="bloco__dentro" data-revelar>
          ${rotulo('detalhe.sobre')}
          <p class="sobre__texto"></p>
          <ul class="sobre__dados"></ul>
        </div>
      </section>

      <section class="bloco bloco--escuro antes">
        <div class="bloco__dentro" data-revelar data-antes>
          ${rotulo('detalhe.antesAgora')}
          <div class="antes__palco"></div>
          <p class="antes__legenda"></p>
          <div class="antes__miniaturas"></div>
        </div>
      </section>

      <section class="bloco bloco--verde sabia">
        <div class="bloco__dentro" data-revelar data-contar>
          <div class="sabia__topo">
            <h3 class="bloco__titulo serif" data-i18n="detalhe.voceSabia">${html(t('detalhe.voceSabia'))}</h3>
            <div class="sabia__guia"></div>
          </div>
          <ol class="sabia__cards"></ol>
        </div>
      </section>

      <section class="bloco bloco--claro chegar">
        <div class="bloco__dentro" data-revelar>
          ${rotulo('detalhe.comoChegar')}
          <div class="chegar__grade">
            <figure class="chegar__qr">
              <img alt="QR Code" width="640" height="640" />
              <figcaption data-i18n="detalhe.qr">${html(t('detalhe.qr'))}</figcaption>
            </figure>
            <div class="chegar__sv">
              <h3 class="bloco__titulo serif chegar__sv-titulo"></h3>
              <p class="chegar__sv-texto"></p>
              <button class="botao botao--ouro chegar__botao" data-acao="street-view"></button>
            </div>
          </div>
        </div>
      </section>

      <footer class="bloco bloco--escuro fim">
        <div class="bloco__dentro" data-revelar>
          ${rotulo('detalhe.outros')}
          <div class="fim__lugares">
            <button class="fim__lugar" data-acao="anterior">
              <span class="legenda fim__direcao">${VOLTA}<span data-i18n="detalhe.anterior">${html(t('detalhe.anterior'))}</span></span>
              <span class="fim__nome serif"></span>
            </button>
            <button class="fim__lugar fim__lugar--proximo" data-acao="proximo">
              <span class="legenda fim__direcao"><span data-i18n="detalhe.proximo">${html(t('detalhe.proximo'))}</span>${SETA}</span>
              <span class="fim__nome serif"></span>
            </button>
          </div>
          <button class="botao botao--ouro fim__voltar" data-acao="voltar-mapa">${VOLTA}<span data-i18n="mapa.voltar">${html(t('mapa.voltar'))}</span></button>
        </div>
      </footer>
    </div>
    <div class="detalhe__progresso" aria-hidden="true"><i></i></div>
    <div class="dock">
      <button class="dock__botao" data-acao="ouvir" hidden></button>
      <button class="dock__botao" data-acao="libras" hidden></button>
      <button class="dock__botao dock__voltar" data-acao="voltar-mapa">${VOLTA}<span data-i18n="mapa.voltarCurto">${html(t('mapa.voltarCurto'))}</span></button>
    </div>`;
  document.getElementById('app').appendChild(detalhe);
  rolagem = detalhe.querySelector('.detalhe__rolagem');
  narracao = montarNarracao(detalhe);

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
  detalhe.querySelector('[data-acao="street-view"]').addEventListener('click', () => (extraDe(aberto) === 'sv' ? abrirStreetView() : galeria.abrir(aberto)));
  galeria = montarGaleria(document.getElementById('app'));
  // A internet caiu ou voltou com uma página aberta: o botão troca entre Street View e galeria
  em('rede', () => aberto && mostrarExtra(aberto));
  // A narração (Etapa 4) avisa quando tocou, para o logs/uso.csv
  em('uso', (o) => visita && Object.assign(visita, o));
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
  montarEscolha();
  montarFiltros();
  montarEdicao();
  window.addEventListener('resize', posicionarFiltros);
}

// --- Vários lugares num pin só: lista grande para escolher -----------------------------
let escolha = null;
let grupoAberto = null;

function montarEscolha() {
  escolha = document.createElement('div');
  escolha.className = 'escolha';
  escolha.setAttribute('role', 'dialog');
  escolha.setAttribute('aria-hidden', 'true');
  escolha.innerHTML = `
    <p class="legenda escolha__titulo"><span class="filete"></span><span data-i18n="mapa.escolha">${html(t('mapa.escolha'))}</span></p>
    <div class="escolha__lista"></div>
    <button class="botao botao--contorno-escuro escolha__fechar" data-acao="fechar-escolha"><span data-i18n="detalhe.fechar">${html(t('detalhe.fechar'))}</span></button>`;
  tela.appendChild(escolha);
  escolha.addEventListener('click', (e) => {
    if (e.target.closest('[data-acao="fechar-escolha"]')) return fecharEscolha();
    const b = e.target.closest('[data-lugar]');
    const ponto = b && grupoAberto?.find((l) => l.id === b.dataset.lugar);
    if (ponto) abrirPonto(ponto);
  });
}

function escreverEscolha() {
  escolha.querySelector('.escolha__lista').innerHTML = grupoAberto
    .map((l) => `<button class="escolha__lugar" data-lugar="${l.id}"><span class="escolha__num serif">${dois(numeroDe(l))}</span><span class="escolha__nome">${html(tr(l.nome))}</span></button>`)
    .join('');
}

function abrirEscolha(grupo) {
  if (estado.tela !== 'locais' || estado.ocupado || aberto) return;
  grupoAberto = grupo;
  escreverEscolha();
  escolha.setAttribute('aria-hidden', 'false');
  gsap.killTweensOf(escolha);
  gsap.fromTo(escolha, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' });
}

function fecharEscolha() {
  if (!escolha || !grupoAberto) return;
  grupoAberto = null;
  escolha.setAttribute('aria-hidden', 'true');
  gsap.killTweensOf(escolha);
  gsap.to(escolha, { autoAlpha: 0, duration: 0.3, ease: 'sine.in' });
}

// --- Filtros do mapa: "Todos", "Obras da gestão" e, com muitos lugares, as categorias -------
// "Obras da gestão" mostra só os lugares com "obra": { "entregue": true, "ano": ... }, com o ano no nome.
let filtro = null; // null = todos; 'obras'; ou o id de uma categoria
let barraFiltros = null;
const ICONE_OK = '<svg class="filtros__ok" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

function passaFiltro(l) {
  if (!filtro) return true;
  if (filtro === 'obras') return !!l.obra?.entregue;
  return l.categoria === filtro;
}

/** Botões que fazem sentido agora (um filtro que não mostraria nada não aparece) */
function opcoesDeFiltro() {
  const lugares = lugaresNoMapa();
  const opcoes = [];
  if (lugares.some((l) => l.obra?.entregue)) opcoes.push({ id: 'obras', nome: t('mapa.obras') });
  const aPartir = estado.dados.config.filtroCategoriasAPartirDe ?? 8;
  if (lugares.length >= aPartir) {
    const usadas = [...new Set(lugares.map((l) => l.categoria))];
    for (const id of usadas) opcoes.push({ id, nome: tr(nomeDaCategoria(id)) });
  }
  return opcoes.length ? [{ id: '', nome: t('mapa.todos') }, ...opcoes] : [];
}

function montarFiltros() {
  barraFiltros = document.createElement('nav');
  barraFiltros.className = 'filtros';
  tela.appendChild(barraFiltros);
  barraFiltros.addEventListener('click', (e) => {
    const b = e.target.closest('[data-filtro]');
    if (b) aplicarFiltro(b.dataset.filtro || null);
  });
  escreverFiltros();
}

function escreverFiltros() {
  if (!barraFiltros) return;
  const opcoes = opcoesDeFiltro();
  barraFiltros.hidden = !opcoes.length;
  barraFiltros.setAttribute('aria-label', t('mapa.filtrar'));
  barraFiltros.innerHTML = opcoes
    .map((o) => {
      const ativo = (filtro || '') === o.id;
      return `<button class="filtros__botao" data-filtro="${o.id}" aria-pressed="${ativo}">${ativo ? ICONE_OK : ''}<span>${html(o.nome)}</span></button>`;
    })
    .join('');
  requestAnimationFrame(posicionarFiltros);
}

/** Os filtros ficam na mesma linha do botão de acessibilidade, logo à direita dele */
function posicionarFiltros() {
  const a11y = document.querySelector('.a11y-botao');
  if (!barraFiltros || !a11y) return;
  barraFiltros.style.left = `${Math.round(a11y.getBoundingClientRect().right + 14)}px`;
}

function aplicarFiltro(id) {
  if (filtro === id) return;
  fecharEscolha();
  filtro = id;
  escreverFiltros();
  escreverNomes();
  // Os pins que voltam entram com um fade curto (nada pisca de uma vez)
  pins.forEach((p) => !p.dentro && gsap.fromTo(p.alvo, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'sine.out', clearProps: 'opacity,visibility' }));
}

// --- Modo de edição (?edicao): rascunhos sem posição no mapa ficam numa lista -------------
let painelEdicao = null;

function montarEdicao() {
  if (!modoEdicao) return;
  painelEdicao = document.createElement('aside');
  painelEdicao.className = 'edicao';
  tela.appendChild(painelEdicao);
  escreverEdicao();
  painelEdicao.addEventListener('click', (e) => {
    if (e.target.closest('[data-acao="lista-rascunhos"]')) {
      painelEdicao.classList.toggle('aberto');
      return escreverEdicao();
    }
    const b = e.target.closest('[data-lugar]');
    const ponto = b && lugaresVisiveis().find((l) => l.id === b.dataset.lugar);
    if (ponto) abrirPonto(ponto);
  });
}

function escreverEdicao() {
  if (!painelEdicao) return;
  // Fechado: só o título e o botão. Aberto: a lista dos rascunhos sem posição (não cobre os pins)
  const semPin = rascunhos().filter((l) => !temPosicao(l));
  const aberto = painelEdicao.classList.contains('aberto');
  painelEdicao.innerHTML = `
    <p class="legenda edicao__titulo">${html(t('edicao.titulo'))} · ${rascunhos().length} ${html(t('edicao.rascunhos'))}</p>
    ${semPin.length ? `<button class="edicao__lugar edicao__abrir" data-acao="lista-rascunhos" aria-expanded="${aberto}">${html(t(aberto ? 'detalhe.fechar' : 'edicao.semPosicao'))} (${semPin.length})</button>` : ''}
    ${aberto ? `<div class="edicao__lista">${semPin.map((l) => `<button class="edicao__lugar" data-lugar="${l.id}">${html(tr(l.nome))}</button>`).join('')}</div>` : ''}`;
}

/** Linha dourada fina à direita: quanto da página já rolou */
function mostrarProgresso() {
  const total = rolagem.scrollHeight - rolagem.clientHeight;
  detalhe.querySelector('.detalhe__progresso i').style.transform = `scaleY(${total > 0 ? (rolagem.scrollTop / total).toFixed(4) : 0})`;
}

/** Altura da barra fixa: os blocos param logo abaixo dela */
function medirBarra() {
  const barra = document.querySelector('.barra-topo');
  detalhe.style.setProperty('--barra-h', `${barra.offsetHeight}px`);
}

/** Foto da abertura (ou o espaço marcado "Foto em breve", se o lugar ainda não tem foto certa) */
function fotoDaAbertura(ponto) {
  const foto = ponto.foto?.arquivo;
  // Duas larguras (npm run imagens gera as duas): o navegador escolhe a do tamanho da tela
  const sm = /-capa.webp$/.test(foto) ? foto.replace(/.webp$/, '-sm.webp') : '';
  const srcset = sm ? ` srcset="${sm} 800w, ${foto} 1600w" sizes="100vw"` : '';
  if (foto) return `<img class="abertura__foto" src="${foto}"${srcset} alt="${html(tr(ponto.foto.alt))}" decoding="async" />`;
  return `<div class="abertura__sem-foto"><span class="legenda">${html(t('detalhe.semFoto'))}</span><span class="abertura__sem-foto-nome serif">${html(tr(ponto.nome))}</span></div>`;
}

/** Foto que não carregou (arquivo faltando): vira o espaço "Foto em breve", sem imagem quebrada */
function fotoFaltando(img, ponto) {
  img.addEventListener('error', () => {
    if (aberto !== ponto) return;
    // Primeiro tenta sem a versão menor; se a grande também faltar, mostra "Foto em breve"
    if (img.srcset) {
      registrarErro('foto', img.currentSrc || img.srcset);
      img.removeAttribute('srcset');
      img.src = ponto.foto.arquivo;
      return;
    }
    registrarErro('foto', img.getAttribute('src'));
    img.parentElement.innerHTML = fotoDaAbertura({ ...ponto, foto: null });
    detalhe.querySelector('.abertura__legenda-foto').hidden = true;
  });
}

/** Legenda da foto: "Imagem ilustrativa do projeto" ou o crédito */
function legendaDaFoto(ponto) {
  const f = ponto.foto;
  if (!f?.arquivo) return '';
  if (f.ilustracao_do_projeto) return t('detalhe.fotoProjeto');
  return f.credito ? `${t('detalhe.foto')}: ${f.credito}` : '';
}

const vizinho = (ponto, direcao) => {
  const lista = lugaresVisiveis();
  return lista[(lista.indexOf(ponto) + direcao + lista.length) % lista.length];
};

/** Conteúdo da página (sem animação: usado também na troca de idioma). Bloco sem conteúdo some */
function preencherDetalhe(ponto) {
  const lista = lugaresNoMapa();
  detalhe.setAttribute('aria-label', tr(ponto.nome));
  detalhe.classList.toggle('detalhe--rascunho', !publicado(ponto));
  detalhe.querySelector('.abertura__fundo').innerHTML = fotoDaAbertura(ponto);
  const img = detalhe.querySelector('.abertura__foto');
  if (img) fotoFaltando(img, ponto);
  const legenda = detalhe.querySelector('.abertura__legenda-foto');
  legenda.textContent = legendaDaFoto(ponto);
  legenda.hidden = !legenda.textContent;
  legenda.classList.toggle('credito', !ponto.foto?.ilustracao_do_projeto);
  const n = numeroDe(ponto);
  const rascunho = publicado(ponto) ? '' : `${t('edicao.rascunho')} · `;
  detalhe.querySelector('.abertura__etiqueta').textContent = `${rascunho}${n ? `${dois(n)} / ${dois(lista.length)} · ` : ''}${t('detalhe.cidade')}`;
  detalhe.querySelector('.abertura__nome').innerHTML = html(tr(ponto.nome));
  detalhe.querySelector('.abertura__frase').innerHTML = html(textoDe(ponto, 'frase'));

  const descricao = textoDe(ponto, 'descricao');
  const dados = textoDe(ponto, 'dados').slice(0, 3);
  detalhe.querySelector('.sobre').hidden = !descricao && !dados.length;
  detalhe.querySelector('.sobre__texto').innerHTML = html(descricao);
  const listaDados = detalhe.querySelector('.sobre__dados');
  listaDados.style.setProperty('--n', dados.length);
  listaDados.hidden = !dados.length;
  listaDados.innerHTML = dados.map((d) => `<li><span class="sobre__valor serif">${html(d.valor)}</span><span class="sobre__legenda">${html(d.legenda)}</span></li>`).join('');

  // Antes e agora: só aparece se o lugar tiver pelo menos um par de fotos
  const pares = paresDe(ponto);
  detalhe.querySelector('.antes').hidden = !pares.length;
  antesAgora?.destruir();
  antesAgora = pares.length ? montarAntesAgora(detalhe.querySelector('.antes .bloco__dentro'), ponto) : null;

  const cur = textoDe(ponto, 'curiosidades').slice(0, 3);
  detalhe.querySelector('.sabia').hidden = !cur.length;
  const cards = detalhe.querySelector('.sabia__cards');
  cards.style.setProperty('--n', cur.length);
  cards.innerHTML = cur.map((c, i) => `<li><span class="sabia__num serif">${dois(i + 1)}</span><p>${html(c)}</p></li>`).join('');

  // Como chegar: o QR precisa da posição; o Street View, de um link (ou da chave e da posição)
  const qr = temPosicao(ponto);
  detalhe.querySelector('.chegar__qr').hidden = !qr;
  mostrarExtra(ponto);

  const unico = lugaresVisiveis().length < 2;
  detalhe.querySelector('.fim__lugares').hidden = unico;
  if (!unico) {
    const [ant, prox] = [vizinho(ponto, -1), vizinho(ponto, 1)];
    detalhe.querySelector('[data-acao="anterior"] .fim__nome').innerHTML = html(tr(ant.nome));
    detalhe.querySelector('[data-acao="proximo"] .fim__nome').innerHTML = html(tr(prox.nome));
  }
  if (qr) mostrarQr(ponto);
}

/**
 * Extra do "Como chegar": Street View (precisa de internet e de um link, ou da chave do Google)
 * ou, sem isso, a galeria de fotos do lugar. Sem nenhum dos dois, o espaço some.
 */
function extraDe(ponto) {
  const sv = temPosicao(ponto) && assuntosDe(ponto).some((a) => linkStreetView(a));
  if (sv && temInternet()) return 'sv';
  return fotosDoLugar(ponto).length ? 'galeria' : null;
}

function mostrarExtra(ponto) {
  const extra = extraDe(ponto);
  const caixa = detalhe.querySelector('.chegar__sv');
  caixa.hidden = !extra;
  detalhe.querySelector('.chegar').hidden = !extra && !temPosicao(ponto);
  if (!extra) return;
  const sv = extra === 'sv';
  caixa.querySelector('.chegar__sv-titulo').textContent = sv ? 'Street View' : t('detalhe.galeria');
  caixa.querySelector('.chegar__sv-texto').innerHTML = html(t(sv ? 'detalhe.streetviewTexto' : 'detalhe.galeriaTexto'));
  caixa.querySelector('.chegar__botao').innerHTML = `${sv ? ICONE_SV : ICONE_FOTOS}<span>${html(t(sv ? 'mapa.streetview' : 'detalhe.verFotos'))}</span>`;
}

/** Fim de uma visita a um lugar: uma linha no logs/uso.csv (sem nada que identifique a pessoa) */
function encerrarVisita() {
  if (!visita) return;
  registrarUso({ lugar: visita.id, idioma: estado.idioma, audio: visita.audio, libras: visita.libras, segundos: (performance.now() - visita.inicio) / 1000 });
  visita = null;
}

function comecarVisita(ponto) {
  encerrarVisita();
  visita = { id: ponto.id, inicio: performance.now(), audio: false, libras: false };
  // Fotos dos lugares vizinhos (anterior e próximo) já vêm carregando
  preCarregar([vizinho(ponto, 1).foto?.arquivo, vizinho(ponto, -1).foto?.arquivo]);
}

/** QR Code "Como chegar" (Google Maps com o destino do pin), gerado no próprio totem */
async function mostrarQr(ponto) {
  const img = detalhe.querySelector('.chegar__qr img');
  img.dataset.destino = urlComoChegar(ponto);
  img.alt = `QR Code · ${t('detalhe.comoChegar')}: ${tr(ponto.nome)}`;
  if (!qrs.has(ponto.id)) qrs.set(ponto.id, gerarQrComoChegar(ponto));
  const src = await qrs.get(ponto.id);
  if (aberto === ponto) img.src = src;
}

/** Cada bloco aparece com fade e leve subida quando entra na tela (uma vez por abertura) */
function prepararRevelacao() {
  observador?.disconnect();
  const blocos = [...detalhe.querySelectorAll('[data-revelar]')];
  gsap.killTweensOf(blocos);
  gsap.set(blocos, { autoAlpha: 0, y: calmo() ? 0 : 28 });
  observador = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        observador.unobserve(e.target);
        gsap.to(e.target, { autoAlpha: 1, y: 0, duration: calmo() ? 0.01 : 0.9, ease: 'power2.out' });
        if (e.target.hasAttribute('data-contar')) emitir('contar', detalhe.querySelector('.sabia__cards'));
        if (e.target.hasAttribute('data-antes')) antesAgora?.dica();
      }
    },
    { root: rolagem, threshold: 0.18 }
  );
  blocos.forEach((b) => observador.observe(b));
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

/** Abertura: sempre no topo, com a seta "deslize para baixo" balançando devagar */
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
  comecarVisita(ponto);
  cameraSalva = { center: mapa.getCenter(), zoom: mapa.getZoom(), pitch: mapa.getPitch(), bearing: mapa.getBearing(), padding: mapa.getPadding() };

  preencherDetalhe(ponto);
  narracao.preparar(ponto);
  document.body.classList.add('detalhe-aberto');
  medirBarra();
  detalhe.setAttribute('aria-hidden', 'false');
  irParaOTopo();
  guiaNaPagina(true);
  emitir('ponto', ponto);
  setaDeslize?.kill();
  setaDeslize = calmo() ? null : gsap.fromTo(detalhe.querySelector('.seta-baixo'), { y: -3 }, { y: 7, duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  fecharEscolha();
  // Rascunho sem posição (só no modo de edição): a página abre sem mexer no mapa
  if (temPosicao(ponto)) {
    mapa.easeTo({
      center: [ponto.longitude, ponto.latitude],
      zoom: mapa.getZoom() + ZOOM_APROXIMAR,
      duration: FADE_DETALHE * 1000 + 300,
      easing: (x) => 1 - (1 - x) ** 3,
      essential: true, // sem isto o MapLibre pula a animação com "menos movimento" ligado no Windows
    });
  }
  gsap.killTweensOf([detalhe, rolagem]);
  gsap.set(rolagem, { autoAlpha: 1 });
  gsap.fromTo(detalhe, { autoAlpha: 0 }, { autoAlpha: 1, duration: calmo() ? 0.15 : FADE_DETALHE, ease: 'sine.inOut' });
  gsap.fromTo(detalhe.querySelector('.abertura__texto'), { y: 18 }, { y: 0, duration: FADE_DETALHE + 0.3, ease: 'power3.out' });
}

/** Anterior / próximo: troca de lugar sem voltar ao mapa, e a página volta ao topo */
function passar(direcao) {
  if (!aberto || trocando) return;
  const ponto = vizinho(aberto, direcao);
  trocando = true;
  gsap
    .timeline({ onComplete: () => (trocando = false) })
    .to(rolagem, { autoAlpha: 0, duration: 0.35, ease: 'sine.in' })
    .add(() => {
      aberto = ponto;
      marcarVisto(ponto);
      comecarVisita(ponto);
      preencherDetalhe(ponto);
      narracao.preparar(ponto);
      irParaOTopo();
      emitir('ponto', ponto);
    })
    .to(rolagem, { autoAlpha: 1, duration: 0.5, ease: 'sine.out' });
}

/** "Voltar ao mapa": a página some com fade e o mapa volta exatamente como estava */
function fecharDetalhe({ voltar = true } = {}) {
  if (!aberto) return;
  encerrarVisita();
  galeria?.fechar();
  emitir('sair-do-lugar');
  aberto = null;
  trocando = false;
  observador?.disconnect();
  setaDeslize?.kill();
  detalhe.setAttribute('aria-hidden', 'true');
  emitir('ponto', null);
  gsap.killTweensOf([detalhe, rolagem]);
  const sair = () => {
    document.body.classList.remove('detalhe-aberto');
    guiaNaPagina(false);
  };
  if (!voltar) {
    gsap.set(detalhe, { autoAlpha: 0 });
    sair();
    cameraSalva = null;
    return;
  }
  // O guia e a barra voltam ao normal só depois do fade (nada pula na frente da pessoa)
  gsap.to(detalhe, { autoAlpha: 0, duration: FADE_DETALHE, ease: 'sine.inOut', onComplete: () => !aberto && sair() });
  if (cameraSalva) mapa.easeTo({ ...cameraSalva, duration: FADE_DETALHE * 1000 + 300, easing: (x) => 1 - (1 - x) ** 3, essential: true });
  cameraSalva = null;
}

// --- Street View em tela cheia ---------------------------------------------------------
function abrirStreetView() {
  if (!aberto) return;
  svAssunto = assuntosDe(aberto)[0];
  sv.setAttribute('aria-hidden', 'false');
  carregarStreetView();
  gsap.fromTo(sv, { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE_DETALHE, ease: 'sine.inOut' });
}

function carregarStreetView() {
  const lugares = assuntosDe(aberto);
  sv.querySelector('.sv-tela__nome').innerHTML = html(tr(lugares.length > 1 ? aberto.nome : svAssunto.nome));
  sv.querySelector('.sv-tela__lugares').innerHTML =
    lugares.length > 1
      ? lugares.map((l, i) => `<button class="botao botao--contorno-claro" data-lugar="${i}" aria-pressed="${l === svAssunto}">${html(tr(l.nome))}</button>`).join('')
      : '';
  streetview?.destruir();
  streetview = montarStreetView(sv.querySelector('.sv-tela__moldura'), svAssunto, {
    aoFalhar: (motivo) => {
      registrarErro('street-view', `${aberto?.id}: ${motivo}`);
      const lugar = aberto;
      fecharStreetView();
      if (lugar && fotosDoLugar(lugar).length) galeria.abrir(lugar);
      if (lugar) mostrarExtra(lugar);
    },
  });
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
  escreverEdicao();
  escreverFiltros();
  galeria?.atualizar();
  if (grupoAberto) escreverEscolha();
  if (!aberto) return;
  preencherDetalhe(aberto); // a rolagem fica onde estava
  medirBarra();
  if (svAssunto && sv.getAttribute('aria-hidden') === 'false') carregarStreetView();
}
