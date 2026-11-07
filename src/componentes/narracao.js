// Narração em áudio e vídeo em Libras de um lugar (na página do lugar).
// - "Ouvir": toca o mp3 do lugar no idioma da tela (audio/<idioma>/<id>.mp3), com play/pausa.
//   O texto aparece embaixo, com a frase que está sendo falada em destaque (negrito e sublinhado).
// - "Libras": vídeo gravado por intérprete (libras/<id>.mp4), num canto da tela. Toca junto com a
//   narração. Sem vídeo, o botão não aparece. Nada de avatar: só vídeo de intérprete de verdade.
// - Narração ligada no painel de acessibilidade: começa sozinha quando a página abre.
// - Sair da página, trocar de lugar, trocar de idioma ou o modo descanso: tudo para.
// Áudio novo só aparece no totem depois de "revisado": true (no modo de edição aparece antes).
import { estado, em, emitir } from '../core/estado.js';
import { t, html } from '../core/i18n.js';
import { modoEdicao } from '../core/lugares.js';
import { registrarErro } from '../core/registro.js';
import { preferencias } from '../core/acessibilidade.js';
import { textoDaNarracao, frasesDaNarracao } from '../core/narracao-texto.js';

const ICONE_PLAY = '<svg class="dock__icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>';
const ICONE_PAUSA = '<svg class="dock__icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor"/></svg>';
const ICONE_LIBRAS = '<svg class="dock__icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21v-6.5L5.2 10a1.4 1.4 0 0 1 2.3-1.6L9.5 11V4.2a1.3 1.3 0 0 1 2.6 0V10m0-1.2V3.3a1.3 1.3 0 0 1 2.6 0V10m0-.6V4.6a1.3 1.3 0 0 1 2.6 0V12c0 4.4-1.6 9-6.3 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Arquivo de áudio do lugar no idioma atual, se puder aparecer */
function audioDe(lugar) {
  const a = lugar?.audio;
  if (!a?.[estado.idioma]) return '';
  return a.revisado || modoEdicao ? a[estado.idioma] : '';
}

/**
 * pagina: o elemento da página do lugar. Cria os botões na barra de baixo (.dock), o texto da
 * narração e a janela de Libras. Retorna { preparar(lugar), parar() }.
 */
