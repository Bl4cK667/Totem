// Página de cada local, em capítulos animados ao rolar:
// Abertura → Apresentação → Números → Curiosidades → Antes e depois → Street View → Final
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { estado, localPorId, proximoLocal, emitir } from '../core/estado.js';
import { t, tr, html, limpo } from '../core/i18n.js';
import { animarContador, formatarNumero } from '../componentes/contador.js';
import { montarAntesDepois } from '../componentes/antes-depois.js';
import { montarStreetView } from '../componentes/streetview.js';
import { gerarQr } from '../componentes/qrcode.js';
import { preCarregar } from '../util/preload.js';

gsap.registerPlugin(ScrollTrigger);

const tela = document.querySelector('[data-tela="local"]');
const scroller = tela.querySelector('.local-scroll');
const conteudo = tela.querySelector('.local-conteudo');
const barra = document.querySelector('.barra-topo');

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const SETA = '<svg class="seta" viewBox="0 0 28 16" aria-hidden="true"><path d="M0 8h26M19 1l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

let ctx = null;
let lenis = null;
let streetview = null;
let acoes = {};

export function montarLocal({ aoVoltar, aoProximo }) {
  acoes = { aoVoltar, aoProximo };
  conteudo.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    if (b.dataset.acao === 'voltar') acoes.aoVoltar();
    if (b.dataset.acao === 'proximo') acoes.aoProximo(b.dataset.id);
  });
}

/** Separa o nome em palavras e letras (para a animação letra a letra) */
function letras(texto) {
  return limpo(texto)
    .split(' ')
    .map((p) => `<span class="palavra">${[...p].map((c) => `<span class="letra">${c}</span>`).join('')}</span>`)
    .join(' ');
}

function cabecalho(n, titulo, sub = '') {
  return `
    <header class="cap__cabeca">
      <p class="legenda cap__num"><span>${t('local.capitulo')} ${ROMANOS[n]}</span><span class="filete"></span></p>
      <h2 class="cap__titulo"><span class="linha"><span>${html(titulo)}</span></span></h2>
      ${sub ? `<p class="cap__sub">${html(sub)}</p>` : ''}
    </header>`;
}

function htmlLocal(l, qr) {
  const prox = proximoLocal(l.id);
  const temAntesDepois = l.fotos.antes && l.fotos.depois;
  let n = 0;

  return `
  <section class="cap cap-abertura" data-tema="escuro">
    <div class="abertura__foto"><img src="${l.fotos.capa}" alt="" /></div>
    <div class="abertura__veu"></div>
    <div class="abertura__texto">
      <p class="legenda abertura__categoria"><span class="filete"></span>${html(tr(l.categoria))}</p>
      <h1 class="abertura__nome" aria-label="${limpo(tr(l.nome))}">${letras(tr(l.nome))}</h1>
      <p class="abertura__frase">${html(tr(l.frase))}</p>
    </div>
    <div class="abertura__rolar"><span class="legenda">${t('local.rolar')}</span><i></i></div>
  </section>

  <section class="cap cap-intro" data-tema="claro">
    <p class="intro__texto">${html(tr(l.introducao))}</p>
  </section>

  ${
    l.numeros?.length
      ? `<section class="cap cap-numeros" data-tema="claro">
    ${cabecalho(n++, t('local.numeros'))}
    <div class="numeros numeros--${l.numeros.length}">
      ${l.numeros
        .map(
          (num) => `
        <div class="numero">
          <p class="numero__valor"><span class="serif" data-valor="${num.valor}" data-tipo="${num.tipo || ''}">${formatarNumero(num.valor, num.tipo, estado.idioma)}</span>${num.sufixo ? `<small>${num.sufixo}</small>` : ''}</p>
          <span class="filete"></span>
          <p class="legenda numero__rotulo">${html(tr(num.rotulo))}</p>
        </div>`
        )
        .join('')}
    </div>
  </section>`
      : ''
  }

  ${
    l.curiosidades?.length
      ? `<section class="cap cap-curiosidades" data-tema="escuro">
    ${cabecalho(n++, t('local.curiosidades'))}
    <div class="curiosidades">
      ${l.curiosidades
        .map(
          (c, i) => `
        <article class="curiosidade">
          <p class="curiosidade__num serif">${String(i + 1).padStart(2, '0')}</p>
          <div>
            <h3 class="curiosidade__titulo">${html(tr(c.titulo))}</h3>
            <p class="curiosidade__texto">${html(tr(c.texto))}</p>
          </div>
        </article>`
        )
        .join('')}
    </div>
  </section>`
      : ''
  }

  ${
    temAntesDepois
      ? `<section class="cap cap-antes-depois" data-tema="claro">
    ${cabecalho(n++, t('local.antesDepois'))}
    <div class="comparar">
      <img class="comparar__depois" src="${l.fotos.depois}" alt="" />
      <div class="comparar__antes"><img src="${l.fotos.antes}" alt="" /></div>
      <p class="legenda comparar__tag comparar__tag--antes">${t('local.antes')}<span>${html(tr(l.fotos.legendaAntes))}</span></p>
      <p class="legenda comparar__tag comparar__tag--hoje">${t('local.hoje')}<span>${html(tr(l.fotos.legendaDepois))}</span></p>
      <div class="comparar__alca">
        <span class="comparar__linha"></span>
        <span class="comparar__botao"><svg viewBox="0 0 40 16" aria-hidden="true"><path d="M8 1L1 8l7 7M32 1l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></span>
      </div>
    </div>
    <p class="legenda comparar__dica">${t('local.arraste')}</p>
  </section>`
      : ''
  }

  <section class="cap cap-streetview" data-tema="escuro">
    ${cabecalho(n++, t('local.streetview'), t('local.streetviewSub'))}
    <div class="streetview-area">
      <div class="streetview-moldura">
        <div class="streetview"></div>
        <div class="streetview__acoes">
          <button class="botao botao--contorno-claro" data-acao="voltar">
            <svg class="seta" viewBox="0 0 28 16" aria-hidden="true" style="transform:scaleX(-1)"><path d="M0 8h26M19 1l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
            ${t('local.streetviewVoltar')}
          </button>
          <button class="botao botao--contorno-claro" data-sv="tela-cheia">
            <svg class="seta" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
            ${t('local.streetviewTelaCheia')}
          </button>
        </div>
      </div>
    </div>
  </section>

  <section class="cap cap-final" data-tema="claro">
    <div class="final__qr">
      <img src="${qr}" alt="QR Code" />
      <div>
        <p class="final__qr-titulo">${t('local.qrTitulo')}</p>
        <p class="final__qr-texto">${t('local.qrTexto')}</p>
      </div>
    </div>

    ${
      prox && prox.id !== l.id
        ? `<button class="proximo" data-acao="proximo" data-id="${prox.id}">
      <span class="proximo__foto"><img src="${prox.fotos.miniatura || prox.fotos.capa}" alt="" /></span>
      <span class="proximo__texto">
        <span class="legenda">${t('local.proximo')}</span>
        <span class="proximo__nome">${html(tr(prox.nome))}</span>
      </span>
      <span class="proximo__seta">${SETA}</span>
    </button>`
        : ''
    }

    <button class="botao botao--contorno-escuro final__voltar" data-acao="voltar">
      <svg class="seta" viewBox="0 0 28 16" aria-hidden="true" style="transform:scaleX(-1)"><path d="M0 8h26M19 1l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      ${t('local.voltar')}
    </button>

    ${l.creditos ? `<p class="final__creditos">${t('local.creditos')}: ${html(l.creditos)}</p>` : ''}
  </section>`;
}

