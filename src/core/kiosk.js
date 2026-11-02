// Regras de totem público: bloqueia menu de contexto, seleção,
// zoom por pinça/duplo toque e atalhos de zoom do teclado.

export function ativarModoQuiosque() {
  const bloquear = (e) => e.preventDefault();

  document.addEventListener('contextmenu', bloquear);
  document.addEventListener('selectstart', bloquear);
  document.addEventListener('dragstart', bloquear);

  // Pinça (Safari/Chrome touch)
  document.addEventListener('gesturestart', bloquear);
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );

  // Ctrl + roda do mouse / Ctrl + "+" "-" "0"
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) e.preventDefault();
    },
    { passive: false }
  );
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault();
  });
}