export function montarNarracao(pagina) {
  const dock = pagina.querySelector('.dock');
  const botaoOuvir = dock.querySelector('[data-acao="ouvir"]');
  const botaoLibras = dock.querySelector('[data-acao="libras"]');
  const legenda = document.createElement('div');
  legenda.className = 'narracao';
  legenda.setAttribute('aria-live', 'off');
  legenda.hidden = true;
  const janela = document.createElement('div');
  janela.className = 'libras';
  janela.hidden = true;
  janela.innerHTML = `<video muted playsinline preload="none"></video><p class="libras__rotulo legenda"></p>`;
  pagina.append(legenda, janela);
  const audio = new Audio();
  audio.preload = 'none';
  const video = janela.querySelector('video');

  let lugar = null;
  let frases = [];
  let pesos = [];
  let librasAberta = false;

  function escreverBotoes() {
    const tocando = !audio.paused && !audio.ended;
    botaoOuvir.innerHTML = `${tocando ? ICONE_PAUSA : ICONE_PLAY}<span>${html(t(tocando ? 'a11y.pausar' : 'a11y.ouvir'))}</span>`;
    botaoOuvir.setAttribute('aria-pressed', String(tocando));
    botaoLibras.innerHTML = `${ICONE_LIBRAS}<span>${html(t('a11y.librasBotao'))}</span>`;
    botaoLibras.setAttribute('aria-pressed', String(librasAberta));
    janela.querySelector('.libras__rotulo').textContent = t('a11y.librasBotao');
  }

  /** Texto da narração, uma frase por vez em destaque (o tempo de cada uma segue o tamanho dela) */
  function escreverLegenda() {
    legenda.innerHTML = `<p>${frases.map((f, i) => `<span data-frase="${i}">${html(f)}</span>`).join(' ')}</p>`;
  }
  function marcarFrase() {
    if (!frases.length || !audio.duration) return;
    const p = audio.currentTime / audio.duration;
    let soma = 0;
    let atual = frases.length - 1;
    for (let i = 0; i < pesos.length; i++) {
      soma += pesos[i];
      if (p < soma) {
        atual = i;
        break;
      }
    }
    legenda.querySelectorAll('[data-frase]').forEach((s) => s.classList.toggle('agora', Number(s.dataset.frase) === atual));
  }

  function mostrarLibras(sim) {
    librasAberta = sim && !!lugar?.video_libras;
    janela.hidden = !librasAberta;
    if (!librasAberta) video.pause();
    else {
      if (video.getAttribute('src') !== lugar.video_libras) video.src = lugar.video_libras;
      emitir('uso', { libras: true });
      // Junto com a narração; sem narração (ou sem áudio), o vídeo toca sozinho
      if (!audio.paused) {
        video.currentTime = audio.currentTime;
        video.play().catch(() => {});
      } else if (!audioDe(lugar)) video.play().catch(() => {});
    }
    escreverBotoes();
  }

  function tocar() {
    const src = audioDe(lugar);
    if (!src) return;
    if (audio.getAttribute('src') !== src) audio.src = src;
    legenda.hidden = false;
    audio.play().catch(() => {});
    emitir('uso', { audio: true });
    if (preferencias.libras && lugar.video_libras && !librasAberta) mostrarLibras(true);
    if (librasAberta) {
      video.currentTime = audio.currentTime;
      video.play().catch(() => {});
    }
  }

  function pausar() {
    audio.pause();
    video.pause();
  }

  function parar() {
    audio.pause();
    if (audio.getAttribute('src')) audio.currentTime = 0;
    video.pause();
    legenda.hidden = true;
    mostrarLibras(false);
    escreverBotoes();
  }

  audio.addEventListener('play', escreverBotoes);
  audio.addEventListener('pause', escreverBotoes);
  audio.addEventListener('timeupdate', marcarFrase);
  audio.addEventListener('ended', () => {
    legenda.hidden = true;
    video.pause();
    escreverBotoes();
  });
  // Arquivo faltando: o botão some, sem mensagem para o visitante
  audio.addEventListener('error', () => {
    if (!audio.getAttribute('src')) return;
    registrarErro('audio', audio.getAttribute('src'));
    botaoOuvir.hidden = true;
    legenda.hidden = true;
  });
  video.addEventListener('error', () => {
    if (!video.getAttribute('src')) return;
    registrarErro('video-libras', video.getAttribute('src'));
    botaoLibras.hidden = true;
    mostrarLibras(false);
  });

  botaoOuvir.addEventListener('click', () => (audio.paused || audio.ended ? tocar() : pausar()));
  botaoLibras.addEventListener('click', () => mostrarLibras(!librasAberta));

  function preparar(l, { automatico = true } = {}) {
    parar();
    lugar = l;
    audio.removeAttribute('src');
    video.removeAttribute('src');
    const texto = textoDaNarracao(l, estado.idioma);
    frases = frasesDaNarracao(texto);
    const total = frases.reduce((s, f) => s + f.length, 0) || 1;
    pesos = frases.map((f) => f.length / total);
    escreverLegenda();
    botaoOuvir.hidden = !audioDe(l) || !texto;
    botaoLibras.hidden = !l.video_libras;
    escreverBotoes();
    // Narração ligada no painel: começa sozinha, depois que a página apareceu
    if (automatico && preferencias.narracao && !botaoOuvir.hidden) setTimeout(() => lugar === l && audio.paused && tocar(), 900);
    else if (automatico && preferencias.libras && l.video_libras && botaoOuvir.hidden) mostrarLibras(true);
  }

  em('idioma', () => lugar && preparar(lugar, { automatico: false }));
  em('sair-do-lugar', () => {
    parar();
    lugar = null;
  });
  em('descanso', parar);
  // Só reage quando a própria opção muda (mudar o contraste não para o áudio que está tocando)
  let antes = { narracao: preferencias.narracao, libras: preferencias.libras };
  em('acessibilidade', (p) => {
    const mudouNarracao = p.narracao !== antes.narracao;
    const mudouLibras = p.libras !== antes.libras;
    antes = { narracao: p.narracao, libras: p.libras };
    if (!lugar) return;
    if (mudouNarracao && p.narracao && audio.paused && !botaoOuvir.hidden) tocar();
    if (mudouNarracao && !p.narracao && !audio.paused) pausar();
    if (mudouLibras && lugar.video_libras) mostrarLibras(p.libras);
  });

  return { preparar, parar };
}