/** Animações e componentes vinculados à rolagem */
function animar(l) {
  ctx = gsap.context(() => {
    ScrollTrigger.defaults({ scroller });

    // Abertura: parallax da foto e saída suave do texto
    gsap.to('.abertura__foto img', {
      yPercent: 18,
      ease: 'none',
      scrollTrigger: { trigger: '.cap-abertura', start: 'top top', end: 'bottom top', scrub: true },
    });
    gsap.to('.abertura__texto', {
      yPercent: -30,
      autoAlpha: 0,
      ease: 'none',
      scrollTrigger: { trigger: '.cap-abertura', start: '35% top', end: 'bottom top', scrub: true },
    });

    // Apresentação: linhas surgindo
    gsap.from('.intro__texto', {
      y: 60,
      autoAlpha: 0,
      duration: 1.4,
      ease: 'expo.out',
      scrollTrigger: { trigger: '.cap-intro', start: 'top 80%' },
    });

    // Cabeçalhos de capítulo
    gsap.utils.toArray('.cap__cabeca').forEach((cab) => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: cab, start: 'top 85%' } });
      tl.from(cab.querySelector('.cap__num'), { autoAlpha: 0, x: -20, duration: 1, ease: 'expo.out' })
        .from(cab.querySelector('.cap__num .filete'), { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'expo.out' }, 0.1)
        .from(cab.querySelector('.cap__titulo .linha > span'), { yPercent: 110, duration: 1.3, ease: 'expo.out' }, 0.05);
      const sub = cab.querySelector('.cap__sub');
      if (sub) tl.from(sub, { autoAlpha: 0, y: 20, duration: 1, ease: 'expo.out' }, 0.3);
    });

    // Números com contador
    gsap.utils.toArray('.numero').forEach((el, i) => {
      const valor = el.querySelector('[data-valor]');
      gsap.from(el, {
        autoAlpha: 0,
        y: 40,
        duration: 1.2,
        delay: (i % 2) * 0.12,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          onEnter: () => animarContador(valor, { valor: Number(valor.dataset.valor), tipo: valor.dataset.tipo, idioma: estado.idioma }),
        },
      });
      gsap.from(el.querySelector('.filete'), { scaleX: 0, transformOrigin: 'left', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
    });

    // Curiosidades: máscara revelando cada cartão
    gsap.utils.toArray('.curiosidade').forEach((card) => {
      gsap
        .timeline({ scrollTrigger: { trigger: card, start: 'top 85%' } })
        .fromTo(card, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' })
        .from(card.querySelectorAll('.curiosidade__num, h3, .curiosidade__texto'), { y: 30, autoAlpha: 0, duration: 1, stagger: 0.08, ease: 'expo.out' }, 0.45);
    });

    // Antes e depois
    const comparar = conteudo.querySelector('.comparar');
    if (comparar) {
      const slider = montarAntesDepois(comparar);
      gsap.fromTo(
        comparar,
        { clipPath: 'inset(12% 8% 12% 8%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.6,
          ease: 'expo.inOut',
          scrollTrigger: { trigger: comparar, start: 'top 80%', onEnter: () => gsap.delayedCall(1.1, slider.demonstrar) },
        }
      );
      // As etiquetas ANTES/HOJE descem o necessário para nunca ficarem sob a barra do topo
      const etiquetas = comparar.querySelectorAll('.comparar__tag');
      const desviarDaBarra = () => {
        const r = comparar.getBoundingClientRect();
        gsap.set(etiquetas, { y: gsap.utils.clamp(0, r.height * 0.6, barra.getBoundingClientRect().bottom - r.top) });
      };
      ScrollTrigger.create({ trigger: comparar, start: 'top bottom', end: 'bottom top', onUpdate: desviarDaBarra, onRefresh: desviarDaBarra });
    }

    // Street View: só cria o iframe quando o capítulo se aproxima
    const moldura = conteudo.querySelector('.streetview-moldura');
    streetview = montarStreetView(moldura, l.id);
    ScrollTrigger.create({ trigger: moldura, start: 'top 160%', once: true, onEnter: () => streetview.carregar() });
    gsap.from(moldura, { autoAlpha: 0, y: 60, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: moldura, start: 'top 88%' } });

    // Final
    gsap.from('.cap-final > *', { autoAlpha: 0, y: 40, duration: 1.2, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.cap-final', start: 'top 80%' } });

    // Barra superior acompanha o tema (claro/escuro) da seção que está por baixo
    gsap.utils.toArray('.cap').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top top+=60',
        end: 'bottom top+=60',
        onToggle: (s) => s.isActive && temaBarra(sec.dataset.tema),
      });
    });
  }, conteudo);
}

