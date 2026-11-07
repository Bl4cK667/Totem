// Galeria de fotos de um lugar, em tela cheia: aparece no lugar do Street View quando não há
// internet (ou quando o lugar não tem Street View). Arraste para o lado ou use as setas.
// Foto que não carrega sai da lista sem deixar buraco (e vai para logs/erros.txt).
import gsap from 'gsap';
import { t, tr, html } from '../core/i18n.js';
import { registrarErro } from '../core/registro.js';
import { calmo } from '../core/acessibilidade.js';

const SETA = '<svg viewBox="0 0 28 16" aria-hidden="true"><path d="M0 8h26M19 1l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';

/** Fotos de um lugar: a principal e as da galeria (só as que têm arquivo) */
export function fotosDoLugar(l) {
  return [l.foto, ...(l.galeria || [])].filter((f) => f?.arquivo);
}

export function montarGaleria(pai) {
  const el = document.createElement('div');
  el.className = 'galeria';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <figure class="galeria__foto"><img alt="" draggable="false" /><figcaption class="galeria__texto"></figcaption></figure>
    <button class="galeria__seta galeria__seta--antes" data-g="-1" aria-label="${html(t('detalhe.anterior'))}">${SETA}</button>
    <button class="galeria__seta" data-g="1" aria-label="${html(t('detalhe.proximo'))}">${SETA}</button>
    <div class="galeria__barra">
      <p class="galeria__nome serif"></p>
      <p class="galeria__conta legenda"></p>
      <button class="botao botao--ouro galeria__fechar" data-acao="fechar-galeria"><span data-i18n="detalhe.fechar">${html(t('detalhe.fechar'))}</span></button>
    </div>`;
  pai.appendChild(el);
  const img = el.querySelector('img');
  let lugar = null;
  let fotos = [];
  let i = 0;

  function mostrar(n, direcao = 0) {
    if (!fotos.length) return fechar();
    i = (n + fotos.length) % fotos.length;
    const f = fotos[i];
    const trocar = () => {
      img.src = f.arquivo;
      img.alt = tr(f.alt);
      el.querySelector('.galeria__texto').innerHTML = `${html(tr(f.alt))}${f.credito ? `<span>${html(t('detalhe.foto'))}: ${html(f.credito)}</span>` : ''}`;
      el.querySelector('.galeria__conta').textContent = fotos.length > 1 ? `${i + 1} / ${fotos.length}` : '';
      el.querySelectorAll('.galeria__seta').forEach((b) => (b.hidden = fotos.length < 2));
    };
    if (!direcao || calmo()) return trocar();
    gsap.timeline().to(img, { autoAlpha: 0, x: -30 * direcao, duration: 0.2, ease: 'sine.in' }).add(trocar).fromTo(img, { x: 30 * direcao }, { autoAlpha: 1, x: 0, duration: 0.3, ease: 'sine.out' });
  }

  img.addEventListener('error', () => {
    if (!fotos[i] || !img.getAttribute('src')) return;
    registrarErro('foto-galeria', img.getAttribute('src'));
    fotos.splice(i, 1);
    mostrar(i);
  });

  // Arrastar para o lado troca a foto
  let x0 = null;
  el.querySelector('.galeria__foto').addEventListener('pointerdown', (e) => (x0 = e.clientX));
  el.querySelector('.galeria__foto').addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 60 && fotos.length > 1) mostrar(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-g]');
    if (b) mostrar(i + Number(b.dataset.g), Number(b.dataset.g));
    if (e.target.closest('[data-acao="fechar-galeria"]')) fechar();
  });

  function abrir(l) {
    lugar = l;
    fotos = fotosDoLugar(l);
    if (!fotos.length) return;
    el.querySelector('.galeria__nome').innerHTML = html(tr(l.nome));
    mostrar(0);
    el.setAttribute('aria-hidden', 'false');
    gsap.killTweensOf(el);
    gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: calmo() ? 0.01 : 0.6, ease: 'sine.inOut' });
  }

  function fechar() {
    if (el.getAttribute('aria-hidden') === 'true') return;
    el.setAttribute('aria-hidden', 'true');
    gsap.killTweensOf(el);
    gsap.to(el, { autoAlpha: 0, duration: calmo() ? 0.01 : 0.45, ease: 'sine.inOut' });
  }

  return {
    abrir,
    fechar,
    aberta: () => el.getAttribute('aria-hidden') === 'false',
    /** Troca de idioma com a galeria aberta */
    atualizar() {
      if (lugar && el.getAttribute('aria-hidden') === 'false') {
        el.querySelector('.galeria__nome').innerHTML = html(tr(lugar.nome));
        mostrar(i);
      }
    },
  };
}
