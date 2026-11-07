// Confere data/lugares.json e escreve CONFIRMAR.md e FALTA-CONTEUDO.md.
// Uso: npm run conteudo
// - Erros (o totem pode mostrar algo errado): o comando termina com falha.
// - Avisos: viram itens das listas, para a Prefeitura e para quem busca fotos, áudios e vídeos.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const IDIOMAS = ['pt', 'en', 'es'];
const NOME_IDIOMA = { pt: 'português', en: 'inglês', es: 'espanhol' };
const STATUS = ['publicado', 'rascunho'];

const dados = JSON.parse(readFileSync('data/lugares.json', 'utf8'));
const interfaceTotem = JSON.parse(readFileSync('data/locais.json', 'utf8'));
const lugares = [...dados.lugares].sort((a, b) => a.numero - b.numero);
const categorias = new Set(dados.categorias.map((c) => c.id));
const erros = [];

const vazio = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
const nome = (l) => (l.nome?.pt || l.id).replace(/\s*\[CONFIRMAR\]/g, '');
const frases = (t) => (t.match(/[^.!?]+[.!?]+/g) || (t.trim() ? [t] : [])).length;
const arquivoExiste = (f) => !f || existsSync(f);

// --- Conferência ----------------------------------------------------------------------
const ids = new Set();
const numeros = new Set();
for (const l of lugares) {
  const onde = `"${l.id}"`;
  if (ids.has(l.id)) erros.push(`${onde}: id repetido`);
  ids.add(l.id);
  if (numeros.has(l.numero)) erros.push(`${onde}: número ${l.numero} repetido`);
  numeros.add(l.numero);
  if (!/^[a-z0-9-]+$/.test(l.id)) erros.push(`${onde}: o id só pode ter letras minúsculas, números e hífen`);
  if (!STATUS.includes(l.status)) erros.push(`${onde}: status deve ser "publicado" ou "rascunho"`);
  if (!categorias.has(l.categoria)) erros.push(`${onde}: categoria "${l.categoria}" não existe na lista de categorias`);
  if (l.status === 'publicado') {
    if (!Number.isFinite(l.latitude) || !Number.isFinite(l.longitude)) erros.push(`${onde}: publicado sem latitude/longitude (não teria pin)`);
    if (!l.foto?.arquivo) erros.push(`${onde}: publicado sem foto (deve ficar como rascunho até ter foto real)`);
    if (vazio(l.textos?.pt?.descricao)) erros.push(`${onde}: publicado sem descrição em português`);
  }
  const arquivos = [l.foto?.arquivo, ...(l.galeria || []).map((g) => g.arquivo), ...(l.antes_agora || []).flatMap((p) => [p.foto_antes, p.foto_agora]), ...IDIOMAS.map((i) => l.audio?.[i]), l.video_libras];
  for (const f of arquivos) if (!arquivoExiste(f)) erros.push(`${onde}: arquivo não encontrado: ${f}`);
  const d = l.textos?.pt?.descricao || '';
  if (frases(d) > 4) erros.push(`${onde}: a descrição tem ${frases(d)} frases (máximo 4)`);
  if ((l.textos?.pt?.dados || []).length > 3) erros.push(`${onde}: mais de 3 dados rápidos`);
  if ((l.textos?.pt?.curiosidades || []).length > 3) erros.push(`${onde}: mais de 3 curiosidades`);
}

// --- CONFIRMAR.md -----------------------------------------------------------------------
const marcas = (texto) => (texto.match(/[^.!?]*\[CONFIRMAR\][^.!?]*[.!?]?/g) || []).map((s) => s.replace(/\s*\[CONFIRMAR\]/g, '').trim());
const marcasInterface = Object.entries(interfaceTotem.interface.pt).flatMap(([k, v]) => [].concat(v).filter((t) => typeof t === 'string' && t.includes('[CONFIRMAR]')).map((t) => `${k}: ${t.replace(/\s*\[CONFIRMAR\]/g, '')}`));

let c = `# O que a Prefeitura precisa revisar

Este arquivo é gerado pelo comando \`npm run conteudo\` a partir de \`data/lugares.json\`. Não edite à mão: corrija o lugares.json e rode o comando de novo.

Como marcar como revisado: no \`data/lugares.json\`, mude \`"revisado_por_prefeitura"\` para \`true\` e apague as marcas \`[CONFIRMAR]\` e os itens de \`"pendencias"\` já resolvidos.

**Regra:** nada no totem foi inventado. Os textos vieram do site oficial da Prefeitura de Canaã dos Carajás. Mesmo assim, todo dado (datas, áreas, números, nomes) precisa da confirmação da Prefeitura antes da entrega.

`;
const publicados = lugares.filter((l) => l.status === 'publicado');
const rascunhos = lugares.filter((l) => l.status !== 'publicado');
c += `## Resumo\n\n- No totem hoje: ${publicados.length} lugares (${publicados.map(nome).join(', ')}).\n- Rascunhos (não aparecem no totem): ${rascunhos.length}.\n- Revisados pela Prefeitura: ${lugares.filter((l) => l.revisado_por_prefeitura).length} de ${lugares.length}.\n\n`;

