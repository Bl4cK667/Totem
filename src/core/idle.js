// Modo descanso: depois de N segundos sem toque, chama aoDescansar().
// Com o Street View na tela, o prazo é outro (segundosStreetView). Os toques
// dentro do iframe não chegam à página: um toque só aparece como foco no
// iframe, então o foco é devolvido a cada verificação para notar o próximo.
import { estado } from './estado.js';

function streetViewNaTela() {
  if (estado.tela !== 'local') return false;
  if (document.fullscreenElement) return true;
  const r = document.querySelector('.streetview-moldura')?.getBoundingClientRect();
  return !!r && r.bottom > 0 && r.top < innerHeight;
}

export function iniciarDescanso({ segundos, segundosStreetView, aoDescansar }) {
  let ultimo = performance.now();
  const tocar = () => (ultimo = performance.now());

  ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, tocar, { passive: true, capture: true })
  );
  // Iframe recebeu o toque → a janela perde o foco
  window.addEventListener('blur', tocar);

  setInterval(() => {
    if (document.activeElement?.tagName === 'IFRAME') {
      tocar();
      document.activeElement.blur();
    }
    const limite = (streetViewNaTela() ? segundosStreetView : segundos) * 1000;
    if (performance.now() - ultimo > limite) {
      tocar();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      aoDescansar();
    }
  }, 1000);

  return { reiniciar: tocar };
}
