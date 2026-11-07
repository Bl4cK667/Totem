// Registros do totem, gravados pelo servidor local (scripts/servidor.js) na pasta logs/:
// - logs/erros.txt: arquivo de foto, áudio ou vídeo que faltou, dado que não carregou etc.
// - logs/uso.csv: data/hora, lugar aberto, idioma e se usou o áudio. Nada que identifique pessoas.
// Sem o servidor (ex.: site publicado na Vercel), os registros só vão para o console, sem erro.

const avisados = new Set(); // o mesmo problema é registrado uma vez por carregamento da página

function enviar(caminho, dados) {
  try {
    fetch(caminho, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados), keepalive: true }).catch(() => {});
  } catch {
    /* sem servidor local: tudo bem */
  }
}

/** Problema discreto (o visitante não vê nada): vai para logs/erros.txt */
export function registrarErro(tipo, detalhe = '') {
  const chave = `${tipo}|${detalhe}`;
  if (avisados.has(chave)) return;
  avisados.add(chave);
  console.warn(`[totem] ${tipo}: ${detalhe}`);
  enviar('api/erro', { tipo, detalhe: String(detalhe).slice(0, 500), tela: location.pathname });
}

/** Uma visita a um lugar: vai para logs/uso.csv */
export function registrarUso({ lugar, idioma, audio, libras = false, segundos = 0 }) {
  enviar('api/uso', { lugar, idioma, audio: !!audio, libras: !!libras, segundos: Math.round(segundos) });
}

/** "Estou vivo": o monitor do totem reabre o navegador se a página parar de responder */
export function iniciarBatimento() {
  const bater = () => enviar('api/batimento', {});
  bater();
  setInterval(bater, 15000);
}

// Erros de JavaScript não tratados também vão para o arquivo (o totem continua rodando)
window.addEventListener('error', (e) => {
  if (e.target && e.target !== window && (e.target.src || e.target.href)) return; // arquivos: tratados onde são usados
  registrarErro('script', `${e.message} (${e.filename?.split('/').pop()}:${e.lineno})`);
});
window.addEventListener('unhandledrejection', (e) => registrarErro('script', String(e.reason?.message || e.reason)));
