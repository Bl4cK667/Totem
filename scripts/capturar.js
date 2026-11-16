// Prints do fluxo atual (início → descida → mapa → página do lugar → blocos), para revisão visual.
// Uso: npm run dev (outro terminal) e depois  node scripts/capturar.js [pasta] [vertical|horizontal]
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';

const URL = process.env.TOTEM_URL || 'http://localhost:5173/';
const SAIDA = process.argv[2] || 'testes/capturas';
const SO = process.argv[3];
mkdirSync(SAIDA, { recursive: true });
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const telas = [{ nome: 'vertical', width: 1080, height: 1920 }, { nome: 'horizontal', width: 1366, height: 768 }].filter((t) => !SO || t.nome === SO);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const t of telas) {
  const page = await browser.newPage({ viewport: { width: t.width, height: t.height }, hasTouch: true });
  const erros = [];
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  page.on('pageerror', (e) => erros.push(e.message));
  const shot = (n) => page.screenshot({ path: `${SAIDA}/${t.nome}-${n}.png` });

  await page.goto(URL, { waitUntil: 'load' });
  await esperar(1200);
  await shot('00-entrada');
  await esperar(3800);
  await shot('01-inicio');
  await page.locator('[data-acao="comecar"]').click();
  for (const [ms, n] of [[700, '02-saida'], [1500, '03-mundo'], [2400, '04-para'], [2500, '05a'], [1200, '05b'], [1200, '05c'], [1200, '05d'], [3000, '06-mapa']]) {
    await esperar(ms);
    await shot(n);
  }
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.pin')).visibility === 'visible', null, { timeout: 30000 }).catch(() => {});
  await esperar(2500);
  await shot('07-mapa-final');
  await page.locator('.pin__alvo').first().click({ force: true });
  await esperar(350);
  await shot('08-abrindo');
  await esperar(1600);
  await shot('09-abertura');
  for (const sel of ['.sobre', '.sabia', '.chegar', '.fim']) {
    await page.evaluate((s) => {
      const r = document.querySelector('.detalhe__rolagem');
      r.style.scrollSnapType = 'none';
      r.scrollTop = document.querySelector(s).offsetTop - 40;
    }, sel);
    await esperar(1400);
    await shot(`10-${sel.slice(1)}`);
  }
  console.log(t.nome, erros.length ? erros.slice(0, 8) : 'sem erros');
  await page.close();
}
await browser.close();
