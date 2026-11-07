// Tem internet de verdade? (navigator.onLine só sabe se há cabo/Wi-Fi ligado)
// Confere de tempos em tempos num endereço do Google que responde vazio, e avisa ('rede').
// Usado só para os extras que dependem de internet (Street View). O resto do totem é local.
import { emitir } from './estado.js';

const TESTE = 'https://www.google.com/generate_204';
const INTERVALO = 60000;
let online = navigator.onLine;

export const temInternet = () => online;

async function conferir() {
  let agora = navigator.onLine;
  if (agora) {
    agora = await fetch(TESTE, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(8000) }).then(
      () => true,
      () => false
    );
  }
  if (agora !== online) {
    online = agora;
    emitir('rede', online);
  }
}

export function vigiarRede() {
  conferir();
  setInterval(conferir, INTERVALO);
  window.addEventListener('online', conferir);
  window.addEventListener('offline', conferir);
}

/** Conferência na hora (ex.: antes de abrir o Street View) */
export const conferirAgora = () => conferir().then(() => online);
