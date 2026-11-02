// Modo descanso: depois de N segundos sem toque, chama aoDescansar().
// Enquanto o visitante usa o Street View (iframe), os toques não chegam
// à página — por isso o prazo triplica quando o iframe está em foco.

export function iniciarDescanso({ segundos, aoDescansar }) {
  let ultimo = performance.now();
  const tocar = () => (ultimo = performance.now());

  ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, tocar, { passive: true, capture: true })
  );
  // Iframe recebeu o toque → a janela perde o foco
  window.addEventListener('blur', tocar);

  setInterval(() => {
    const noIframe = document.activeElement?.tagName === 'IFRAME';
    const limite = segundos * 1000 * (noIframe ? 3 : 1);
    if (performance.now() - ultimo > limite) {
      tocar();
      if (noIframe) document.activeElement.blur();
      aoDescansar();
    }
  }, 1000);

  return { reiniciar: tocar };
}
