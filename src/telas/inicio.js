// Tela inicial (vitrine): textos sobre o planeta, botão principal,
// seletor de idioma e o estado de "descanso".
// Movimento: uma entrada orquestrada só — o título sobe de dentro da máscara, linha por linha,
// e o resto chega em seguida. A saída é um fade rápido: o planeta assume a cena.
import gsap from 'gsap';
import { menosMovimento } from '../core/estado.js';
import { revelarLinhas, surgir } from '../core/movimento.js';

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

/** Entrada da vitrine: brasão e legenda, o título linha por linha, depois o convite */
export function entrarInicio({ descanso = false } = {}) {
  descansando = false;
  tela.classList.remove('descansando');
  tela.classList.add('ativa');
  gsap.set(q('.inicio__descanso'), { autoAlpha: 0 });
  gsap.set(q('.inicio__titulo .linha'), { autoAlpha: 0 });
  gsap.set(q('.inicio__topo, .inicio__sobretitulo, .inicio__subtitulo, .inicio__acoes'), { autoAlpha: 0 });

  const tl = gsap.timeline();
  tl.set(tela, { autoAlpha: 1 }, 0)
    .add(surgir(q('.inicio__topo'), { duracao: 1.2, y: -12 }), 0.25)
    .add(surgir(q('.inicio__sobretitulo')), 0.55)
    .add(revelarLinhas(q('.inicio__titulo .linha'), { duracao: 1.4, intervalo: 0.14 }), 0.7)
  // No descanso, o convite "Toque para começar" toma o lugar do subtítulo e dos botões
  if (descanso) tl.add(() => definirDescanso(true), 1.4);
  else tl.add(surgir(q('.inicio__subtitulo')), 1.35).add(surgir(q('.inicio__acoes'), { y: 26 }), 1.6);
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
  // O texto sobe e se dissolve como se a câmera já estivesse decolando; os botões descem
  if (!menosMovimento()) {
    tl.to(q('.inicio__texto'), { y: -60, duration: 0.6, ease: 'power2.in' }, 0)
      .to(q('.inicio__acoes'), { y: 40, duration: 0.6, ease: 'power2.in' }, 0);
  }
  tl.to(tela, { autoAlpha: 0, duration: dur(0.5), ease: 'sine.in' }, 0.05)
    .add(() => tela.classList.remove('ativa'))
    .set(q('.inicio__texto, .inicio__acoes'), { clearProps: 'transform' });
  return tl;
}
