// Modo descanso: depois de N segundos sem toque, chama aoDescansar().
// Os toques dentro do Street View (iframe) não chegam à página: um toque só
// aparece como foco no iframe, então o foco é devolvido a cada verificação
// para notar o próximo.

export function iniciarDescanso({ segundos, aoDescansar }) {
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
    if (performance.now() - ultimo > segundos * 1000) {
      tocar();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      aoDescansar();
    }
  }, 1000);

  return { reiniciar: tocar };
}
