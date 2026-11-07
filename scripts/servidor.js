// Servidor local do totem (sem dependências, só Node). O iniciar-totem.bat liga este servidor.
//   node scripts/servidor.js            → http://localhost:4173 (pasta dist/, depois do npm run build)
// - data/, audio/ e libras/ vêm sempre da pasta do projeto: trocar um texto não precisa de build
// - POST api/erro    → logs/erros.txt (arquivo faltando, erro de script...)
// - POST api/uso     → logs/uso.csv (data/hora, lugar, idioma, áudio, Libras, segundos). Sem dados pessoais
// - POST api/batimento → a página avisa que está viva; GET api/estado → o monitor confere
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
const LOGS = join(RAIZ, 'logs');
let ultimoBatimento = 0;
const inicio = Date.now();

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.geojson': 'application/geo+json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt',
  '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm',
};

const agora = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

function lerCorpo(req) {
  return new Promise((ok) => {
    let s = '';
    req.on('data', (c) => (s.length < 20000 ? (s += c) : null));
    req.on('end', () => {
      try {
        ok(JSON.parse(s || '{}'));
      } catch {
        ok({});
      }
    });
  });
}

const limpar = (v, max = 300) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').slice(0, max);
const csv = (v) => (/[",;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Rotas api/*: usadas por este servidor e pelo Vite (npm run dev / preview) */
export async function api(req, res) {
  const caminho = req.url.split('?')[0].replace(/^.*\/api\//, '');
  const responder = (obj, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj));
  };
  mkdirSync(LOGS, { recursive: true });
  if (req.method === 'GET' && caminho === 'estado') return responder({ ok: true, ultimoBatimento, segundosDesdeBatimento: ultimoBatimento ? Math.round((Date.now() - ultimoBatimento) / 1000) : null, ligadoHaSegundos: Math.round((Date.now() - inicio) / 1000) });
  if (req.method !== 'POST') return responder({ erro: 'método' }, 405);
  const dados = await lerCorpo(req);
  if (caminho === 'batimento') {
    ultimoBatimento = Date.now();
    return responder({ ok: true });
  }
  if (caminho === 'erro') {
    appendFileSync(join(LOGS, 'erros.txt'), `[${agora()}] ${limpar(dados.tipo, 40)}: ${limpar(dados.detalhe, 500)}\n`);
    return responder({ ok: true });
  }
  if (caminho === 'uso') {
    const arquivo = join(LOGS, 'uso.csv');
    if (!existsSync(arquivo)) appendFileSync(arquivo, 'data_hora,lugar,idioma,usou_audio,usou_libras,segundos\n');
    const linha = [agora(), limpar(dados.lugar, 60), limpar(dados.idioma, 5), dados.audio ? 'sim' : 'nao', dados.libras ? 'sim' : 'nao', String(Math.max(0, Math.round(Number(dados.segundos) || 0)))];
    appendFileSync(arquivo, linha.map(csv).join(',') + '\n');
    return responder({ ok: true });
  }
  responder({ erro: 'não encontrado' }, 404);
}

/** Middleware para o Vite: api/* e, no preview, data/audio/libras direto da pasta do projeto */
export function middlewareTotem({ dadosDaRaiz = false } = {}) {
  return (req, res, next) => {
    const url = req.url.split('?')[0];
    if (url.includes('/api/')) return api(req, res);
    if (dadosDaRaiz && /^\/(data|audio|libras)\//.test(url)) return servirArquivo(join(RAIZ, decodeURIComponent(url)), req, res, next);
    next();
  };
}

function servirArquivo(arquivo, req, res, proximo) {
  const real = resolve(arquivo);
  if (!real.startsWith(RAIZ + sep) || !existsSync(real) || !statSync(real).isFile()) return proximo ? proximo() : naoAchou(res);
  const tamanho = statSync(real).size;
  const tipo = TIPOS[extname(real).toLowerCase()] || 'application/octet-stream';
  const semCache = /\.(json|html)$/.test(real);
  const cab = { 'Content-Type': tipo, 'Cache-Control': semCache ? 'no-cache' : 'public, max-age=86400', 'Accept-Ranges': 'bytes' };
  // Áudio e vídeo pedem pedaços do arquivo (para avançar e voltar)
  const faixa = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (faixa) {
    const ini = faixa[1] ? Number(faixa[1]) : 0;
    const fim = faixa[2] ? Math.min(Number(faixa[2]), tamanho - 1) : tamanho - 1;
    res.writeHead(206, { ...cab, 'Content-Range': `bytes ${ini}-${fim}/${tamanho}`, 'Content-Length': fim - ini + 1 });
    return createReadStream(real, { start: ini, end: fim }).pipe(res);
  }
  res.writeHead(200, { ...cab, 'Content-Length': tamanho });
  createReadStream(real).pipe(res);
}

function naoAchou(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Não encontrado');
}

// --- Rodando direto: node scripts/servidor.js [porta] --------------------------------------
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const porta = Number(process.argv[2] || process.env.PORTA || 4173);
  const DIST = join(RAIZ, 'dist');
  if (!existsSync(join(DIST, 'index.html'))) {
    console.error('Falta a pasta dist/. Rode "npm run build" uma vez.');
    process.exit(1);
  }
  const mid = middlewareTotem({ dadosDaRaiz: true });
  createServer((req, res) => {
    mid(req, res, () => {
      let url = decodeURIComponent(req.url.split('?')[0]);
      if (url.endsWith('/')) url += 'index.html';
      servirArquivo(join(DIST, url), req, res, () => servirArquivo(join(DIST, 'index.html'), req, res));
    });
  }).listen(porta, '127.0.0.1', () => console.log(`Totem em http://localhost:${porta}`));
}
