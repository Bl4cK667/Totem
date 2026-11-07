// Gera as camadas LOCAIS do mapa (funcionam sem internet), uma vez só:
//   npm run mapa-offline
// 1) Planeta: tiles do "Blue Marble" da NASA (domínio público), a partir da textura que o totem
//    já usa no planeta (assets/img/globo/terra-dia.webp) → assets/mapa/mundo/{z}/{x}/{y}.webp
// 2) Cidade: ruas, rios, lagos e áreas verdes do OpenStreetMap (© colaboradores do OpenStreetMap,
//    licença ODbL: pode guardar e usar offline, inclusive comercialmente, com o crédito)
//    → assets/mapa/cidade.geojson. Precisa de internet só na hora de gerar.
// As imagens de satélite (Esri) continuam sendo usadas quando há internet, por cima destas camadas.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const SAIDA = 'assets/mapa';
const ZOOM_MUNDO = 4; // a textura tem 2048 px de largura: mais que isso só amplia
// Região da cidade (um pouco maior que a área que a câmera mostra) e região das estradas
const CIDADE = { s: -6.62, w: -49.95, n: -6.44, e: -49.76 };
const REGIAO = { s: -6.9, w: -50.25, n: -6.15, e: -49.45 };

// --- 1) Planeta -------------------------------------------------------------------------
async function mundo() {
  const { data, info } = await sharp('assets/img/globo/terra-dia.webp').removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const T = 256;
  let n = 0;
  for (let z = 0; z <= ZOOM_MUNDO; z++) {
    const lado = 2 ** z;
    for (let x = 0; x < lado; x++) {
      mkdirSync(`${SAIDA}/mundo/${z}/${x}`, { recursive: true });
      for (let y = 0; y < lado; y++) {
        const px = Buffer.alloc(T * T * 3);
        for (let j = 0; j < T; j++) {
          // Web Mercator → latitude
          const my = (y * T + j + 0.5) / (lado * T);
          const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * my)));
          const v = Math.min(info.height - 1, Math.max(0, Math.floor(((Math.PI / 2 - lat) / Math.PI) * info.height)));
          for (let i = 0; i < T; i++) {
            const u = Math.floor(((x * T + i + 0.5) / (lado * T)) * info.width) % info.width;
            const o = (v * info.width + u) * 3;
            const d = (j * T + i) * 3;
            px[d] = data[o];
            px[d + 1] = data[o + 1];
            px[d + 2] = data[o + 2];
          }
        }
        await sharp(px, { raw: { width: T, height: T, channels: 3 } }).webp({ quality: 78 }).toFile(`${SAIDA}/mundo/${z}/${x}/${y}.webp`);
        n++;
      }
    }
  }
  console.log(`Planeta: ${n} tiles (zoom 0 a ${ZOOM_MUNDO})`);
}

// --- 2) Cidade (OpenStreetMap via Overpass) -----------------------------------------------
async function overpass(consulta) {
  const servidores = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  for (const url of servidores) {
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(consulta), headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'totem-mirante-canaa/1.0' } });
      if (r.ok) return (await r.json()).elements;
      console.warn(url, r.status);
    } catch (e) {
      console.warn(url, e.message);
    }
  }
  throw new Error('Overpass indisponível: tente de novo mais tarde');
}

const caixa = (b) => `${b.s},${b.w},${b.n},${b.e}`;
const arred = (v) => Math.round(v * 1e5) / 1e5; // ~1 m: arquivo menor
const coords = (geom) => geom.map((p) => [arred(p.lon), arred(p.lat)]);

/** Classe de cada elemento, usada pelo estilo do mapa */
function classe(t) {
  if (t.natural === 'water' || t.water || t.landuse === 'reservoir' || t.landuse === 'basin') return 'agua';
  if (t.waterway) return 'rio';
  if (t.leisure === 'park' || t.leisure === 'garden' || t.landuse === 'grass' || t.landuse === 'recreation_ground' || t.leisure === 'pitch') return 'parque';
  if (t.natural === 'wood' || t.landuse === 'forest' || t.natural === 'scrub' || t.natural === 'wetland') return 'mata';
  if (t.landuse === 'residential' || t.landuse === 'commercial' || t.landuse === 'retail') return 'cidade';
  if (t.landuse === 'farmland' || t.landuse === 'meadow' || t.landuse === 'farmyard') return 'campo';
  if (t.highway) {
    if (['motorway', 'trunk', 'primary', 'trunk_link', 'primary_link'].includes(t.highway)) return 'via-principal';
    if (['secondary', 'tertiary', 'secondary_link', 'tertiary_link'].includes(t.highway)) return 'via-media';
    return 'rua';
  }
  return null;
}