for (const l of lugares) {
  const pt = l.textos?.pt || {};
  c += `## ${String(l.numero).padStart(2, '0')}. ${nome(l)} (${l.status}${l.revisado_por_prefeitura ? ', revisado' : ', NÃO revisado'})\n\n`;
  const itens = [];
  for (const p of l.pendencias || []) itens.push(p);
  for (const campo of ['frase', 'descricao']) for (const m of marcas(pt[campo] || '')) itens.push(`Confirmar: "${m}"`);
  for (const t of pt.curiosidades || []) for (const m of marcas(t)) itens.push(`Confirmar: "${m}"`);
  if (/\[CONFIRMAR\]/.test(l.nome?.pt || '')) itens.push(`Confirmar o nome: "${nome(l)}"`);
  if (!l.revisado_por_prefeitura && !vazio(pt.descricao)) {
    itens.push(`Conferir a descrição: "${pt.descricao.replace(/\s*\[CONFIRMAR\]/g, '')}"`);
    for (const d of pt.dados || []) itens.push(`Conferir o dado: ${d.valor} (${d.legenda})`);
    for (const t of pt.curiosidades || []) if (!/\[CONFIRMAR\]/.test(t)) itens.push(`Conferir a curiosidade: "${t}"`);
  }
  if (l.foto?.arquivo && !l.revisado_por_prefeitura) itens.push(`Autorizar o uso da foto (crédito: ${l.foto.credito || 'sem crédito'}).`);
  c += itens.length ? itens.map((i) => `- [ ] ${i}`).join('\n') + '\n\n' : 'Nada pendente.\n\n';
}
if (marcasInterface.length) c += `## Textos da interface (data/locais.json)\n\n${marcasInterface.map((i) => `- [ ] ${i}`).join('\n')}\n\n`;
c += `## Outros pontos\n\n- [ ] Traduções em inglês e espanhol: foram feitas a partir do português e precisam de uma revisão por quem fala o idioma.\n- [ ] Dicas do guia no mapa ("dica_guia" de cada lugar e "mascote.dicasMapa" no locais.json).\n- [ ] Categorias dos lugares (lista "categorias" no lugares.json).\n`;
writeFileSync('CONFIRMAR.md', c);

// --- FALTA-CONTEUDO.md ------------------------------------------------------------------
let f = `# Conteúdo que falta, lugar por lugar

Gerado pelo comando \`npm run conteudo\` a partir de \`data/lugares.json\`. Para cada item: consiga o arquivo, coloque na pasta indicada e escreva o caminho no lugares.json.

- **Fotos:** em \`fotos-originais/\` (JPG, 1600 px de largura ou mais) e rode \`npm run imagens\`. Sempre com o crédito (quem tirou a foto) e a autorização de uso.
- **Áudios:** um mp3 por lugar e por idioma, em \`audio/pt/\`, \`audio/en/\` e \`audio/es/\`.
- **Libras:** um vídeo mp4 por lugar, gravado por intérprete de Libras de verdade, em \`libras/\`.

`;
for (const l of lugares) {
  const falta = [];
  if (!Number.isFinite(l.latitude) || !Number.isFinite(l.longitude)) falta.push('Posição no mapa (latitude e longitude)');
  if (!l.foto?.arquivo) falta.push('Foto principal (real, com crédito)');
  else if (l.foto.ilustracao_do_projeto) falta.push('Foto real (hoje é a ilustração do projeto)');
  if (!l.galeria?.length) falta.push('Galeria: 3 a 6 fotos extras (opcional)');
  if (!l.antes_agora?.length) falta.push('"Antes e agora": foto antiga e foto atual do mesmo ângulo, com os anos (opcional)');
  for (const i of IDIOMAS) {
    const t = l.textos?.[i] || {};
    const sem = ['frase', 'descricao', 'curiosidades', 'dados'].filter((k) => vazio(t[k]));
    if (sem.length) falta.push(`Textos em ${NOME_IDIOMA[i]}: ${sem.join(', ')}`);
  }
  for (const i of IDIOMAS) if (!l.audio?.[i]) falta.push(`Áudio em ${NOME_IDIOMA[i]} (audio/${i}/${l.id}.mp3)`);
  if (!l.video_libras) falta.push(`Vídeo em Libras (libras/${l.id}.mp4)`);
  f += `## ${String(l.numero).padStart(2, '0')}. ${nome(l)} (${l.status})\n\n${falta.map((x) => `- [ ] ${x}`).join('\n')}\n\n`;
}
writeFileSync('FALTA-CONTEUDO.md', f);

console.log(`Lugares: ${lugares.length} (${publicados.length} publicados, ${rascunhos.length} rascunhos)`);
console.log('Escrevi CONFIRMAR.md e FALTA-CONTEUDO.md');
if (erros.length) {
  console.error(`\n${erros.length} erro(s) no lugares.json:\n- ${erros.join('\n- ')}`);
  process.exit(1);
}
console.log('lugares.json sem erros.');
