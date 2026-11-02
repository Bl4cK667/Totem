// Tela inicial (vitrine): textos sobre o planeta, botão principal,
// seletor de idioma e o estado de "descanso".
import gsap from 'gsap';

const tela = document.querySelector('[data-tela="inicio"]');
const q = (s) => tela.querySelectorAll(s);

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

/** Entrada animada da vitrine */
export function entrarInicio({ descanso = false } = {}) {
  descansando = false;
  tela.classList.remove('descansando');
  gsap.set(tela, { autoAlpha: 1 });
  tela.classList.add('ativa');
  gsap.set(q('.inicio__descanso'), { autoAlpha: 0 });

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo(q('.inicio__topo > *'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.4, stagger: 0.12 })
    .fromTo(q('.inicio__sobretitulo'), { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 1.2 }, 0.3)
    .fromTo(q('.inicio__titulo .linha > *'), { yPercent: 110, rotation: 2.5, transformOrigin: '0% 100%' }, { yPercent: 0, rotation: 0, duration: 1.6, stagger: 0.14 }, 0.35)
    .fromTo(q('.inicio__subtitulo'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 1.4 }, 0.8);

  if (descanso) {
    tl.add(() => definirDescanso(true), 0.9);
  } else {
    // O botão abre do centro para as pontas; clearProps devolve o :active ao CSS
    tl.fromTo(q('.inicio__acoes'), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1 }, 0.9)
      .fromTo(
        q('.inicio__botao'),
        { clipPath: 'inset(0% 46% round 999px)', scale: 0.96 },
        { clipPath: 'inset(0% 0% round 999px)', scale: 1, duration: 1.3, ease: 'expo.inOut', clearProps: 'clipPath,transform' },
        0.9
      )
      .fromTo(q('.inicio__acoes .idiomas'), { autoAlpha: 0, x: -16 }, { autoAlpha: 1, x: 0, duration: 1.2 }, 1.5);
  }
  return tl;
}

/** Liga/desliga o modo descanso ("Toque para começar") */
export function definirDescanso(ligar) {
  descansando = ligar;
  tela.classList.toggle('descansando', ligar);
  const sai = ligar ? q('.inicio__acoes, .inicio__subtitulo') : q('.inicio__descanso');
  const entra = ligar ? q('.inicio__descanso') : q('.inicio__acoes, .inicio__subtitulo');
  gsap.to(sai, { autoAlpha: 0, y: ligar ? 16 : 0, duration: 0.6, ease: 'power2.out' });
  gsap.fromTo(entra, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.2, delay: 0.3, ease: 'expo.out' });
}

/** Saída dos textos (início da transição cinematográfica) */
export function sairInicio() {
  const tl = gsap.timeline({ defaults: { ease: 'power3.in' } });
  tl.to(q('.inicio__acoes'), { autoAlpha: 0, y: 30, duration: 0.5 })
    .to(q('.inicio__titulo .linha > *'), { yPercent: -110, duration: 0.6, stagger: 0.06 }, 0)
    .to(q('.inicio__topo > *, .inicio__sobretitulo, .inicio__subtitulo'), { autoAlpha: 0, duration: 0.5 }, 0)
    .set(tela, { autoAlpha: 0 })
    .add(() => tela.classList.remove('ativa'));
  return tl;
}
