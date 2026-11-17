// Imagens de satélite de Canaã dos Carajás e arredores, guardadas junto com o totem.
// O mapa da cidade usa só estas imagens (já estão no disco): nada vem da internet, e cada parte
// da tela recebe o nível de detalhe certo (perto da câmera, mais nítido; no horizonte, mais leve).
// As imagens ao vivo da Esri ficam só para a descida do planeta, antes de chegar à região.
//
// Três conjuntos de imagens, cada um com a área e os níveis de zoom de que a vista precisa:
//   horizonte z9–11 — a região inteira, até onde a vista inclinada alcança
//   regiao  z12–13 — arredores da cidade
//   cidade  z14–16 — a cidade inteira, nítida
//   pins    z17    — em volta dos pontos turísticos (mergulho ao tocar num pin)
//
// Uso: npm run foto-satelite   (precisa de internet; leva alguns minutos)
// Saída: assets/img/satelite/{conjunto}/{z}/{x}/{y}.webp e assets/img/satelite/camadas.json
import sharp from 'sharp';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';

const SAIDA = 'assets/img/satelite';
const URLS = [
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
];
const ATRIBUICAO = 'Imagens © Esri, Maxar, Earthstar Geographics e comunidade de usuários GIS';
const QUALIDADE = 82;

// Áreas em [oeste, sul, leste, norte]. A câmera da vista olha para o sul a partir do norte da
// cidade, então as áreas vão mais longe para o sul (o fundo da tela)
const CONJUNTOS = [
  { id: 'horizonte', zooms: [9, 10, 11], area: [-50.449, -7.362, -49.219, -5.966] },
  { id: 'regiao', zooms: [12, 13], area: [-50.098, -6.883, -49.614, -6.359] },
  { id: 'cidade', zooms: [14, 15, 16], area: [-49.922, -6.61, -49.779, -6.468] },
  { id: 'pins', zooms: [17], area: [-49.869, -6.559, -49.839, -6.507] },
];

const DEG = Math.PI / 180;
const xDe = (lng, z) => Math.floor(((lng + 180) / 360) * 2 ** z);
const yDe = (lat, z) => Math.floor(((1 - Math.log(Math.tan(lat * DEG) + 1 / Math.cos(lat * DEG)) / Math.PI) / 2) * 2 ** z);
const lngDe = (x, z) => (x / 2 ** z) * 360 - 180;
const latDe = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) / DEG;

async function baixar(url, tentativas = 5) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch {
      // tenta de novo
    }
    await new Promise((ok) => setTimeout(ok, 800 * (i + 1)));
  }
  throw new Error(`não baixou: ${url}`);
}

const camadas = [];
let total = 0;
let bytes = 0;
for (const c of CONJUNTOS) {
  const pasta = `${SAIDA}/${c.id}`;
  if (existsSync(pasta)) rmSync(pasta, { recursive: true });
  const [oeste, sul, leste, norte] = c.area;
  const lista = [];
  for (const z of c.zooms) {
    for (let x = xDe(oeste, z); x <= xDe(leste, z); x++) {
      for (let y = yDe(norte, z); y <= yDe(sul, z); y++) lista.push({ z, x, y });
    }
  }
  console.log(`${c.id}: ${lista.length} imagens (z${c.zooms[0]}–${c.zooms.at(-1)})…`);

  let i = 0;
  const trabalhador = async () => {
    while (i < lista.length) {
      const t = lista[i++];
      const url = URLS[(t.x + t.y) % URLS.length].replace('{z}', t.z).replace('{y}', t.y).replace('{x}', t.x);
      const dir = `${pasta}/${t.z}/${t.x}`;
      mkdirSync(dir, { recursive: true });
      const info = await sharp(await baixar(url)).webp({ quality: QUALIDADE, effort: 5 }).toFile(`${dir}/${t.y}.webp`);
      bytes += info.size;
    }
  };
  await Promise.all(Array.from({ length: 12 }, trabalhador));
  total += lista.length;

  // Limites exatos da grade de imagens baixada (no zoom mais detalhado do conjunto)
  const z = c.zooms.at(-1);
  const limites = [lngDe(xDe(oeste, z), z), latDe(yDe(sul, z) + 1, z), lngDe(xDe(leste, z) + 1, z), latDe(yDe(norte, z), z)];
  camadas.push({
    id: `satelite-${c.id}`,
    tiles: `assets/img/satelite/${c.id}/{z}/{x}/{y}.webp`,
    minzoom: c.zooms[0],
    maxzoom: z,
    limites: limites.map((n) => Math.round(n * 1e6) / 1e6),
  });
}
writeFileSync(`${SAIDA}/camadas.json`, JSON.stringify({ atribuicao: ATRIBUICAO, geradoEm: new Date().toISOString().slice(0, 10), camadas }, null, 2));
console.log(`ok: ${total} imagens, ${(bytes / 1e6).toFixed(1)} MB`);
