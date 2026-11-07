// "Antes e agora": duas fotos do mesmo lugar, uma sobre a outra, com uma linha dourada que a
// pessoa arrasta com o dedo. Mais de um par: miniaturas para trocar. Fotos com enquadramento
// diferente (proporções que não batem, ou "alinhado": false no lugares.json): lado a lado.
import gsap from 'gsap';
import { t, tr, html } from '../core/i18n.js';
import { registrarErro } from '../core/registro.js';
import { calmo } from '../core/acessibilidade.js';

const DIFERENCA_MAXIMA = 0.08; // 8% de diferença na proporção já é enquadramento diferente
const ESTE_ANO = new Date().getFullYear();

/** Pares válidos de um lugar (com as duas fotos) */
export const paresDe = (lugar) => (lugar.antes_agora || []).filter((p) => p.foto_antes && p.foto_agora);

const anoAgora = (p) => (!p.ano_agora || Number(p.ano_agora) >= ESTE_ANO ? t('detalhe.hoje') : String(p.ano_agora));

/**
 * bloco: o .bloco__dentro do "Antes e agora". Retorna { dica, destruir }.
 * Sem pares, não faz nada (o bloco fica escondido por quem chama).
 */
export function montarAntesAgora(bloco, lugar) {
  const palco = bloco.querySelector('.antes__palco');
  const legenda = bloco.querySelector('.antes__legenda');
  const miniaturas = bloco.querySelector('.antes__miniaturas');
  const pares = paresDe(lugar);
  let soltar = () => {};
  let dicaTl = null; // a linha indo e voltando sozinha (para assim que a pessoa toca)

  function mostrar(i) {
    soltar();
    const p = pares[i];
    const lado = p.alinhado === false;
    palco.innerHTML = lado ? ladoALado(p) : sobrepostas(p);
    legenda.innerHTML = html(tr(p.descricao_antes)) + (p.credito ? `<span class="antes__credito">${html(p.credito)}</span>` : '');
    legenda.hidden = !legenda.textContent.trim();
    miniaturas.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    vigiarFotos(p);
    if (!lado) soltar = ligarArraste();
  }

  function sobrepostas(p) {
    return `
      <div class="comparador" style="--pos: 50%">
        <img class="comparador__agora" src="${p.foto_agora}" alt="${html(tr(p.alt_agora))}" draggable="false" />
        <div class="comparador__antes"><img src="${p.foto_antes}" alt="${html(tr(p.alt_antes))}" draggable="false" /></div>
        <span class="comparador__ano comparador__ano--antes legenda">${html(String(p.ano_antes || ''))}</span>
        <span class="comparador__ano comparador__ano--agora legenda">${html(anoAgora(p))}</span>
        <div class="comparador__linha" aria-hidden="true">
          <span class="comparador__alca"><svg viewBox="0 0 40 16"><path d="M13 2 7 8l6 6M27 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"/></svg></span>
        </div>
        <input class="comparador__faixa" type="range" min="0" max="100" value="50" aria-label="${html(t('detalhe.comparar'))}" />
      </div>
      <p class="antes__dica">${html(t('detalhe.arraste'))}</p>`;
  }

  function ladoALado(p) {
    const fig = (src, alt, ano) => `<figure><img src="${src}" alt="${html(tr(alt))}" loading="lazy" /><figcaption class="legenda">${html(ano)}</figcaption></figure>`;
    return `<div class="antes__lado">${fig(p.foto_antes, p.alt_antes, String(p.ano_antes || ''))}${fig(p.foto_agora, p.alt_agora, anoAgora(p))}</div>`;
  }

  // Foto faltando: fica só a que existe, sozinha (sem comparar); sem nenhuma, o bloco some.
  // Proporções diferentes: troca para lado a lado (as fotos não se alinham)
  function vigiarFotos(p) {
    const imgs = [...palco.querySelectorAll('img')];
    let carregadas = 0;
    let falhou = false;
    imgs.forEach((img) => {
      img.addEventListener('error', () => {
        registrarErro('foto-antes-agora', img.getAttribute('src'));
        if (falhou) {
          bloco.closest('.bloco').hidden = true;
          return;
        }
        falhou = true;
        soltar();
        const outra = img.getAttribute('src') === p.foto_antes ? 'agora' : 'antes';
        const src = outra === 'agora' ? p.foto_agora : p.foto_antes;
        const ano = outra === 'agora' ? anoAgora(p) : String(p.ano_antes || '');
        palco.innerHTML = `<div class="antes__lado antes__lado--uma"><figure><img src="${src}" alt="${html(tr(outra === 'agora' ? p.alt_agora : p.alt_antes))}" /><figcaption class="legenda">${html(ano)}</figcaption></figure></div>`;
        palco.querySelector('img').addEventListener('error', () => {
          registrarErro('foto-antes-agora', src);
          bloco.closest('.bloco').hidden = true;
        });
      });
      img.addEventListener('load', () => {
        if (++carregadas < 2 || p.alinhado === false || !palco.querySelector('.comparador')) return;
        const [a, b] = imgs.map((i) => i.naturalWidth / i.naturalHeight);
        if (Math.abs(a - b) / Math.max(a, b) > DIFERENCA_MAXIMA) {
          soltar();
          palco.innerHTML = ladoALado(p);
        } else palco.querySelector('.comparador').style.aspectRatio = `${imgs[0].naturalWidth} / ${imgs[0].naturalHeight}`;
      });
    });
  }

  // Arrastar com o dedo (horizontal); a rolagem vertical da página continua livre (touch-action)
  function ligarArraste() {
    const c = palco.querySelector('.comparador');
    const faixa = c.querySelector('.comparador__faixa');
    const posicionar = (pct) => {
      const v = Math.max(0, Math.min(100, pct));
      c.style.setProperty('--pos', `${v}%`);
      faixa.value = String(Math.round(v));
    };
    const peloDedo = (e) => {
      const r = c.getBoundingClientRect();
      posicionar(((e.clientX - r.left) / r.width) * 100);
    };
    let arrastando = false;
    const inicio = (e) => {
      arrastando = true;
      dicaTl?.kill();
      c.setPointerCapture?.(e.pointerId);
      peloDedo(e);
    };
    const mover = (e) => arrastando && peloDedo(e);
    const fim = () => (arrastando = false);
    c.addEventListener('pointerdown', inicio);
    c.addEventListener('pointermove', mover);
    c.addEventListener('pointerup', fim);
    c.addEventListener('pointercancel', fim);
    faixa.addEventListener('input', () => (dicaTl?.kill(), posicionar(Number(faixa.value))));
    return () => dicaTl?.kill();
  }

  miniaturas.innerHTML =
    pares.length > 1
      ? pares
          .map(
            (p, i) => `<button class="antes__mini" data-par="${i}" aria-pressed="${i === 0}">
              <img src="${p.foto_agora}" alt="" loading="lazy" /><span>${html(String(p.ano_antes || ''))} · ${html(anoAgora(p))}</span></button>`
          )
          .join('')
      : '';
  miniaturas.hidden = pares.length < 2;
  const aoEscolher = (e) => {
    const b = e.target.closest('[data-par]');
    if (b) mostrar(Number(b.dataset.par));
  };
  miniaturas.addEventListener('click', aoEscolher);
  if (pares.length) mostrar(0);

  return {
    /** Quando o bloco aparece: a linha vai e volta uma vez, para mostrar que dá para arrastar */
    dica() {
      const c = palco.querySelector('.comparador');
      if (!c || calmo()) return;
      const v = { p: 50 };
      dicaTl?.kill();
      dicaTl = gsap
        .timeline({ onUpdate: () => c.isConnected && c.style.setProperty('--pos', `${v.p}%`) })
        .to(v, { p: 36, duration: 0.7, ease: 'sine.inOut', delay: 0.4 })
        .to(v, { p: 64, duration: 1, ease: 'sine.inOut' })
        .to(v, { p: 50, duration: 0.7, ease: 'sine.inOut' });
    },
    destruir() {
      soltar();
      miniaturas.removeEventListener('click', aoEscolher);
    },
  };
}