/** Junta os trechos de um polígono do OSM (relação) em anéis fechados */
function aneis(trechos) {
  const restantes = trechos.map((t) => [...t]);
  const prontos = [];
  while (restantes.length) {
    let anel = restantes.shift();
    let mudou = true;
    while (mudou && (anel[0][0] !== anel.at(-1)[0] || anel[0][1] !== anel.at(-1)[1])) {
      mudou = false;
      for (let i = 0; i < restantes.length; i++) {
        const t = restantes[i];
        const fim = anel.at(-1);
        if (t[0][0] === fim[0] && t[0][1] === fim[1]) anel = anel.concat(t.slice(1));
        else if (t.at(-1)[0] === fim[0] && t.at(-1)[1] === fim[1]) anel = anel.concat(t.reverse().slice(1));
        else continue;
        restantes.splice(i, 1);
        mudou = true;
        break;
      }
    }
    if (anel.length >= 4 && anel[0][0] === anel.at(-1)[0] && anel[0][1] === anel.at(-1)[1]) prontos.push(anel);
  }
  return prontos;
}

async function cidade() {
  const areas = `nwr["natural"~"water|wood|scrub|wetland"];nwr["landuse"~"forest|grass|residential|commercial|retail|reservoir|basin|recreation_ground|farmland|meadow"];nwr["leisure"~"park|garden|pitch"];nwr["water"];`;
  const consulta = `[out:json][timeout:120];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|pedestrian|track)(_link)?$"](${caixa(CIDADE)});
  way["highway"~"^(motorway|trunk|primary|secondary)(_link)?$"](${caixa(REGIAO)});
  way["waterway"~"river|stream|canal"](${caixa(REGIAO)});
  ${areas.replace(/;/g, `(${caixa(CIDADE)});`)}
);
out geom;`;
  const elementos = await overpass(consulta);
  const feicoes = [];
  for (const el of elementos) {
    const t = el.tags || {};
    const c = classe(t);
    if (!c) continue;
    const linha = c === 'rio' || c.startsWith('via') || c === 'rua';
    if (el.type === 'way' && el.geometry) {
      const g = coords(el.geometry);
      const fechado = g.length > 3 && g[0][0] === g.at(-1)[0] && g[0][1] === g.at(-1)[1];
      if (linha) feicoes.push({ type: 'Feature', properties: { c }, geometry: { type: 'LineString', coordinates: g } });
      else if (fechado) feicoes.push({ type: 'Feature', properties: { c }, geometry: { type: 'Polygon', coordinates: [g] } });
    } else if (el.type === 'relation' && !linha && el.members) {
      const fora = aneis(el.members.filter((m) => m.role !== 'inner' && m.geometry).map((m) => coords(m.geometry)));
      const dentro = aneis(el.members.filter((m) => m.role === 'inner' && m.geometry).map((m) => coords(m.geometry)));
      // Cada anel de fora vira um polígono; os de dentro (ilhas) ficam no primeiro
      fora.forEach((a, i) => feicoes.push({ type: 'Feature', properties: { c }, geometry: { type: 'Polygon', coordinates: i === 0 ? [a, ...dentro] : [a] } }));
    }
  }
  // Ordem de desenho: áreas grandes embaixo, ruas em cima
  const ordem = ['campo', 'mata', 'cidade', 'parque', 'agua', 'rio', 'rua', 'via-media', 'via-principal'];
  feicoes.sort((a, b) => ordem.indexOf(a.properties.c) - ordem.indexOf(b.properties.c));
  const json = JSON.stringify({ type: 'FeatureCollection', attribution: '© colaboradores do OpenStreetMap (ODbL)', features: feicoes });
  writeFileSync(`${SAIDA}/cidade.geojson`, json);
  const cont = Object.fromEntries(ordem.map((o) => [o, feicoes.filter((f) => f.properties.c === o).length]));
  console.log(`Cidade: ${feicoes.length} elementos (${(json.length / 1024 / 1024).toFixed(1)} MB)`, cont);
}

mkdirSync(SAIDA, { recursive: true });
const so = process.argv[2];
if (!so || so === 'mundo') await mundo();
if (!so || so === 'cidade') await cidade();
