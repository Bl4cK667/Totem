// Slider de comparação "antes e depois": arraste o dedo sobre a foto.
// touch-action: pan-y (no CSS) deixa a rolagem vertical livre e o
// movimento horizontal fica com o slider.
import gsap from 'gsap';

export function montarAntesDepois(raiz) {
  const antes = raiz.querySelector('.comparar__antes');
  const alca = raiz.querySelector('.comparar__alca');
  const estado = { p: 50 };
  let arrastando = false;

  const aplicar = () => {
    antes.style.clipPath = `inset(0 ${100 - estado.p}% 0 0)`;
    alca.style.left = `${estado.p}%`;
  };

  const porPonteiro = (e) => {
    const r = raiz.getBoundingClientRect();
    estado.p = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100));
    aplicar();
  };

  raiz.addEventListener('pointerdown', (e) => {
    arrastando = true;
    gsap.killTweensOf(estado);
    raiz.setPointerCapture(e.pointerId);
    porPonteiro(e);
    raiz.classList.add('arrastando');
  });
  raiz.addEventListener('pointermove', (e) => arrastando && porPonteiro(e));
  const fim = () => {
    arrastando = false;
    raiz.classList.remove('arrastando');
  };
  raiz.addEventListener('pointerup', fim);
  raiz.addEventListener('pointercancel', fim);

  aplicar();

  // Pequena demonstração ao aparecer, para mostrar que dá para arrastar
  return {
    demonstrar() {
      gsap
        .timeline()
        .to(estado, { p: 28, duration: 1.1, ease: 'power2.inOut', onUpdate: aplicar })
        .to(estado, { p: 72, duration: 1.4, ease: 'power2.inOut', onUpdate: aplicar })
        .to(estado, { p: 50, duration: 1.0, ease: 'power2.inOut', onUpdate: aplicar });
    },
  };
}
