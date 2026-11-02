// Gera imagens PROVISÓRIAS (ilustrações neutras na paleta da prefeitura)
// para cada local. Substitua pelas fotos reais usando: npm run imagens
//
// Uso: npm run placeholders
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const W = 1600;
const H = 2000;
const SAIDA = 'assets/img/locais';
mkdirSync(SAIDA, { recursive: true });

// Gerador pseudo-aleatório com semente (as imagens saem sempre iguais)
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Silhueta de buriti: tronco levemente curvo + leque de folhas caídas
function buriti(x, base, h, cor, r) {
  const topo = base - h;
  const curva = (r() - 0.5) * h * 0.12;
  const tw = h * 0.022;
  let d = `M${x - tw} ${base} Q${x + curva - tw * 0.6} ${base - h / 2} ${x + curva} ${topo} Q${x + curva + tw * 0.6} ${base - h / 2} ${x + tw} ${base}Z`;
  const cx = x + curva;
  const n = 15;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (1.05 + (i / (n - 1)) * 0.9) + (r() - 0.5) * 0.15;
    const len = h * (0.28 + r() * 0.12);
    const ex = cx + Math.cos(a) * len;
    const ey = topo + Math.sin(a) * len * 0.55 + len * 0.35;
    const mx = cx + Math.cos(a) * len * 0.55;
    const my = topo + Math.sin(a) * len * 0.75;
    const w = h * 0.018;
    d += `M${cx} ${topo} Q${mx - w} ${my - w} ${ex} ${ey} Q${mx + w} ${my + w} ${cx} ${topo + 2}Z`;
  }
  return `<path d="${d}" fill="${cor}"/>`;
}

