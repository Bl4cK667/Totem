// Linguagem de movimento do totem: poucas peças, sempre as mesmas.
// - revelarLinhas: o título sobe de dentro de uma máscara, linha por linha (abertura de filme)
// - iris: um círculo que abre (ou fecha) a partir de um ponto da tela, a "lente do mirante"
// Com "reduzir movimento" ligado, tudo vira fade simples.
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { menosMovimento } from './estado.js';

gsap.registerPlugin(SplitText);

export const EASE_ENTRA = 'expo.out';
export const EASE_TROCA = 'expo.inOut';

/** Linhas do texto sobem de dentro de uma máscara; no fim o texto volta ao HTML original */
export function revelarLinhas(alvos, { duracao = 1.15, intervalo = 0.1 } = {}) {
  const els = gsap.utils.toArray(alvos).filter((el) => el.textContent.trim());
  const tl = gsap.timeline();
  if (!els.length) return tl;
  if (menosMovimento()) return tl.fromTo(els, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'sine.out' });

  const partes = els.map((el) => SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'linha-mascara' }));
  const linhas = partes.flatMap((p) => p.lines);
  tl.set(els, { autoAlpha: 1 })
    .fromTo(linhas, { yPercent: 118 }, { yPercent: 0, duration: duracao, ease: EASE_ENTRA, stagger: intervalo })
    .add(() => partes.forEach((p) => p.revert()));
  return tl;
}

/** Entrada discreta de apoio (legendas, botões): fade com uma subida curta */
export function surgir(alvos, { duracao = 0.9, y = 18 } = {}) {
  return gsap.fromTo(
    alvos,
    { autoAlpha: 0, y: menosMovimento() ? 0 : y },
    { autoAlpha: 1, y: 0, duration: menosMovimento() ? 0.5 : duracao, ease: EASE_ENTRA, stagger: 0.08, clearProps: 'transform' }
  );
}

/** Raio que cobre a tela inteira a partir de (x, y) */
const raioTotal = (x, y) => Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 2;

/**
 * Íris: o elemento aparece (abrir) ou some (fechar) num círculo centrado em (x, y).
 * Sem ponto ou com "reduzir movimento", vira fade.
 */
export function iris(el, { abrir = true, x, y, duracao = 1.15 } = {}) {
  gsap.killTweensOf(el, 'clipPath,opacity,visibility');
  if (menosMovimento() || x == null) {
    return gsap.to(el, { autoAlpha: abrir ? 1 : 0, duration: 0.6, ease: 'sine.inOut', clearProps: 'clipPath' });
  }
  const fechado = `circle(0px at ${x}px ${y}px)`;
  const aberto = `circle(${raioTotal(x, y)}px at ${x}px ${y}px)`;
  if (abrir) {
    gsap.set(el, { autoAlpha: 1, clipPath: fechado });
    aroDaLente(el, x, y, duracao);
    return gsap.to(el, { clipPath: aberto, duration: duracao, ease: EASE_TROCA, clearProps: 'clipPath' });
  }
  gsap.set(el, { clipPath: aberto });
  return gsap.to(el, {
    clipPath: fechado,
    duration: duracao * 0.8,
    ease: 'expo.in',
    onComplete: () => gsap.set(el, { autoAlpha: 0, clearProps: 'clipPath' }),
  });
}

/**
 * Aro dourado fino que acompanha a borda da íris enquanto ela abre (mesma curva e duração),
 * e se apaga antes de chegar aos cantos: é a borda da lente
 */
let aro = null;
function aroDaLente(el, x, y, duracao) {
  if (!aro) {
    aro = document.createElement('div');
    aro.className = 'lente-aro';
    aro.setAttribute('aria-hidden', 'true');
    document.getElementById('app').appendChild(aro);
  }
  aro.style.zIndex = String((parseInt(getComputedStyle(el).zIndex, 10) || 10) + 1);
  const r = { v: 0 };
  const R = raioTotal(x, y);
  const desenhar = () => {
    const d = r.v * 2;
    aro.style.width = aro.style.height = `${d}px`;
    aro.style.transform = `translate(${x - r.v}px, ${y - r.v}px)`;
  };
  gsap.killTweensOf([r, aro]);
  gsap.set(aro, { autoAlpha: 1 });
  gsap.to(r, { v: R, duration: duracao, ease: EASE_TROCA, onUpdate: desenhar, onStart: desenhar });
  gsap.to(aro, { autoAlpha: 0, duration: duracao * 0.35, ease: 'sine.in', delay: duracao * 0.5 });
}

/**
 * Morfose do pin: o elemento (tela cheia) nasce do tamanho do disco do pin, cresce para um cartão
 * com cantos arredondados acima do ponto e então se abre até ocupar a tela. Na volta, o caminho
 * inverso: tela → cartão → disco. "disco" = { x, y, r } (centro e raio na tela).
 */
const px = (n) => `${Math.round(n * 10) / 10}px`;
const recorte = ({ t, r, b, l, raio }) => `inset(${px(t)} ${px(r)} ${px(b)} ${px(l)} round ${px(raio)})`;
function formas({ x, y, r }) {
  const W = innerWidth;
  const H = innerHeight;
  const m = Math.min(W, H) * 0.06;
  const cw = Math.min(W * 0.62, H * 0.5);
  const ch = Math.min(H * 0.46, cw * 1.25);
  const l = Math.min(Math.max(x - cw / 2, m), W - cw - m);
  const t = Math.min(Math.max(y - ch * 0.62, m * 2), H - ch - m);
  return {
    disco: recorte({ t: y - r, r: W - x - r, b: H - y - r, l: x - r, raio: r }),
    cartao: recorte({ t, r: W - l - cw, b: H - t - ch, l, raio: Math.min(W, H) * 0.035 }),
    cheia: recorte({ t: 0, r: 0, b: 0, l: 0, raio: 0 }),
  };
}

export function morfarDoPin(el, disco, { abrir = true } = {}) {
  gsap.killTweensOf(el, 'clipPath,opacity,visibility');
  if (menosMovimento() || disco?.x == null) {
    return gsap.to(el, { autoAlpha: abrir ? 1 : 0, duration: 0.6, ease: 'sine.inOut', clearProps: 'clipPath' });
  }
  const f = formas(disco);
  const tl = gsap.timeline();
  if (abrir) {
    tl.set(el, { autoAlpha: 1, clipPath: f.disco })
      .to(el, { clipPath: f.cartao, duration: 0.55, ease: 'power3.out' })
      .to(el, { clipPath: f.cheia, duration: 0.85, ease: 'power3.inOut' }, '-=0.08')
      .set(el, { clearProps: 'clipPath' });
  } else {
    tl.set(el, { clipPath: f.cheia })
      .to(el, { clipPath: f.cartao, duration: 0.7, ease: 'power3.inOut' })
      .to(el, { clipPath: f.disco, duration: 0.45, ease: 'power3.in' }, '-=0.05')
      .set(el, { autoAlpha: 0, clearProps: 'clipPath' });
  }
  return tl;
}

/** Centro de um elemento na tela */
export function centroDe(el) {
  if (!el) return {};
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
