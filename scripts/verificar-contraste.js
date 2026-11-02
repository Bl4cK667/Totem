// Verifica o contraste (WCAG) de todos os pares texto/fundo usados no totem.
// Uso: npm run contraste
// Mínimo AA: 4,5 para texto normal | 3,0 para texto grande (títulos, números)

const cores = {
  noite: '#120d09',
  'terra-900': '#2a1d14',
  'terra-800': '#3a2a1e',
  'terra-700': '#5e4532',
  'mata-900': '#15291f',
  'mata-800': '#1f3b2c',
  ouro: '#c9a24a',
  'ouro-claro': '#e4c77e',
  'ouro-texto': '#7a5a17',
  creme: '#f6f1e7',
  branco: '#ffffff',
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mistura = (frente, alfa, fundo) => frente.map((c, i) => Math.round(c * alfa + fundo[i] * (1 - alfa)));
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const razao = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const c = (n) => hex(cores[n]);
const creme74 = (fundo) => mistura(c('creme'), 0.74, fundo);
// Pior caso de texto sobre foto: véu escuro com a opacidade dada sobre uma foto branca
const veu = (alfa) => mistura(c('noite'), alfa, c('branco'));

const pares = [
  // [descrição, texto, fundo, mínimo]
  ['Texto creme / fundo noite (vitrine)', c('creme'), c('noite'), 4.5],
  ['Texto secundário / fundo noite', creme74(c('noite')), c('noite'), 4.5],
  ['Dourado claro / fundo noite (legendas)', c('ouro-claro'), c('noite'), 4.5],
  ['Texto creme / marrom 900 (capítulos escuros)', c('creme'), c('terra-900'), 4.5],
  ['Texto secundário / marrom 900', creme74(c('terra-900')), c('terra-900'), 4.5],
  ['Dourado claro / marrom 900', c('ouro-claro'), c('terra-900'), 4.5],
  ['Texto creme / verde 800 (curiosidades)', c('creme'), c('mata-800'), 4.5],
  ['Dourado claro / verde 800', c('ouro-claro'), c('mata-800'), 4.5],
  ['Texto creme / verde 900 (cartões)', c('creme'), c('mata-900'), 4.5],
  ['Texto secundário / verde 900', creme74(c('mata-900')), c('mata-900'), 4.5],
  ['Dourado claro / verde 900', c('ouro-claro'), c('mata-900'), 4.5],
  ['Marrom 900 / creme (capítulos claros)', c('terra-900'), c('creme'), 4.5],
  ['Marrom 700 / creme (texto secundário)', c('terra-700'), c('creme'), 4.5],
  ['Dourado escuro / creme (legendas)', c('ouro-texto'), c('creme'), 4.5],
  ['Marrom 900 / botão dourado', c('terra-900'), c('ouro-claro'), 4.5],
  ['Creme / botão marrom', c('creme'), c('terra-900'), 4.5],
  ['Texto creme sobre foto (véu 80%, pior caso)', c('creme'), veu(0.8), 4.5],
  ['Dourado claro sobre foto (véu 80%, pior caso)', c('ouro-claro'), veu(0.8), 4.5],
  ['Etiqueta antes/depois (véu 78%, pior caso)', c('creme'), veu(0.78), 4.5],
  ['Título sobre foto (véu 72%, texto grande)', c('creme'), veu(0.72), 3],
];

let falhas = 0;
for (const [nome, txt, fundo, min] of pares) {
  const r = razao(txt, fundo);
  const ok = r >= min;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${r.toFixed(2).padStart(6)} : 1  (mín. ${min})  ${nome}`);
}
console.log(falhas ? `\n${falhas} par(es) abaixo do mínimo.` : '\nTodos os pares passam no WCAG AA.');
process.exit(falhas ? 1 : 0);
