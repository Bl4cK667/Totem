// Feedback de toque: um anel dourado sutil que se expande onde o dedo toca.
import gsap from 'gsap';

export function ativarOndaDeToque(camada) {
  window.addEventListener(
    'pointerdown',
    (e) => {
      const el = document.createElement('span');
      el.className = 'toque';
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      camada.appendChild(el);
      gsap.fromTo(
        el,
        { scale: 0.2, opacity: 0.9 },
        { scale: 1.6, opacity: 0, duration: 0.9, ease: 'power2.out', onComplete: () => el.remove() }
      );
    },
    { passive: true, capture: true }
  );
}