// Linha de morros (serra) suavizada
function serra(yBase, amp, cor, r, opac = 1) {
  const pts = [];
  const passos = 12;
  for (let i = 0; i <= passos; i++) {
    pts.push([(i / passos) * W, yBase - amp * (0.35 + r() * 0.65)]);
  }
  let d = `M0 ${H} L0 ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    d += ` Q${x0 + (x1 - x0) / 2} ${Math.min(y0, y1) - amp * 0.15} ${x1} ${y1}`;
  }
  d += ` L${W} ${H}Z`;
  return `<path d="${d}" fill="${cor}" opacity="${opac}"/>`;
}

// Prédio institucional estilizado (prefeitura)
function predioPrefeitura(yChao, cor, detalhe) {
  const x = W * 0.18;
  const w = W * 0.64;
  const h = 360;
  let s = `<rect x="${x}" y="${yChao - h}" width="${w}" height="${h}" fill="${cor}"/>`;
  s += `<rect x="${x - 40}" y="${yChao - h - 26}" width="${w + 80}" height="26" fill="${cor}"/>`;
  s += `<rect x="${x + w * 0.36}" y="${yChao - h - 120}" width="${w * 0.28}" height="100" fill="${cor}"/>`;
  for (let i = 0; i < 9; i++) {
    const cx = x + 40 + i * ((w - 80) / 8);
    s += `<rect x="${cx - 7}" y="${yChao - h + 40}" width="14" height="${h - 40}" fill="${detalhe}" opacity="0.35"/>`;
  }
  // mastro e bandeira
  s += `<rect x="${W * 0.86}" y="${yChao - 620}" width="6" height="620" fill="${cor}"/>`;
  s += `<path d="M${W * 0.86 + 6} ${yChao - 615} q60 -14 120 6 v70 q-60 -20 -120 -6z" fill="${cor}"/>`;
  return s;
}

// Rodoviária estilizada: cobertura ondulada sobre pilares
function predioRodoviaria(yChao, cor, detalhe) {
  let s = '';
  const x0 = W * 0.06;
  const x1 = W * 0.94;
  const yT = yChao - 300;
  s += `<path d="M${x0} ${yT} Q${W * 0.3} ${yT - 90} ${W / 2} ${yT} T${x1} ${yT} v34 Q${W * 0.7} ${yT + 70} ${W / 2} ${yT + 34} T${x0} ${yT + 34}Z" fill="${cor}"/>`;
  for (let i = 0; i < 8; i++) {
    const cx = x0 + 60 + i * ((x1 - x0 - 120) / 7);
    s += `<rect x="${cx - 9}" y="${yT + 20}" width="18" height="${yChao - yT - 20}" fill="${cor}"/>`;
  }
  s += `<rect x="${W * 0.2}" y="${yChao - 150}" width="${W * 0.6}" height="150" fill="${cor}" opacity="0.85"/>`;
  for (let i = 0; i < 6; i++) {
    s += `<rect x="${W * 0.23 + i * W * 0.092}" y="${yChao - 120}" width="${W * 0.06}" height="70" fill="${detalhe}" opacity="0.4"/>`;
  }
  return s;
}

// Céu, sol, serra, água (opcional), elementos do primeiro plano
function cena({ seed, ceu, sol, agua, tipo, antes = false, rotulo }) {
  const r = rng(seed);
  const horizonte = H * 0.56;
  const escuro = '#1A120C';
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
      ${ceu.map((c, i) => `<stop offset="${(i / (ceu.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}
    </linearGradient>
    <radialGradient id="sol" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${sol}" stop-opacity="1"/>
      <stop offset="0.25" stop-color="${sol}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${sol}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="agua" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${ceu[ceu.length - 1]}"/>
      <stop offset="0.35" stop-color="${ceu[Math.floor(ceu.length / 2)]}"/>
      <stop offset="1" stop-color="${escuro}"/>
    </linearGradient>
    <radialGradient id="vinheta" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="${antes ? 0.55 : 0.35}"/>
    </radialGradient>
    <filter id="grao" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${antes ? 0.9 : 0.75}" numOctaves="2" seed="${seed}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="${antes ? 0.22 : 0.09}"/></feComponentTransfer>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#ceu)"/>
  <circle cx="${W * (0.3 + r() * 0.4)}" cy="${horizonte - 140}" r="520" fill="url(#sol)"/>`;

  s += serra(horizonte - 40, 260, '#6B4A33', r, 0.45);
  s += serra(horizonte, 170, '#3A2A1E', r, 0.75);

  if (agua) {
    s += `<rect x="0" y="${horizonte}" width="${W}" height="${H - horizonte}" fill="url(#agua)"/>`;
    for (let i = 0; i < 70; i++) {
      const y = horizonte + 20 + Math.pow(r(), 1.6) * (H - horizonte - 300);
      const x = r() * W;
      const w = 40 + r() * 260;
      s += `<rect x="${x}" y="${y}" width="${w}" height="${2 + r() * 3}" fill="#F6E7C1" opacity="${0.08 + r() * 0.22}"/>`;
    }
    // margem do lago
    s += `<path d="M0 ${H} L0 ${H - 340} Q${W * 0.25} ${H - 420} ${W * 0.5} ${H - 330} T${W} ${H - 300} L${W} ${H}Z" fill="${escuro}"/>`;
    const qtd = antes ? 3 : 7;
    for (let i = 0; i < qtd; i++) {
      const x = W * (0.05 + (i / qtd) * 0.9 + (r() - 0.5) * 0.08);
      const h = 520 + r() * 420;
      s += buriti(x, H - 230 - r() * 50, h, escuro, r);
    }
    if (!antes && tipo === 'lago-urbano') {
      // deque / passarela e postes
      s += `<rect x="${W * 0.08}" y="${H - 470}" width="${W * 0.5}" height="14" fill="${escuro}"/>`;
      for (let i = 0; i < 6; i++) {
        const x = W * 0.1 + i * W * 0.09;
        s += `<rect x="${x}" y="${H - 640}" width="8" height="170" fill="${escuro}"/><circle cx="${x + 4}" cy="${H - 646}" r="14" fill="#F2D58B" opacity="0.9"/>`;
      }
    }
  } else {
    s += `<rect x="0" y="${horizonte}" width="${W}" height="${H - horizonte}" fill="${escuro}"/>`;
    const yChao = horizonte + 260;
    if (!antes) {
      if (tipo === 'prefeitura') s += predioPrefeitura(yChao, '#2A1D14', '#E4C77E');
      if (tipo === 'rodoviaria') s += predioRodoviaria(yChao, '#2A1D14', '#E4C77E');
    } else {
      // "antes": terreno aberto, poucas árvores
      for (let i = 0; i < 3; i++) s += buriti(W * (0.2 + i * 0.3), yChao, 420 + r() * 200, '#2A1D14', r);
    }
    s += `<rect x="0" y="${yChao}" width="${W}" height="${H - yChao}" fill="#120C08"/>`;
    for (let i = 0; i < 4; i++) s += buriti(W * (i < 2 ? 0.02 + i * 0.08 : 0.86 + (i - 2) * 0.09), yChao + 40, 700 + r() * 300, '#120C08', r);
  }

  s += `<rect width="${W}" height="${H}" fill="url(#vinheta)"/>`;
  s += `<rect width="${W}" height="${H}" filter="url(#grao)"/>`;
  if (antes) s += `<rect width="${W}" height="${H}" fill="#8A6A3A" opacity="0.18"/>`;
  // Rótulo discreto indicando que é provisória
  s += `<text x="${W - 60}" y="80" text-anchor="end" font-family="Arial, sans-serif" font-size="26" letter-spacing="5" fill="#F6F1E7" opacity="0.55">FOTO PROVISÓRIA · ${rotulo}</text>`;
  s += '</svg>';
  return s;
}

async function salvar(nome, svg, { cinza = false } = {}) {
  let img = sharp(Buffer.from(svg));
  if (cinza) img = img.modulate({ saturation: 0.25 });
  const buf = await img.png().toBuffer();
  await sharp(buf).webp({ quality: 80 }).toFile(`${SAIDA}/${nome}.webp`);
  await sharp(buf).resize(800).webp({ quality: 78 }).toFile(`${SAIDA}/${nome}-sm.webp`);
  console.log('ok', nome);
}

const CEU_TARDE = ['#2A1D14', '#5B3A24', '#B07A42', '#E4C77E', '#F3E2B8'];
const CEU_DIA = ['#3E5A63', '#7C9A97', '#C9C3A6', '#EBDDB8'];
const CEU_ENTARDECER = ['#1F2B26', '#3F6B4E', '#A78D57', '#E9CF8D'];

const locais = [
  { id: 'lago-prefeitura', ceu: CEU_TARDE, sol: '#FFE3A1', agua: true, tipo: 'lago-urbano', seed: 11 },
  { id: 'lago-buritis', ceu: CEU_ENTARDECER, sol: '#FBE7B0', agua: true, tipo: 'lago', seed: 23 },
  { id: 'prefeitura', ceu: CEU_DIA, sol: '#FFF4D6', agua: false, tipo: 'prefeitura', seed: 37 },
  { id: 'rodoviaria', ceu: CEU_TARDE, sol: '#FFE3A1', agua: false, tipo: 'rodoviaria', seed: 41 },
];

for (const l of locais) {
  await salvar(`${l.id}-capa`, cena({ ...l, rotulo: `${l.id}-capa.webp` }));
  await salvar(`${l.id}-depois`, cena({ ...l, rotulo: `${l.id}-depois.webp` }));
  await salvar(`${l.id}-antes`, cena({ ...l, antes: true, rotulo: `${l.id}-antes.webp` }), { cinza: true });
}

// Imagem exibida quando o Street View não está disponível (sem internet/chave)
{
  const r = rng(7);
  let curvas = '';
  for (let k = 0; k < 26; k++) {
    const cx = W * 0.62;
    const cy = H * 0.46;
    const rad = 80 + k * 46;
    let d = '';
    const n = 90;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const wob = 1 + 0.08 * Math.sin(a * 3 + k * 0.4) + 0.05 * Math.sin(a * 5 + k);
      const x = cx + Math.cos(a) * rad * wob * 1.1;
      const y = cy + Math.sin(a) * rad * wob * 0.9;
      d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    curvas += `<path d="${d}Z" fill="none" stroke="#C9A24A" stroke-width="${k % 5 === 0 ? 2.4 : 1.1}" opacity="${0.12 + r() * 0.12}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><radialGradient id="g" cx="0.6" cy="0.45" r="0.8"><stop offset="0" stop-color="#3A2A1E"/><stop offset="1" stop-color="#1A120C"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>${curvas}</svg>`;
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp(buf).webp({ quality: 80 }).toFile('assets/img/streetview-offline.webp');
  console.log('ok streetview-offline');
}
