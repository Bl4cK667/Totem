// Texto da narração de um lugar (o que a voz fala e o que aparece na tela junto com a fala).
// Sem dependências: usado pelo totem e pelo scripts/gerar-audios.js.
// - Se o lugar tiver textos.<idioma>.narracao, usa esse texto (curto e natural, escrito para falar).
// - Se não, junta: nome, frase de abertura e descrição.
// Sem texto no idioma, não há narração nesse idioma (não fala português para quem escolheu inglês).

const limpar = (s) => String(s || '').replace(/\s*\[CONFIRMAR\]/g, '').replace(/\s+/g, ' ').trim();
const ponto = (s) => (s && !/[.!?…]$/.test(s) ? `${s}.` : s);

export function textoDaNarracao(lugar, idioma) {
  const t = lugar.textos?.[idioma] || {};
  if (limpar(t.narracao)) return limpar(t.narracao);
  if (!limpar(t.descricao)) return '';
  const nome = limpar(lugar.nome?.[idioma]);
  return [ponto(nome), ponto(limpar(t.frase)), ponto(limpar(t.descricao))].filter(Boolean).join(' ');
}

/** Frases da narração (a tela destaca uma de cada vez) */
export function frasesDaNarracao(texto) {
  return (texto.match(/[^.!?…]+[.!?…]+["”]?\s*/g) || [texto]).map((f) => f.trim()).filter(Boolean);
}