function temaBarra(tema) {
  barra.classList.toggle('sobre-escuro', tema === 'escuro');
  barra.classList.toggle('veu-claro', tema === 'claro');
}

/** Monta a página do local e liga rolagem suave + animações */
export async function renderizarLocal(id, { manterRolagem = false } = {}) {
  const l = localPorId(id);
  const y = manterRolagem ? scroller.scrollTop : 0;
  destruir();
  estado.localId = id;
  const qr = await gerarQr(id);
  conteudo.innerHTML = htmlLocal(l, qr);
  scroller.scrollTop = y;

  lenis = new Lenis({ wrapper: scroller, content: conteudo, lerp: 0.085, smoothWheel: true, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(rafLenis);

  animar(l);
  temaBarra('escuro');
  barra.classList.add('com-veu');
  ScrollTrigger.refresh();

  // Antecipa a capa do próximo local
  const prox = proximoLocal(id);
  if (prox) preCarregar([prox.fotos.capa, prox.fotos.miniatura]);
  emitir('local', l);
  return l;
}

function rafLenis(time) {
  lenis?.raf(time * 1000);
}

/** Animação de abertura (nome letra por letra etc.) */
export function abrirLocal() {
  gsap.set(tela, { autoAlpha: 1 });
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from(conteudo.querySelectorAll('.abertura__nome .letra'), { yPercent: 115, duration: 1.3, stagger: 0.035 }, 0.1)
    .from(conteudo.querySelector('.abertura__categoria'), { autoAlpha: 0, y: 16, duration: 1.1 }, 0)
    .from(conteudo.querySelector('.abertura__categoria .filete'), { scaleX: 0, transformOrigin: 'left', duration: 1.4 }, 0.1)
    .from(conteudo.querySelector('.abertura__frase'), { autoAlpha: 0, y: 24, duration: 1.2 }, 0.6)
    .from(conteudo.querySelector('.abertura__rolar'), { autoAlpha: 0, duration: 1 }, 1)
    .fromTo(conteudo.querySelector('.abertura__foto img'), { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power2.out' }, 0);
  return tl;
}

export function sairLocal() {
  return gsap.to(tela, { autoAlpha: 0, duration: 0.5, ease: 'power2.out' });
}

export function destruir() {
  streetview?.destruir();
  streetview = null;
  ctx?.revert();
  ctx = null;
  gsap.ticker.remove(rafLenis);
  lenis?.destroy();
  lenis = null;
  ScrollTrigger.getAll().forEach((st) => st.kill());
}

