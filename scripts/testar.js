// Teste automatizado no Chrome (sem abrir janela): percorre o fluxo do totem
// em tela vertical (1080×1920) e horizontal (1366×768), tira prints e
// lista erros do console e a taxa de quadros (fps).
//
// Uso: npm run dev  (em outro terminal)  e depois  npm run testar [pasta-saida]
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync } from 'node:fs';

const URL = process.env.TOTEM_URL || 'http://localhost:5173/';
const SAIDA = process.argv[2] || 'testes';
const SO = process.argv[3]; // opcional: "vertical" ou "horizontal"
mkdirSync(SAIDA, { recursive: true });

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);

const telas = [
  { nome: 'vertical', width: 1080, height: 1920 },
  { nome: 'horizontal', width: 1366, height: 768 },
].filter((t) => !SO || t.nome === SO);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function fps(page, ms = 1500) {
  return page.evaluate(
    (ms) =>
      new Promise((ok) => {
        let n = 0;
        const t0 = performance.now();
        const f = () => {
          n++;
          if (performance.now() - t0 < ms) requestAnimationFrame(f);
          else ok(Math.round((n * 1000) / (performance.now() - t0)));
        };
        requestAnimationFrame(f);
      }),
    ms
  );
}

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});

for (const t of telas) {
  const page = await browser.newPage({ viewport: { width: t.width, height: t.height }, hasTouch: true });
  const erros = [];
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && erros.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => erros.push(`[pageerror] ${e.message}`));

  const shot = async (nome) => page.screenshot({ path: `${SAIDA}/${t.nome}-${nome}.png` });
  const clicar = async (sel) => {
    const el = page.locator(sel).first();
    await el.click({ timeout: 8000 });
  };
  const existe = async (sel) => (await page.locator(sel).count()) > 0;

  await page.goto(URL, { waitUntil: 'networkidle' });
  await esperar(3500);
  await shot('01-inicio');
  console.log(t.nome, 'fps inicio:', await fps(page));

  if (await existe('[data-acao="comecar"]')) {
    await clicar('[data-acao="comecar"]');
    await esperar(1300);
    await shot('02-transicao-a');
    await esperar(800);
    await shot('03-transicao-b');
    await esperar(2600);
    await shot('04-locais');
  }

  if (await existe('.card-local.atual')) {
    await page.mouse.move(t.width * 0.7, t.height * 0.55);
    await page.mouse.down();
    await page.mouse.move(t.width * 0.3, t.height * 0.55, { steps: 12 });
    await page.mouse.up();
    await esperar(1400);
    await shot('05-locais-arrastado');
    await clicar('.card-local.atual');
    await esperar(2600);
    await shot('06-local-abertura');
    console.log(t.nome, 'fps local:', await fps(page));

    const rolar = async (nome, sel) => {
      await page.evaluate((sel) => {
        const alvo = document.querySelector(sel);
        const sc = document.querySelector('.local-scroll');
        if (alvo && sc) sc.scrollTo({ top: alvo.offsetTop - 40 });
      }, sel);
      await esperar(2200);
      await shot(nome);
    };
    await rolar('07-numeros', '.cap-numeros');
    await rolar('08-curiosidades', '.cap-curiosidades');
    await rolar('09-antes-depois', '.cap-antes-depois');
    await rolar('10-streetview', '.cap-streetview');
    await rolar('11-final', '.cap-final');
    if (await existe('.mascote__corpo')) {
      await clicar('.mascote__corpo');
      await esperar(1500);
      await shot('12-mascote');
    }
    if (await existe('[data-idioma="en"]')) {
      await page.locator('.barra-topo [data-idioma="en"]').click();
      await esperar(1500);
      await shot('13-ingles');
    }
  }

  console.log(`\n== ${t.nome}: ${erros.length} erro(s)/aviso(s) no console`);
  erros.slice(0, 20).forEach((e) => console.log('  ', e));
  await page.close();
}

await browser.close();
