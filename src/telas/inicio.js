// Tela inicial (vitrine): textos sobre o planeta, botão principal,
// seletor de idioma e o estado de "descanso".
// Movimento: a tela só aparece e some com um fade. A animação marcante do totem é a
// descida do planeta até o mapa (telas/transicao.js); aqui nada disputa atenção com ela.
import gsap from 'gsap';
import { menosMovimento } from '../core/estado.js';

const tela = document.querySelector('[data-tela="inicio"]');
const q = (s) => tela.querySelectorAll(s);
const dur = (s) => (menosMovimento() ? 0 : s);

let descansando = false;

export function montarInicio({ aoComecar }) {
  tela.querySelector('[data-acao="comecar"]').addEventListener('click', aoComecar);

  // No descanso, qualquer toque "acorda" a vitrine
  tela.addEventListener(
    'pointerdown',
    (e) => {
      if (!descansando) return;
      e.stopPropagation();
      definirDescanso(false);
    },
    true
  );
}

/** Entrada da vitrine: um fade só, da tela inteira */
export function entrarInicio({ descanso = false } = {}) {
  descansando = false;
  tela.classList.remove('descansando');
  tela.classList.add('ativa');
  gsap.set(q('.inicio__descanso'), { autoAlpha: 0 });
  gsap.set(q('.inicio__acoes, .inicio__subtitulo'), { autoAlpha: 1 });

  const tl = gsap.timeline();
  tl.fromTo(tela, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur(0.9), ease: 'sine.out' }, 0.2);
  if (descanso) tl.add(() => definirDescanso(true), dur(0.6));
  return tl;
}

/** Liga/desliga o modo descanso ("Toque para começar"): troca com fade, sem deslocamento */
export function definirDescanso(ligar) {
  descansando = ligar;
  tela.classList.toggle('descansando', ligar);
  const sai = ligar ? q('.inicio__acoes, .inicio__subtitulo') : q('.inicio__descanso');
  const entra = ligar ? q('.inicio__descanso') : q('.inicio__acoes, .inicio__subtitulo');
  gsap.to(sai, { autoAlpha: 0, duration: dur(0.4), ease: 'sine.out' });
  gsap.fromTo(entra, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur(0.6), delay: dur(0.2), ease: 'sine.out' });
}

/** Saída dos textos (início da transição): fade rápido, o planeta assume a cena */
export function sairInicio() {
  const tl = gsap.timeline();
  tl.to(tela, { autoAlpha: 0, duration: dur(0.45), ease: 'sine.in' }).add(() => tela.classList.remove('ativa'));
  return tl;
}
