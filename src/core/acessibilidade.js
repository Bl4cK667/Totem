// Acessibilidade: botão sempre visível (canto de baixo, à esquerda) e um painel com opções grandes:
// tamanho do texto, alto contraste, narração em áudio, vídeo em Libras e menos animações.
// As escolhas valem para o visitante atual: no modo descanso (60 s sem toque) tudo volta ao normal.
// Cada opção vira uma classe no <html> (a11y-*) e um aviso ('acessibilidade') para quem precisa reagir.
import gsap from 'gsap';
import { em, emitir, transicaoCurta } from './estado.js';
import { t, html } from './i18n.js';

/** Menos animações: escolhido no painel (ou config + Windows, ver estado.js) */
export const calmo = () => transicaoCurta();

const PADRAO = { texto: 'normal', contraste: false, narracao: false, libras: false, calmo: false };
export const preferencias = { ...PADRAO };
let temLibras = false; // algum lugar tem vídeo em Libras? (sem nenhum, a opção nem aparece)

const ICONE = `<svg class="a11y__icone" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.2" r="2.2" fill="currentColor"/><path d="M4 8.2l8 1.6 8-1.6M12 9.8v5.2m0 0l-3.6 6.6M12 15l3.6 6.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let botao = null;
let painel = null;

function aplicar() {
  const raiz = document.documentElement.classList;
  raiz.toggle('a11y-texto-grande', preferencias.texto === 'grande');
  raiz.toggle('a11y-texto-extra', preferencias.texto === 'extra');
  raiz.toggle('a11y-contraste', preferencias.contraste);
  raiz.toggle('a11y-calmo', preferencias.calmo);
  emitir('acessibilidade', { ...preferencias });
}

function mudar(chave, valor) {
  preferencias[chave] = valor;
  aplicar();
  escrever();
}

/** Visitante novo: tudo volta ao normal */
export function zerarAcessibilidade() {
  Object.assign(preferencias, PADRAO);
  fecharPainel();
  aplicar();
  escrever();
}

function chave(nome, rotulo) {
  const ligado = preferencias[nome];
  return `
    <div class="a11y__linha">
      <span class="a11y__rotulo">${html(t(rotulo))}</span>
      <button class="a11y__chave" role="switch" aria-checked="${ligado}" data-chave="${nome}">
        <span class="a11y__trilho" aria-hidden="true"><i></i></span><span>${html(t(ligado ? 'a11y.ligado' : 'a11y.desligado'))}</span>
      </button>
    </div>`;
}

function escrever() {
  if (!painel) return;
  botao.querySelector('span').textContent = t('a11y.botao');
  botao.setAttribute('aria-expanded', String(painel.getAttribute('aria-hidden') === 'false'));
  const tamanhos = [
    ['normal', 'a11y.normal', 1],
    ['grande', 'a11y.grande', 1.25],
    ['extra', 'a11y.extra', 1.5],
  ];
  painel.innerHTML = `
    <p class="legenda a11y__titulo"><span class="filete"></span><span>${html(t('a11y.titulo'))}</span></p>
    <div class="a11y__linha a11y__linha--texto">
      <span class="a11y__rotulo">${html(t('a11y.texto'))}</span>
      <div class="a11y__tamanhos" role="group" aria-label="${html(t('a11y.texto'))}">
        ${tamanhos
          .map(([id, r, esc]) => `<button class="a11y__tamanho" data-texto="${id}" aria-pressed="${preferencias.texto === id}"><span class="a11y__a serif" style="font-size:${esc}em" aria-hidden="true">A</span><span>${html(t(r))}</span></button>`)
          .join('')}
      </div>
    </div>
    ${chave('contraste', 'a11y.contraste')}
    ${chave('narracao', 'a11y.narracao')}
    ${temLibras ? chave('libras', 'a11y.libras') : ''}
    ${chave('calmo', 'a11y.calmo')}
    <button class="botao botao--escuro a11y__fechar" data-acao="fechar-a11y">${html(t('detalhe.fechar'))}</button>`;
}

export function abrirPainel() {
  escrever();
  painel.setAttribute('aria-hidden', 'false');
  botao.setAttribute('aria-expanded', 'true');
  gsap.killTweensOf(painel);
  gsap.fromTo(painel, { autoAlpha: 0, y: calmo() ? 0 : 20 }, { autoAlpha: 1, y: 0, duration: calmo() ? 0.01 : 0.4, ease: 'power2.out' });
}

export function fecharPainel() {
  if (!painel || painel.getAttribute('aria-hidden') === 'true') return;
  painel.setAttribute('aria-hidden', 'true');
  botao.setAttribute('aria-expanded', 'false');
  gsap.killTweensOf(painel);
  gsap.to(painel, { autoAlpha: 0, duration: calmo() ? 0.01 : 0.25 });
}

/** Botão de acessibilidade em qualquer lugar do totem (ex.: barra de baixo da página do lugar) */
export const botaoDeAcessibilidade = (classe = '') => `<button class="${classe}" data-acao="acessibilidade">${ICONE}<span>${html(t('a11y.botao'))}</span></button>`;

export function montarAcessibilidade({ haLibras = false } = {}) {
  temLibras = haLibras;
  const app = document.getElementById('app');
  botao = document.createElement('button');
  botao.className = 'a11y-botao';
  botao.dataset.acao = 'acessibilidade';
  botao.setAttribute('aria-haspopup', 'dialog');
  botao.innerHTML = `${ICONE}<span></span>`;
  painel = document.createElement('div');
  painel.className = 'a11y';
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-hidden', 'true');
  app.append(botao, painel);

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-acao="acessibilidade"]')) return painel.getAttribute('aria-hidden') === 'true' ? abrirPainel() : fecharPainel();
    if (!painel.contains(e.target)) return;
    if (e.target.closest('[data-acao="fechar-a11y"]')) return fecharPainel();
    const tam = e.target.closest('[data-texto]');
    if (tam) return mudar('texto', tam.dataset.texto);
    const ch = e.target.closest('[data-chave]');
    if (ch) mudar(ch.dataset.chave, !preferencias[ch.dataset.chave]);
  });
  em('idioma', () => {
    escrever();
    document.querySelectorAll('[data-acao="acessibilidade"] span').forEach((s) => (s.textContent = t('a11y.botao')));
  });
  em('descanso', zerarAcessibilidade);
  // Fora do totem em si (tela inicial, mapa e página), o botão fica sempre na tela
  em('tela', () => fecharPainel());
  escrever();
}
