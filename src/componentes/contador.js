// Números com contador animado (anos não usam separador de milhar
// e começam perto do valor final, para não "contar desde o ano zero").
import gsap from 'gsap';

const LOCALE = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };

export function formatarNumero(valor, tipo, idioma) {
  if (tipo === 'ano') return String(Math.round(valor));
  return Math.round(valor).toLocaleString(LOCALE[idioma] || 'pt-BR');
}

export function animarContador(el, { valor, tipo, idioma }) {
  const inicio = tipo === 'ano' ? valor - 40 : 0;
  const obj = { v: inicio };
  el.textContent = formatarNumero(inicio, tipo, idioma);
  return gsap.to(obj, {
    v: valor,
    duration: 2.2,
    ease: 'power3.out',
    onUpdate: () => (el.textContent = formatarNumero(obj.v, tipo, idioma)),
  });
}
