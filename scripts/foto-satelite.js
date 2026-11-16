// "Foto" de satélite de Canaã dos Carajás e arredores, salva junto com o totem.
// O mapa mostra estas imagens na hora (já estão no disco), sem esperar a internet,
// e as imagens ao vivo da Esri ficam só para fora delas e para o mergulho nos pins.
//
// Três camadas, da mais ampla e leve à mais nítida, todas alinhadas à grade de imagens do mapa:
//   z11 — região inteira (horizonte da vista)    z13 — arredores    z15 — a cidade
//
// Uso: npm run foto-satelite   (precisa de internet; leva alguns minutos)
// Saída: assets/img/satelite/*.webp e assets/img/satelite/fotos.json (cantos de cada foto)
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const SAIDA = 'assets/img/satelite';
const URLS = [
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
];
const ATRIBUICAO = 'Imagens © Esri, Maxar, Earthstar Geographics e comunidade de usuários GIS';
// Centro: a vista geral do mapa (VISTA em src/telas/mapa.js). A câmera olha para o sul,
// então o fundo da tela é mais ao sul (y maior): as fotos vão mais longe para esse lado.
const CENTRO = { lng: -49.8542, lat: -6.5147 };
const CAMADAS = [
  { z: 11, x: [-3, 3], y: [-3, 4], qualidade: 80 },
  { z: 13, x: [-5, 5], y: [-3, 8], qualidade: 80 },
  { z: 15, x: [-6, 6], y: [-4, 8], qualidade: 82 },
];

const DEG = Math.PI / 180;
const tileDe = (lng, lat, z) => {
  const n = 2 ** z;
  return [Math.floor(((lng + 180) / 360) * n), Math.floor(((1 - Math.log(Math.tan(lat * DEG) + 1 / Math.cos(lat * DEG)) / Math.PI) / 2) * n)];
};
const lngDe = (x, z) => (x / 2 ** z) * 360 - 180;
const latDe = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) / DEG;

async function baixar(url, tentativas = 4) {
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

mkdirSync(SAIDA, { recursive: true });
const fotos = [];
for (const c of CAMADAS) {
  const [cx, cy] = tileDe(CENTRO.lng, CENTRO.lat, c.z);
  const x0 = cx + c.x[0], x1 = cx + c.x[1], y0 = cy + c.y[0], y1 = cy + c.y[1];
  const lista = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) lista.push({ x, y });
  console.log(`z${c.z}: ${lista.length} imagens…`);

  const pecas = [];
  let i = 0;
  const trabalhador = async () => {
    while (i < lista.length) {
      const t = lista[i++];
      const url = URLS[(t.x + t.y) % URLS.length].replace('{z}', c.z).replace('{y}', t.y).replace('{x}', t.x);
      pecas.push({ input: await baixar(url), left: (t.x - x0) * 256, top: (t.y - y0) * 256 });
    }
  };
  await Promise.all(Array.from({ length: 12 }, trabalhador));

  const largura = (x1 - x0 + 1) * 256;
  const altura = (y1 - y0 + 1) * 256;
  const arquivo = `canaa-z${c.z}.webp`;
  await sharp({ create: { width: largura, height: altura, channels: 3, background: '#5f5d3a' } })
    .composite(pecas)
    .webp({ quality: c.qualidade, effort: 6 })
    .toFile(`${SAIDA}/${arquivo}`);
  // Cantos na ordem do MapLibre: superior esquerdo, superior direito, inferior direito, inferior esquerdo
  const [oeste, leste, norte, sul] = [lngDe(x0, c.z), lngDe(x1 + 1, c.z), latDe(y0, c.z), latDe(y1 + 1, c.z)];
  fotos.push({ id: `foto-z${c.z}`, z: c.z, arquivo: `assets/img/satelite/${arquivo}`, cantos: [[oeste, norte], [leste, norte], [leste, sul], [oeste, sul]] });
  console.log(`   ${arquivo}  ${largura}×${altura}`);
}
writeFileSync(`${SAIDA}/fotos.json`, JSON.stringify({ atribuicao: ATRIBUICAO, geradoEm: new Date().toISOString().slice(0, 10), fotos }, null, 2));
console.log('ok');
