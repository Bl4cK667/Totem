// Gera os áudios da narração (mp3) a partir dos textos do data/lugares.json.
//   npm run audios              → lugares publicados, nos três idiomas
//   npm run audios -- --todos   → também os rascunhos
//   npm run audios -- lago-buritis   → só um lugar
// Usa as vozes do próprio Windows (sem internet) e o ffmpeg para converter em mp3.
// Os arquivos vão para audio/pt/, audio/en/ e audio/es/ e o caminho é escrito no lugares.json.
// IMPORTANTE: cada áudio novo fica com "revisado": false e só aparece no totem depois que alguém
// ouvir e mudar para true (no modo de edição, ?edicao, o botão "Ouvir" já aparece para revisar).
// Voz que falta (ex.: espanhol): Configurações do Windows > Hora e idioma > Fala > Adicionar vozes.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { textoDaNarracao } from '../src/core/narracao-texto.js';

const CULTURA = { pt: 'pt-BR', en: 'en-US', es: 'es-ES' };
const args = process.argv.slice(2);
const todos = args.includes('--todos');
const so = args.find((a) => !a.startsWith('--'));

function acharFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch {
    console.error('Falta o ffmpeg. Instale com:  winget install Gyan.FFmpeg  (e abra o terminal de novo)');
    process.exit(1);
  }
}

/** Vozes instaladas no Windows: { 'pt': 'Microsoft Maria Desktop', ... } */
function vozes() {
  const ps = `Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name + '|' + $_.VoiceInfo.Culture.Name }`;
  const saida = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  const achadas = {};
  for (const linha of saida.split(/\r?\n/).filter(Boolean)) {
    const [nome, cultura] = linha.split('|');
    const idioma = cultura.slice(0, 2).toLowerCase();
    if (!achadas[idioma] || cultura === CULTURA[idioma]) achadas[idioma] = nome;
  }
  return achadas;
}

function falar(texto, voz, wav) {
  const arqTexto = join(tmpdir(), `totem-narracao-${process.pid}.txt`);
  writeFileSync(arqTexto, texto, 'utf8');
  // Um pouco mais devagar que o normal (-1): fica mais claro num lugar público
  const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SelectVoice('${voz}'); $s.Rate = -1; $s.SetOutputToWaveFile('${wav}'); $s.Speak([IO.File]::ReadAllText('${arqTexto}', [Text.Encoding]::UTF8)); $s.Dispose()`;
  execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
  rmSync(arqTexto, { force: true });
}

const ffmpeg = acharFfmpeg();
const disponiveis = vozes();
const dados = JSON.parse(readFileSync('data/lugares.json', 'utf8'));
const faltaVoz = new Set();
let feitos = 0;

for (const l of dados.lugares) {
  if (so && l.id !== so) continue;
  if (!so && !todos && l.status !== 'publicado') continue;
  l.audio = { pt: '', en: '', es: '', revisado: false, ...l.audio };
  for (const idioma of ['pt', 'en', 'es']) {
    const texto = textoDaNarracao(l, idioma);
    if (!texto) continue;
    const voz = disponiveis[idioma];
    if (!voz) {
      faltaVoz.add(idioma);
      continue;
    }
    mkdirSync(`audio/${idioma}`, { recursive: true });
    const wav = join(tmpdir(), `totem-${l.id}-${idioma}.wav`);
    const mp3 = `audio/${idioma}/${l.id}.mp3`;
    falar(texto, voz, wav);
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '80k', mp3]);
    rmSync(wav, { force: true });
    l.audio[idioma] = mp3;
    l.audio.revisado = false;
    feitos++;
    console.log(`ok  ${mp3}  (${voz})`);
  }
}

writeFileSync('data/lugares.json', JSON.stringify(dados, null, 2) + '\n');
console.log(`\n${feitos} áudio(s) gerado(s). Ouça cada um e, se estiver bom, mude "revisado" para true no lugares.json.`);
if (faltaVoz.size) console.log(`Sem voz do Windows para: ${[...faltaVoz].join(', ')}. Instale em Configurações > Hora e idioma > Fala > Adicionar vozes e rode de novo.`);
if (!existsSync('audio')) console.log('Nenhum áudio gerado.');
