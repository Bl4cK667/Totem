// Guia do totem: guarda-parque ilustrado em SVG inline (funciona sem internet).
// Cada parte (cabeça, chapéu, olhos, boca, braços, mãos) é um grupo do SVG animado pelo GSAP:
// entrada pela direita, respiração, balanço e piscadas, gestos aleatórios e reações
// ao toque nele e nos pins do mapa. Por fora do grupo de cada gesto há um
// grupo "mola": a cada quadro ele segue o corpo com atraso e balança antes de parar.
// Nada depende de animação CSS, que o modo "menos movimento" do Windows desliga.
// O balão (creme, borda fina marrom) brota da boca e "digita" o texto letra por letra.
// No mapa, as dicas trocam sozinhas a cada 8 segundos.
import gsap from 'gsap';
import { estado, em, transicaoCurta } from '../core/estado.js';
import { t, tr, limpo, temConfirmar } from '../core/i18n.js';
import { lugaresNoMapa, textoDe, numeroDe } from '../core/lugares.js';

const raiz = document.querySelector('.mascote');
const el = (s) => raiz.querySelector(s);

const ESTRELAS_DO_TOQUE = 7;
const TEMPO_CONVITE = 6000; // ms
const TEMPO_CURIOSIDADE = 7000;
const TEMPO_DICA = 8000; // no mapa, uma frase nova a cada 8 s
const CURIOSIDADE_CURTA = 80; // caracteres: acima disso não cabe no balão pequeno da lista
// Pontos de articulação, em coordenadas do viewBox (240 × 300)
const ORIGEM = {
  tudo: '120 284', giro: '120 190', sombra: '120 286', superior: '120 236', cabeca: '120 142',
  bracoEsq: '90 162', bracoDir: '150 162', maoEsq: '72 208', maoDir: '168 208', chapeu: '66 70', chapeuCentro: '120 52',
};
// Altura da cabeça e dos ombros acima dos pés e da cintura (viewBox): base das molas
const CABECA_SOBRE_PES = 184;
const CABECA_SOBRE_CINTURA = 136;
const PES_Y = 284;
const ALTURA_DOS_PES_AO_CHAPEU = 270;
// Direção do braço esquerdo em repouso (do ombro até a mão), em graus
const BRACO_ESQ_REPOUSO = (Math.atan2(56, -18) * 180) / Math.PI;

/** Estrela de 5 pontas centrada em (cx, cy) */
function estrela(cx, cy, r) {
  const pontos = Array.from({ length: 10 }, (_, i) => {
    const raio = i % 2 ? r * 0.42 : r;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${(cx + Math.cos(a) * raio).toFixed(2)},${(cy + Math.sin(a) * raio).toFixed(2)}`;
  });
  return pontos.join(' ');
}

const SVG = `
<svg class="mascote__svg" viewBox="0 0 240 300" aria-hidden="true" data-rosto="normal">
  <defs>
    <radialGradient id="m-g-halo"><stop offset="0" stop-color="#e4c77e" stop-opacity="0.2"/><stop offset="1" stop-color="#e4c77e" stop-opacity="0"/></radialGradient>
    <radialGradient id="m-g-sombra"><stop offset="0" stop-color="#120d09" stop-opacity="0.42"/><stop offset="1" stop-color="#120d09" stop-opacity="0"/></radialGradient>
    <radialGradient id="m-g-pele" cx="0.4" cy="0.34" r="0.78"><stop offset="0" stop-color="#e8bb8d"/><stop offset="1" stop-color="#c58f61"/></radialGradient>
    <linearGradient id="m-g-camisa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f7d5b"/><stop offset="1" stop-color="#2c4f39"/></linearGradient>
    <linearGradient id="m-g-manga" gradientUnits="userSpaceOnUse" x1="60" y1="150" x2="180" y2="225"><stop offset="0" stop-color="#46735a"/><stop offset="1" stop-color="#335b43"/></linearGradient>
    <linearGradient id="m-g-chapeu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ead7a4"/><stop offset="1" stop-color="#c9a24a"/></linearGradient>
    <linearGradient id="m-g-calca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4a33"/><stop offset="1" stop-color="#4a3323"/></linearGradient>
    <linearGradient id="m-g-ouro" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0dca6"/><stop offset="1" stop-color="#c9a24a"/></linearGradient>
    <clipPath id="m-clip-tronco"><path d="M84 168C84 150 100 142 120 142S156 150 156 168L164 226C165 238 156 244 146 244H94C84 244 75 238 76 226Z"/></clipPath>
  </defs>

  <!-- brilho claro atrás do corpo: separa o personagem de fotos escuras -->
  <ellipse cx="120" cy="158" rx="116" ry="140" fill="url(#m-g-halo)"/>
  <ellipse class="m-sombra" cx="120" cy="286" rx="74" ry="10" fill="url(#m-g-sombra)"/>

  <g class="m-tudo"><g class="m-giro">
    <!-- pernas e botas -->
    <path class="m-c" d="M92 232H114V268H92Z" fill="url(#m-g-calca)"/>
    <path class="m-c" d="M126 232H148V268H126Z" fill="url(#m-g-calca)"/>
    <path class="m-bota" d="M90 260H116V278A6 6 0 0 1 110 284H82A8 8 0 0 1 74 276C74 268 82 266 90 260Z" fill="#3a2a1e"/>
    <path class="m-bota" d="M150 260H124V278A6 6 0 0 0 130 284H158A8 8 0 0 0 166 276C166 268 158 266 150 260Z" fill="#3a2a1e"/>
    <path d="M92 266H114M126 266H148" stroke="#c9a24a" stroke-width="2" stroke-linecap="round"/>

    <g class="m-superior">
      <!-- pescoço e tronco -->
      <path d="M106 130H134V152H106Z" fill="#b98255"/>
      <path class="m-c" d="M84 168C84 150 100 142 120 142S156 150 156 168L164 226C165 238 156 244 146 244H94C84 244 75 238 76 226Z" fill="url(#m-g-camisa)"/>
      <g clip-path="url(#m-clip-tronco)">
        <ellipse cx="100" cy="160" rx="22" ry="12" fill="#f6f1e7" opacity="0.08"/>
        <path d="M120 170V226" stroke="#1f3b2c" stroke-width="2"/>
        <circle cx="120" cy="186" r="2.4" fill="#e4c77e"/>
        <circle cx="120" cy="204" r="2.4" fill="#e4c77e"/>
        <!-- bolso -->
        <path d="M86 182H108V202Q97 208 86 202Z" fill="#335b43"/>
        <path d="M84 180H110L109 188Q97 193 85 188Z" fill="#3f6b4e"/>
        <!-- cinto -->
        <rect x="70" y="224" width="100" height="10" fill="#2a1d14"/>
        <rect x="111" y="222" width="18" height="14" rx="3" fill="url(#m-g-ouro)"/>
        <rect x="116" y="226" width="8" height="6" rx="1.5" fill="#2a1d14"/>
      </g>

      <!-- lenço amarelo -->
      <path class="m-c" d="M96 146Q120 160 144 146L147 154L120 182L93 154Z" fill="#e4c77e"/>
      <path d="M99 150Q120 162 141 150L120 174Z" fill="#f0dca6" opacity="0.6"/>

      <!-- brasão da prefeitura no peito -->
      <g transform="translate(142 196) scale(0.24) translate(-100 -100)">
        <path d="M100 56L136 70V106C136 128 120 140 100 148C80 140 64 128 64 106V70Z" fill="url(#m-g-ouro)" stroke="#7a5a17" stroke-width="4"/>
        <path d="M64 108C78 98 88 104 100 94C112 104 122 98 136 108C135 128 120 140 100 148C80 140 65 128 64 108Z" fill="#3f6b4e"/>
        <polygon points="${estrela(100, 82, 18)}" fill="#2a1d14"/>
      </g>

      <!-- braço esquerdo (aponta e ajeita o chapéu), com distintivo na manga.
           Grupo de fora: mola (atraso); de dentro: gestos. A mão gira sozinha no pulso. -->
      <g class="m-braco-esq-mola"><g class="m-braco-esq">
        <path class="m-braco m-braco--borda" d="M90 162Q68 186 72 212"/>
        <path class="m-braco" d="M90 162Q68 186 72 212"/>
        <circle cx="78" cy="179" r="6.5" fill="url(#m-g-ouro)" stroke="#7a5a17" stroke-width="1.2"/>
        <circle cx="78" cy="179" r="3.2" fill="#3f6b4e"/>
        <ellipse cx="72" cy="207" rx="11.5" ry="4.2" fill="#2c4f39"/>
        <g class="m-mao-esq">
          <!-- dedo indicador: só aparece quando ele aponta -->
          <g class="m-dedo" opacity="0">
            <path d="M72 218L65.6 238" stroke="#a8734a" stroke-width="9" stroke-linecap="round"/>
            <path d="M72 218L65.6 238" stroke="#dcaa7c" stroke-width="6" stroke-linecap="round"/>
          </g>
          <circle class="m-c" cx="72" cy="218" r="11.5" fill="url(#m-g-pele)"/>
          <ellipse cx="68" cy="214" rx="3.6" ry="2.6" fill="#f6f1e7" opacity="0.28"/>
        </g>
      </g></g>
      <!-- braço direito (acena e faz joinha) -->
      <g class="m-braco-dir-mola"><g class="m-braco-dir">
        <path class="m-braco m-braco--borda" d="M150 162Q172 186 168 212"/>
        <path class="m-braco" d="M150 162Q172 186 168 212"/>
        <ellipse cx="168" cy="207" rx="11.5" ry="4.2" fill="#2c4f39"/>
        <g class="m-mao-dir">
          <!-- dedos abertos: só aparecem no tchau -->
          <g class="m-dedos" opacity="0" stroke-linecap="round">
            <path d="M171.9 222.6L178.9 231M170.4 223.5L174.9 233.5M168.8 223.9L170.4 234.8M167.2 223.9L165.6 234.8" stroke="#a8734a" stroke-width="7.5"/>
            <path d="M171.9 222.6L178.9 231M170.4 223.5L174.9 233.5M168.8 223.9L170.4 234.8M167.2 223.9L165.6 234.8" stroke="#dcaa7c" stroke-width="4.8"/>
          </g>
          <circle class="m-c" cx="168" cy="218" r="11.5" fill="url(#m-g-pele)"/>
          <ellipse cx="164" cy="214" rx="3.6" ry="2.6" fill="#f6f1e7" opacity="0.28"/>
          <!-- polegar: fica para cima quando o braço gira para o joinha -->
          <g class="m-polegar" opacity="0">
            <path d="M173 219L185.7 221.2" stroke="#a8734a" stroke-width="10.5" stroke-linecap="round"/>
            <path d="M173 219L185.7 221.2" stroke="#dcaa7c" stroke-width="7.5" stroke-linecap="round"/>
          </g>
        </g>
      </g></g>

      <!-- cabeça: o grupo de fora vira e olha; o do meio balança devagar; o de dentro é a mola -->
      <g class="m-cabeca"><g class="m-cabeca-balanco"><g class="m-cabeca-mola">
        <circle class="m-c" cx="64" cy="98" r="9.5" fill="#d9a877"/>
        <circle class="m-c" cx="176" cy="98" r="9.5" fill="#d9a877"/>
        <path d="M66 93Q60 98 66 104M174 93Q180 98 174 104" fill="none" stroke="#b07a4e" stroke-width="2.4" stroke-linecap="round"/>
        <ellipse class="m-c" cx="120" cy="92" rx="56" ry="53" fill="url(#m-g-pele)"/>
        <!-- cabelo (aparece quando ele ergue o chapéu) e luz suave na testa -->
        <path d="M66 88C62 58 88 38 120 38S178 58 174 88C168 76 158 72 150 74Q144 66 134 72Q126 64 118 72Q110 64 102 72Q94 66 88 74C80 72 70 76 66 88Z" fill="#3a2a1e"/>
        <path d="M92 48Q110 40 132 44" fill="none" stroke="#5e4532" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="104" cy="88" rx="26" ry="12" fill="#fbe3c4" opacity="0.32"/>
        <path d="M65 84C66 68 74 60 84 58L80 80Q72 80 69 96ZM175 84C174 68 166 60 156 58L160 80Q168 80 171 96Z" fill="#3a2a1e"/>

        <path class="m-sobrancelhas" d="M87 83Q97 76 108 82M132 82Q143 76 153 83" fill="none" stroke="#3a2a1e" stroke-width="4" stroke-linecap="round"/>
        <g class="m-olho">
          <g class="m-iris">
            <ellipse cx="98" cy="101" rx="9.5" ry="12" fill="#2a1d14"/>
            <circle cx="101.5" cy="96" r="3.6" fill="#f6f1e7"/>
            <circle cx="95" cy="106" r="1.7" fill="#f6f1e7"/>
          </g>
        </g>
        <g class="m-olho">
          <g class="m-iris">
            <ellipse cx="142" cy="101" rx="9.5" ry="12" fill="#2a1d14"/>
            <circle cx="145.5" cy="96" r="3.6" fill="#f6f1e7"/>
            <circle cx="139" cy="106" r="1.7" fill="#f6f1e7"/>
          </g>
        </g>
        <!-- olhos fechados de alegria (^ ^) -->
        <path class="m-olhos-felizes" d="M88 104Q98 91 108 104M132 104Q142 91 152 104" fill="none" stroke="#2a1d14" stroke-width="4.6" stroke-linecap="round" opacity="0"/>
        <ellipse class="m-bochecha" cx="82" cy="118" rx="10.5" ry="6.5" fill="#c9694a" opacity="0.32"/>
        <ellipse class="m-bochecha" cx="158" cy="118" rx="10.5" ry="6.5" fill="#c9694a" opacity="0.32"/>
        <ellipse cx="120" cy="112" rx="4" ry="2.8" fill="#a8734a"/>
        <ellipse cx="118.6" cy="110.8" rx="1.4" ry="0.9" fill="#f6f1e7" opacity="0.55"/>
        <path class="m-sorriso" d="M104 122Q120 138 136 122" fill="none" stroke="#2a1d14" stroke-width="4.4" stroke-linecap="round"/>
        <path class="m-boca" d="M105 121H135Q134 141 120 141T105 121Z" fill="#4a2318"/>
        <ellipse class="m-boca-o" cx="120" cy="129" rx="7" ry="9" fill="#4a2318" opacity="0"/>

        <!-- chapéu de guarda-parque (fora: mola; dentro: gestos) -->
        <g class="m-chapeu-mola"><g class="m-chapeu">
          <path d="M70 78Q120 92 170 78Q168 86 160 88Q120 96 80 88Q72 86 70 78Z" fill="#a8734a" opacity="0.22"/>
          <path class="m-c" d="M82 62C84 42 98 16 112 18C116 24 124 24 128 18C142 16 156 42 158 62Z" fill="url(#m-g-chapeu)"/>
          <path d="M112 18C116 24 124 24 128 18C128 30 124 40 120 44C116 40 112 30 112 18Z" fill="#c9a24a" opacity="0.55"/>
          <path d="M92 50C94 38 100 28 106 24" fill="none" stroke="#fff6dc" stroke-width="3" stroke-linecap="round" opacity="0.55"/>
          <path d="M83 50Q120 58 157 50L158 62Q120 70 82 62Z" fill="#3f6b4e"/>
          <polygon points="${estrela(120, 59, 6.4)}" fill="#e4c77e"/>
          <path class="m-c" d="M46 62C60 54 88 60 120 62S180 54 194 62C198 70 176 78 120 78S42 70 46 62Z" fill="url(#m-g-chapeu)"/>
          <path d="M54 63Q120 70 186 63" fill="none" stroke="#fff6dc" stroke-width="1.6" stroke-linecap="round" opacity="0.5"/>
          <path d="M60 70Q120 82 180 70Q150 79 120 79T60 70Z" fill="#7a5a17" opacity="0.32"/>
        </g></g>
      </g></g></g>
    </g>
  </g></g>
</svg>`;

let p = {}; // partes do personagem
let falas = [];
let indiceFala = 0;
let timerDigitar = null;
let timerOcultar = null;
let timerGesto = null;
let timerPiscar = null;
let timerOlhar = null;
let reacaoCard = null;
let reacaoToque = null;
let tlEntrada = null;
let tlGesto = null;
let tlBoca = null;
let tlFalaCabeca = null;
let loops = [];
let ultimoGesto = '';
let ultimaBrincadeira = -1;
let balaoAberto = false;
let timerDicas = null;
let indiceDica = 0;
let reacaoPonto = null;
let escala = 1; // px na tela por unidade do viewBox
const vistas = new Map(); // quantas curiosidades de cada lugar ele já contou na lista
// 'fora' | 'entrando' | 'parado' | 'saindo'
let fase = 'fora';

/** Mesma regra da transição do planeta: só simplifica se ligado em locais.json */
const calmo = () => transicaoCurta();

export function montarMascote() {
  raiz.innerHTML = `
    <div class="mascote__balao" role="status">
      <span class="mascote__vidro" aria-hidden="true"></span>
      <span class="mascote__rabo" aria-hidden="true"></span>
      <div class="mascote__conteudo">
        <p class="legenda mascote__rotulo"></p>
        <p class="mascote__texto"></p>
        <p class="legenda mascote__dica"></p>
      </div>
    </div>
    <span class="mascote__chao" aria-hidden="true"></span>
    <button class="mascote__corpo" aria-label="${t('mascote.dica')}"><span class="mascote__viagem"><span class="mascote__mola">${SVG}</span></span></button>`;

  p = {
    corpo: el('.mascote__corpo'),
    viagem: el('.mascote__viagem'),
    mola: el('.mascote__mola'),
    chao: el('.mascote__chao'),
    balao: el('.mascote__balao'),
    vidro: el('.mascote__vidro'),
    rabo: el('.mascote__rabo'),
    conteudo: el('.mascote__conteudo'),
    svg: el('.mascote__svg'),
    tudo: el('.m-tudo'),
    giro: el('.m-giro'),
    sombra: el('.m-sombra'),
    superior: el('.m-superior'),
    cabeca: el('.m-cabeca'),
    balanco: el('.m-cabeca-balanco'),
    cabecaMola: el('.m-cabeca-mola'),
    olhos: [...raiz.querySelectorAll('.m-olho')],
    felizes: el('.m-olhos-felizes'),
    iris: [...raiz.querySelectorAll('.m-iris')],
    sobrancelhas: el('.m-sobrancelhas'),
    bochechas: [...raiz.querySelectorAll('.m-bochecha')],
    sorriso: el('.m-sorriso'),
    boca: el('.m-boca'),
    bocaO: el('.m-boca-o'),
    bracoEsq: el('.m-braco-esq'),
    bracoDir: el('.m-braco-dir'),
    bracoEsqMola: el('.m-braco-esq-mola'),
    bracoDirMola: el('.m-braco-dir-mola'),
    maoEsq: el('.m-mao-esq'),
    maoDir: el('.m-mao-dir'),
    dedo: el('.m-dedo'),
    dedos: el('.m-dedos'),
    polegar: el('.m-polegar'),
    chapeu: el('.m-chapeu'),
    chapeuMola: el('.m-chapeu-mola'),
  };

  gsap.set(raiz, { autoAlpha: 0 });
  gsap.set(p.balao, { autoAlpha: 0 });
  gsap.set(p.mola, { transformOrigin: '50% 95%' });
  gsap.set(p.chao, { xPercent: -50, yPercent: -50, opacity: 0 });
  for (const parte of ['tudo', 'giro', 'sombra', 'superior', 'cabeca', 'bracoEsq', 'bracoDir', 'maoEsq', 'maoDir', 'chapeu']) gsap.set(p[parte], { svgOrigin: ORIGEM[parte] });
  gsap.set([p.balanco, p.cabecaMola], { svgOrigin: ORIGEM.cabeca });
  gsap.set(p.bracoEsqMola, { svgOrigin: ORIGEM.bracoEsq });
  gsap.set(p.bracoDirMola, { svgOrigin: ORIGEM.bracoDir });
  gsap.set(p.chapeuMola, { svgOrigin: '120 74' });
  gsap.set([...p.olhos, ...p.bochechas, p.bocaO], { transformOrigin: '50% 50%' });
  gsap.set(p.boca, { transformOrigin: '50% 0%' });
  prepararMolas();

  // Toque fora do mascote (ou rolagem com mouse) esconde o balão
  window.addEventListener('pointerdown', (e) => !raiz.contains(e.target) && esconderBalao(), true);
  window.addEventListener('wheel', esconderBalao, { passive: true });
  window.addEventListener('resize', medirEscala);

  p.corpo.addEventListener('click', aoTocar);
  // Só em desenvolvimento: os testes disparam cada gesto
  if (import.meta.env.DEV) window.__mascote = { gesto, tchau, pulinhoDeAlegria, susto, risada, apontarCard, ajeitarChapeu, joinha, ligarMolas };

  em('tela', atualizarPorTela);
  em('card', aoTrocarCard);
  em('local', (l) => {
    falas = [...(l.falas || []), ...(l.curiosidades || []).map((c) => c.texto)];
    indiceFala = 0;
    gsap.delayedCall(1.6, () => {
      if (estado.localId !== l.id || estado.tela !== 'local') return;
      if (!calmo()) gesto(tchau());
      falar(falas[0]);
    });
  });
  em('idioma', () => {
    p.corpo.setAttribute('aria-label', t('mascote.dica'));
    if (fase !== 'parado') return;
    if (estado.tela === 'locais') {
      if (!detalheAberto()) convidar();
    } else if (falas.length) falar(falas[indiceFala]);
  });
  em('ponto', aoTocarPonto);
  em('contar', aoContar);
}

const detalheAberto = () => document.body.classList.contains('detalhe-aberto');

/**
 * Página de um lugar: ele vai para o bloco "Você sabia?" e fica quieto (sem balão).
 * Ao voltar ao mapa, volta às dicas
 */
function aoTocarPonto(ponto) {
  if (fase === 'fora' || fase === 'saindo') return;
  terminarEntrada();
  reacaoPonto?.kill();
  esconderBalao();
  if (ponto) return pararDicas();
  reacaoPonto = gsap.delayedCall(1.4, () => fase === 'parado' && estado.tela === 'locais' && !detalheAberto() && convidar());
}

/** O bloco "Você sabia?" apareceu: ele olha e aponta para as curiosidades, como quem conta */
function aoContar(alvo) {
  if (fase !== 'parado' || calmo() || !detalheAberto()) return;
  reacaoPonto?.kill();
  reacaoPonto = gsap.delayedCall(0.5, () => {
    gesto(apontarCard(alvo));
    agendarGesto();
  });
}

// --- Dicas do mapa: uma frase por vez, trocando sozinha ------------------------------
function iniciarDicas() {
  pararDicas();
  timerDicas = setInterval(proximaDica, TEMPO_DICA);
}

function pararDicas() {
  clearInterval(timerDicas);
  timerDicas = null;
}

/**
 * Frases do guia no mapa: as gerais (locais.json, "mascote.dicasMapa") e a "dica_guia" de cada
 * lugar do mapa (lugares.json). {numero} vira o número do pin. Lugar que sai do mapa leva a dica junto.
 */
function dicasDoMapa() {
  const gerais = t('mascote.dicasMapa');
  const dosLugares = lugaresNoMapa()
    .map((l) => textoDe(l, 'dica_guia').replaceAll('{numero}', String(numeroDe(l)).padStart(2, '0')))
    .filter(Boolean);
  return [...(Array.isArray(gerais) ? gerais : []), ...dosLugares];
}

function proximaDica() {
  if (fase !== 'parado' || estado.tela !== 'locais' || detalheAberto()) return;
  const lista = dicasDoMapa();
  if (!lista.length) return;
  indiceDica = (indiceDica + 1) % lista.length;
  // Fica aberto até a próxima: o balão só troca de texto, sem sumir e voltar
  falar(lista[indiceDica], TEMPO_DICA + 1500, { simples: true });
}

// --- Aparecer e sumir ------------------------------------------------------------
function atualizarPorTela(tela) {
  const mostrar = tela === 'locais' || tela === 'local';
  if (mostrar && fase === 'fora') entrar();
  else if (!mostrar && fase !== 'fora') esconder();
  else if (tela === 'locais' && fase === 'parado') {
    // Voltou de um local para a lista: convida de novo
    gsap.delayedCall(1.2, () => estado.tela === 'locais' && convidar());
  }
}

function entrar() {
  fase = 'entrando';
  zerarPose();
  medirEscala();
  ligarMolas(!calmo());
  if (calmo() || estado.tela !== 'locais') {
    gsap.fromTo(raiz, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, delay: 0.6, onComplete: chegou });
    return;
  }
  // Espera os cards assentarem: os pulos miram a posição final deles
  tlEntrada = gsap.timeline({ delay: 0.55 }).add(() => {
    if (fase === 'entrando') montarEntrada();
  });
}

/**
 * Entrada pela direita: vem de fora da tela com dois pulinhos curtos até o canto,
 * longe dos pins (o mapa fica no meio da tela).
 */
function montarEntrada() {
  const r = repouso();
  const fora = { x: innerWidth - r.x + r.w, y: 0 };
  const passo = { x: r.w * 0.55, y: 0 };

  usarSombraDeChao(true);
  gsap.set(p.viagem, { x: fora.x, y: fora.y });
  gsap.set(raiz, { autoAlpha: 1 });

  tlEntrada = gsap
    .timeline({ onComplete: chegou })
    .add(pulo(fora, passo, { r, duracao: 0.62, agachar: false, recuperar: 0.2 }))
    .add(pulo(passo, { x: 0, y: 0 }, { r, duracao: 0.5, recuperar: 0.5 }));
}

/** Ao parar no canto: tira o chapéu, dá tchau e o balão convida */
function chegou() {
  tlEntrada = null;
  usarSombraDeChao(false);
  fase = 'parado';
  iniciarVida();
  agendarGesto();
  if (estado.tela !== 'locais') return;
  if (!calmo()) gesto(cumprimentar());
  gsap.delayedCall(calmo() ? 0.4 : 0.35, () => estado.tela === 'locais' && fase === 'parado' && convidar());
}

/** Toque ou troca de card no meio da entrada: ele chega na hora */
function terminarEntrada() {
  if (fase === 'entrando' && tlEntrada) tlEntrada.progress(1);
}

function esconder() {
  fase = 'fora';
  tlEntrada?.kill();
  tlEntrada = null;
  pararDicas();
  reacaoPonto?.kill();
  reacaoCard?.kill();
  reacaoToque?.kill();
  clearTimeout(timerGesto);
  pararVida();
  esconderBalao();
  gsap.to(raiz, {
    autoAlpha: 0,
    duration: 0.5,
    ease: 'power2.in',
    onComplete: () => {
      if (fase !== 'fora') return;
      ligarMolas(false);
      zerarPose();
    },
  });
}

/**
 * Descanso: ele dá tchau e sai pulando pela direita antes de o totem voltar ao início.
 * A promessa resolve quando ele já saiu (ou na hora, se não estiver na tela).
 */
export function despedir() {
  if (fase === 'fora' || fase === 'saindo') return Promise.resolve();
  terminarEntrada();
  esconderBalao();
  pararDicas();
  if (calmo()) return Promise.resolve();
  fase = 'saindo';
  clearTimeout(timerGesto);
  reacaoToque?.kill();
  tlGesto?.progress(1).kill();
  const r = repouso();
  const passo = { x: r.w * 0.4, y: 0 };
  const fora = { x: innerWidth - r.x + r.w, y: 0 };
  return new Promise((pronto) => {
    gsap
      .timeline({ onComplete: pronto })
      .add(tchau(3))
      .add(() => usarSombraDeChao(true), '-=0.35')
      .add(pulo({ x: 0, y: 0 }, passo, { r, duracao: 0.42, recuperar: 0.18 }), '-=0.35')
      .add(pulo(passo, fora, { r, duracao: 0.5, pousar: false }));
  });
}

/** Volta todas as partes para a pose de repouso */
function zerarPose() {
  tlGesto?.kill();
  tlGesto = null;
  gsap.set(p.viagem, { x: 0, y: 0 });
  gsap.set(p.mola, { scaleX: 1, scaleY: 1, rotation: 0 });
  gsap.set([p.tudo, p.giro, p.superior, p.cabeca, p.chapeu, p.sobrancelhas, ...p.iris], { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
  gsap.set(p.chapeu, { svgOrigin: ORIGEM.chapeu });
  gsap.set([p.bracoEsq, p.bracoDir, p.maoEsq, p.maoDir], { rotation: 0 });
  gsap.set(p.sombra, { scaleX: 1 });
  gsap.set(p.olhos, { scale: 1 });
  gsap.set([p.dedo, p.dedos, p.polegar], { opacity: 0 });
  rosto('normal', 0).progress(1);
  zerarMolas();
  usarSombraDeChao(false);
}

// --- Pulos da entrada e da saída -----------------------------------------------------
/** Posição dos pés em repouso, na tela (o botão não se move: só as camadas de dentro) */
function repouso() {
  const b = p.corpo.getBoundingClientRect();
  const s = b.width / 240;
  return { x: b.left + b.width / 2, y: b.top + PES_Y * s, w: b.width, h: ALTURA_DOS_PES_AO_CHAPEU * s, s };
}

/** Quem está no chão: sombra da pose (no SVG) ou sombra separada que fica no chão durante o pulo */
function usarSombraDeChao(sim) {
  gsap.set(p.sombra, { opacity: sim ? 0 : 1 });
  gsap.set(p.chao, { opacity: 0, x: 0, y: 0 });
  raiz.classList.toggle('mascote--viajando', sim);
}

/**
 * Um pulo em arco dos pés de "de" até "para" (px, relativos ao repouso).
 * Agacha, estica ao subir, estica de novo ao descer e achata ao cair.
 */
function pulo(de, para, { r, duracao, card = null, agachar = true, recuperar = 0.26, pousar = true }) {
  const altura = 60 * r.s + Math.abs(para.x - de.x) * 0.12;
  const controle = Math.min(de.y, para.y) - altura * 2; // a curva passa "altura" acima do ponto mais alto
  const lado = Math.sign(para.x - de.x) || 1;
  const prog = { t: 0 };
  const mover = () => {
    const a = prog.t;
    const b = 1 - a;
    const x = de.x + (para.x - de.x) * a;
    const y = b * b * de.y + 2 * a * b * controle + a * a * para.y;
    // A sombra fica no chão de onde ele saiu e, na segunda metade, no chão onde vai cair
    const chao = a < 0.5 ? de.y : para.y;
    const subida = gsap.utils.clamp(0, 1, (chao - y) / (altura * 1.3));
    gsap.set(p.viagem, { x, y });
    gsap.set(p.chao, { x, y: chao + 2 * r.s, scale: 1 - subida * 0.55, opacity: (1 - subida) * 0.9 });
  };

  const tl = gsap.timeline();
  if (agachar) tl.to(p.mola, { scaleX: 1.16, scaleY: 0.8, rotation: -lado * 3, duration: 0.14, ease: 'power2.out' });
  const ar = tl.duration();
  tl.to(prog, { t: 1, duration: duracao, ease: 'none', onUpdate: mover }, ar)
    .to(p.mola, { scaleX: 0.88, scaleY: 1.16, rotation: lado * 7, duration: duracao * 0.25, ease: 'power2.out' }, ar)
    .to(p.mola, { scaleX: 1, scaleY: 1, rotation: lado * 3, duration: duracao * 0.3, ease: 'sine.inOut' }, ar + duracao * 0.25)
    .to(p.mola, { scaleX: 0.94, scaleY: 1.08, rotation: 0, duration: duracao * 0.45, ease: 'power1.in' }, ar + duracao * 0.55);
  if (!pousar) return tl;
  tl.to(p.mola, { scaleX: 1.22, scaleY: 0.76, duration: 0.08, ease: 'power2.out' }, ar + duracao)
    .to(p.mola, { scaleX: 1, scaleY: 1, duration: recuperar, ease: recuperar > 0.4 ? 'elastic.out(1, 0.45)' : 'back.out(2.5)' }, ar + duracao + 0.08);
  if (card) tl.add(sentirPeso(card, para), ar + duracao);
  return tl;
}

/** O card afunda um pouco com o peso e volta; os pés acompanham */
function sentirPeso(card, pes) {
  const fundo = 12;
  gsap
    .timeline()
    .to(card, { translate: `0px ${fundo}px`, duration: 0.09, ease: 'power2.out' })
    .to(card, { translate: '0px 0px', duration: 0.6, ease: 'elastic.out(1, 0.35)' });
  return gsap
    .timeline()
    .to(p.viagem, { y: pes.y + fundo, duration: 0.09, ease: 'power2.out' })
    .to(p.viagem, { y: pes.y, duration: 0.25, ease: 'back.out(2)' });
}

// --- Molas: chapéu, cabeça, braços e mãos seguem o corpo com atraso ------------------
// A cada quadro mede a velocidade da cabeça e dos braços. Cada mola tem um alvo que
// depende dessa velocidade (ex.: caindo, o chapéu flutua e os braços abrem) e corre até
// ele com rigidez k e amortecimento c, passando um pouco e voltando, como mola.
const molas = {
  chapeuY: { k: 230, c: 10, min: -14, max: 1.5 },
  chapeuR: { k: 190, c: 8, min: -16, max: 16 },
  cabecaR: { k: 160, c: 9, min: -9, max: 9 },
  bracoEsq: { k: 120, c: 7, min: -8, max: 30 },
  bracoDir: { k: 120, c: 7, min: -30, max: 8 },
  maoEsq: { k: 260, c: 9, min: -26, max: 26 },
  maoDir: { k: 260, c: 9, min: -26, max: 26 },
};
const vida = { bracos: 0 }; // balanço lento dos braços quando parado (-1 a 1)
let medidaAnterior = null;
let velocidade = {};
let molasLigadas = false;
let aplicar = {};

function prepararMolas() {
  aplicar = {
    chapeuY: gsap.quickSetter(p.chapeuMola, 'y'),
    chapeuR: gsap.quickSetter(p.chapeuMola, 'rotation'),
    cabecaR: gsap.quickSetter(p.cabecaMola, 'rotation'),
    bracoEsq: gsap.quickSetter(p.bracoEsqMola, 'rotation'),
    bracoDir: gsap.quickSetter(p.bracoDirMola, 'rotation'),
    maoEsq: gsap.quickSetter(p.maoEsq, 'rotation'),
    maoDir: gsap.quickSetter(p.maoDir, 'rotation'),
  };
}

function medirEscala() {
  if (p.corpo?.offsetWidth) escala = p.corpo.offsetWidth / 240;
}

function ligarMolas(sim) {
  if (sim === molasLigadas) return;
  molasLigadas = sim;
  medidaAnterior = null;
  if (sim) gsap.ticker.add(passoDasMolas);
  else {
    gsap.ticker.remove(passoDasMolas);
    zerarMolas();
  }
}

function zerarMolas() {
  medidaAnterior = null;
  velocidade = {};
  for (const [nome, m] of Object.entries(molas)) {
    m.x = 0;
    m.v = 0;
    aplicar[nome]?.(0);
  }
}

/** Posição da cabeça (viewBox) e ângulos do corpo e dos braços, somando todas as camadas */
function medirCorpo() {
  const g = gsap.getProperty;
  const corpo = g(p.mola, 'rotation') + g(p.tudo, 'rotation') + g(p.giro, 'rotation');
  const tronco = g(p.superior, 'rotation');
  const altura = CABECA_SOBRE_PES * g(p.mola, 'scaleY') * g(p.tudo, 'scaleY');
  const rad = (corpo * Math.PI) / 180;
  const radTronco = (tronco * Math.PI) / 180;
  return {
    x: g(p.viagem, 'x') / escala + g(p.tudo, 'x') + altura * Math.sin(rad) + CABECA_SOBRE_CINTURA * Math.sin(radTronco),
    y: g(p.viagem, 'y') / escala + g(p.tudo, 'y') + g(p.superior, 'y') - altura * Math.cos(rad),
    giroCorpo: corpo + tronco,
    giroCabeca: corpo + tronco + g(p.cabeca, 'rotation') + g(p.balanco, 'rotation') + molas.cabecaR.x,
    bracoEsq: corpo + tronco + g(p.bracoEsq, 'rotation') + molas.bracoEsq.x,
    bracoDir: corpo + tronco + g(p.bracoDir, 'rotation') + molas.bracoDir.x,
  };
}

/** Aproxima de "lim" sem passar dele, de forma suave */
const suave = (v, lim) => lim * Math.tanh(v / lim);

function passoDasMolas(_tempo, dtMs) {
  // No tempo do GSAP (os testes podem desacelerar tudo)
  const dt = (Math.min(dtMs, 50) / 1000) * gsap.globalTimeline.timeScale();
  if (!dt) return;
  const agora = medirCorpo();
  if (!medidaAnterior) {
    medidaAnterior = agora;
    return;
  }
  // Velocidade um pouco suavizada: os quadros do navegador não têm todos o mesmo tempo
  for (const k in agora) velocidade[k] = (velocidade[k] || 0) * 0.4 + ((agora[k] - medidaAnterior[k]) / dt) * 0.6;
  medidaAnterior = agora;
  const v = velocidade;

  const alvo = {
    // Caindo, o chapéu flutua; subindo, assenta na cabeça
    chapeuY: v.y > 0 ? -suave(v.y * 0.014, 12) : suave(-v.y * 0.004, 1),
    chapeuR: suave(-v.giroCabeca * 0.1 - v.x * 0.006, 14),
    cabecaR: suave(-v.giroCorpo * 0.18 - v.x * 0.008, 7),
    bracoEsq: suave(v.y * 0.025 + v.x * 0.012, 22) + vida.bracos * 1.6,
    bracoDir: suave(-v.y * 0.025 + v.x * 0.012, 22) + vida.bracos * 1.6,
    maoEsq: suave(-v.bracoEsq * 0.12, 22),
    maoDir: suave(-v.bracoDir * 0.12, 22),
  };

  const passos = Math.ceil(dt * 120);
  const h = dt / passos;
  for (const [nome, m] of Object.entries(molas)) {
    for (let i = 0; i < passos; i++) {
      m.v += (-m.k * (m.x - alvo[nome]) - m.c * m.v) * h;
      m.x += m.v * h;
      // Bateu no limite (ex.: chapéu na cabeça): quica de leve
      if (m.x > m.max || m.x < m.min) {
        m.x = gsap.utils.clamp(m.min, m.max, m.x);
        m.v *= -0.25;
      }
    }
    if (Math.abs(m.x - (m.ultimo ?? 0)) > 0.01) {
      m.ultimo = m.x;
      aplicar[nome](m.x);
    }
  }
}

// --- Vida quando parado: respiração, balanço, piscadas e olhar ------------------------
function iniciarVida() {
  if (calmo()) return;
  if (!loops.length) {
    loops = [
      // Respira a partir da cintura: o tronco sobe e estica um pouco
      gsap.to(p.superior, { y: -2.2, scaleY: 1.014, duration: 2.1, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
      // Balança o tronco de um lado para o outro (os pés ficam no chão)
      gsap.fromTo(p.superior, { rotation: -1.8 }, { rotation: 1.8, duration: 2.9, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
      // A cabeça balança em outro ritmo, para não parecer uma peça só
      gsap.fromTo(p.balanco, { rotation: -1.4 }, { rotation: 1.4, duration: 3.7, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
      gsap.fromTo(vida, { bracos: -1 }, { bracos: 1, duration: 3.3, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
    ];
  }
  loops.forEach((l) => l.play());
  agendarPiscada();
  agendarOlhar();
}

function pararVida() {
  loops.forEach((l) => l.pause());
  clearTimeout(timerPiscar);
  clearTimeout(timerOlhar);
}

/** Pisca em tempo aleatório; às vezes duas vezes seguidas (só com o rosto neutro) */
function agendarPiscada() {
  clearTimeout(timerPiscar);
  timerPiscar = setTimeout(() => {
    if (fase !== 'fora' && p.svg.dataset.rosto === 'normal' && !gsap.isTweening(p.olhos[0]) && !gsap.isTweening(p.olhos[1])) {
      const tl = gsap.timeline();
      const vezes = Math.random() < 0.2 ? 2 : 1;
      for (let i = 0; i < vezes; i++) {
        tl.to(p.olhos, { scaleY: 0.08, duration: 0.07, ease: 'power2.in' }).to(p.olhos, { scaleY: 1, duration: 0.11, ease: 'power2.out' });
      }
    }
    agendarPiscada();
  }, 1800 + Math.random() * 4400);
}

/** Os olhos passeiam: pulam rápido para um ponto e ficam lá um tempo, às vezes voltam ao centro */
function agendarOlhar() {
  clearTimeout(timerOlhar);
  timerOlhar = setTimeout(() => {
    if (fase === 'parado' && !tlGesto?.isActive() && !gsap.isTweening(p.iris[0])) {
      const centro = Math.random() < 0.4;
      gsap.to(p.iris, {
        x: centro ? 0 : gsap.utils.random(-4.5, 4.5),
        y: centro ? 0 : gsap.utils.random(-3, 2),
        duration: 0.14,
        ease: 'power3.out',
      });
    }
    agendarOlhar();
  }, 900 + Math.random() * 2600);
}

/** De 10 a 20 segundos, parado e sem falar, ele faz um gesto sorteado (nunca o mesmo duas vezes) */
function agendarGesto() {
  clearTimeout(timerGesto);
  timerGesto = setTimeout(() => {
    if (fase === 'parado' && !calmo() && !p.svg.classList.contains('falando')) {
      const opcoes = { tchau, ajeitarChapeu, olharLados, pulinhoDeAlegria };
      if (estado.tela === 'locais') opcoes.apontarCard = apontarCard;
      const nomes = Object.keys(opcoes).filter((n) => n !== ultimoGesto);
      ultimoGesto = nomes[Math.floor(Math.random() * nomes.length)];
      gesto(opcoes[ultimoGesto]());
    }
    agendarGesto();
  }, 10000 + Math.random() * 10000);
}

/** Um gesto por vez: o anterior termina na hora (todos acabam na pose de repouso) */
function gesto(tl) {
  tlGesto?.progress(1).kill();
  tlGesto = tl;
  return tl;
}

// --- Expressões do rosto (só opacidade e escala) --------------------------------------
// boca 'fala': sorriso fechado, ou a boca aberta se ele estiver falando
const ROSTOS = {
  normal: { olhos: 1, felizes: 0, escala: 1, sobrancelhas: 0, boca: 'fala' },
  feliz: { olhos: 0, felizes: 1, escala: 1, sobrancelhas: -3, boca: 'aberta' },
  surpreso: { olhos: 1, felizes: 0, escala: 1.3, sobrancelhas: -9, boca: 'o' },
};

function rosto(nome, duracao = 0.2) {
  const r = ROSTOS[nome];
  const falando = () => p.svg.classList.contains('falando');
  return gsap
    .timeline()
    .set(p.svg, { attr: { 'data-rosto': nome } }, 0)
    .set(p.sorriso, { opacity: () => (r.boca === 'fala' && !falando() ? 1 : 0) }, 0)
    .set(p.boca, { opacity: () => (r.boca === 'aberta' || (r.boca === 'fala' && falando()) ? 1 : 0) }, 0)
    .set(p.bocaO, { opacity: r.boca === 'o' ? 1 : 0 }, 0)
    .set(p.olhos, { opacity: r.olhos }, 0)
    .set(p.felizes, { opacity: r.felizes }, 0)
    .to(p.olhos, { scale: r.escala, duration: duracao, ease: 'back.out(3)' }, 0)
    .to(p.sobrancelhas, { y: r.sobrancelhas, duration: duracao, ease: 'back.out(2)' }, 0);
}

// --- Gestos ----------------------------------------------------------------------
/** Tchau: o braço recua, sobe com mola e acena; a cabeça inclina junto, um pouco depois */
function tchau(acenos = 4) {
  const ida = 0.13;
  const tl = gsap
    .timeline()
    // antecipação: o braço recua e o corpo abaixa um pouco
    .to(p.bracoDir, { rotation: 14, duration: 0.14, ease: 'power2.out' }, 0)
    .to(p.tudo, { scaleX: 1.04, scaleY: 0.95, duration: 0.14, ease: 'power2.out' }, 0)
    .add(rosto('feliz'), 0.1)
    .to(p.tudo, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }, 0.14)
    .set([p.dedos, p.polegar], { opacity: 1 }, 0.2)
    .to(p.bracoDir, { rotation: -112, duration: 0.32, ease: 'back.out(1.7)' }, 0.14)
    .to(p.cabeca, { rotation: 7, x: 2, duration: 0.45, ease: 'back.out(2)' }, 0.22);
  let t = 0.46;
  for (let i = 0; i < acenos; i++) {
    tl.to(p.bracoDir, { rotation: -88, duration: ida, ease: 'sine.inOut' }, t).to(p.bracoDir, { rotation: -118, duration: ida, ease: 'sine.inOut' }, t + ida);
    t += ida * 2;
  }
  return tl
    .to(p.bracoDir, { rotation: 0, duration: 0.6, ease: 'back.out(1.5)' }, t)
    .set([p.dedos, p.polegar], { opacity: 0 }, t + 0.24)
    .to(p.cabeca, { rotation: 0, x: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' }, t + 0.08)
    .add(rosto('normal'), t + 0.25);
}

/** Ergue o chapéu (afunda um pouco antes) e ele volta quicando na cabeça */
function tirarChapeu() {
  return gsap
    .timeline()
    .to(p.chapeu, { x: 1, y: 3, duration: 0.12, ease: 'power2.out' })
    .to(p.chapeu, { x: -6, y: -28, rotation: -18, duration: 0.42, ease: 'back.out(2.2)' })
    .to(p.chapeu, { x: 0, y: 0, rotation: 0, duration: 0.55, ease: 'bounce.out' }, 1.2);
}

function cumprimentar() {
  return gsap.timeline().add(tirarChapeu(), 0).add(tchau(3), 0.05);
}

function ajeitarChapeu() {
  return gsap
    .timeline()
    .to(p.bracoEsq, { rotation: -8, duration: 0.12, ease: 'power2.out' })
    .to(p.bracoEsq, { rotation: 140, duration: 0.4, ease: 'back.out(1.6)' })
    .to(p.cabeca, { rotation: -5, duration: 0.35, ease: 'back.out(2)' }, 0.22)
    .to(p.chapeu, { keyframes: { rotation: [0, 6, -5, 2, 0], y: [0, -6, -3, -1, 0] }, duration: 0.8, ease: 'sine.inOut' }, 0.42)
    .to(p.bracoEsq, { rotation: 0, duration: 0.6, ease: 'back.out(1.3)' }, 1.2)
    .to(p.cabeca, { rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' }, 1.28);
}

/** Olha para um lado e para o outro: os olhos vão primeiro, a cabeça vai atrás */
function olharLados() {
  return gsap
    .timeline()
    .to(p.iris, { keyframes: { x: [0, -5, -5, 4, 4, 0], y: [0, 1, 1, -2, -2, 0] }, duration: 2.6, ease: 'sine.inOut' }, 0)
    .to(p.cabeca, { keyframes: { rotation: [0, -7, -6, 6, 5, 0], x: [0, -3, -3, 2, 2, 0] }, duration: 2.6, ease: 'sine.inOut' }, 0.09);
}

function corar(duracao) {
  return gsap
    .timeline()
    .to(p.bochechas, { scale: 1.3, opacity: 0.6, duration: 0.25 })
    .to(p.bochechas, { scale: 1, opacity: 0.32, duration: 0.5 }, duracao);
}

/** Pulinho de alegria: agacha, pula dando uma voltinha, o chapéu sobe e cai de volta na cabeça */
function pulinhoDeAlegria() {
  return gsap
    .timeline()
    .add(rosto('feliz'), 0)
    .add(corar(1.0), 0)
    // antecipação: agacha
    .to(p.tudo, { scaleX: 1.14, scaleY: 0.82, duration: 0.18, ease: 'power2.out' }, 0)
    // sobe esticado
    .to(p.tudo, { y: -38, scaleX: 0.9, scaleY: 1.12, duration: 0.3, ease: 'power2.out' }, 0.18)
    .to(p.sombra, { scaleX: 0.68, duration: 0.3, ease: 'power2.out' }, 0.18)
    .to(p.giro, { keyframes: { scaleX: [1, -1, 1] }, duration: 0.52, ease: 'sine.inOut' }, 0.2)
    .to(p.bracoEsq, { rotation: 55, duration: 0.3, ease: 'back.out(2)' }, 0.18)
    .to(p.bracoDir, { rotation: -55, duration: 0.3, ease: 'back.out(2)' }, 0.18)
    // o chapéu sai da cabeça e sobe mais que ele
    .to(p.chapeu, { y: -34, rotation: 12, duration: 0.42, ease: 'power2.out' }, 0.26)
    // cai
    .to(p.tudo, { y: 0, scaleX: 0.94, scaleY: 1.08, duration: 0.24, ease: 'power2.in' }, 0.48)
    .to(p.sombra, { scaleX: 1, duration: 0.24, ease: 'power2.in' }, 0.48)
    // achata ao tocar o chão e volta com quique
    .to(p.tudo, { scaleX: 1.18, scaleY: 0.8, duration: 0.08, ease: 'power2.out' }, 0.72)
    .to(p.tudo, { scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)' }, 0.8)
    .to([p.bracoEsq, p.bracoDir], { rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' }, 0.76)
    // o chapéu cai depois dele, quicando na cabeça
    .to(p.chapeu, { y: 0, rotation: 0, duration: 0.6, ease: 'bounce.out' }, 0.72)
    .add(rosto('normal'), 1.5);
}

/** Susto: estica de repente, olhos arregalados, o chapéu voa girando e ele pega de volta */
function susto() {
  return gsap
    .timeline()
    .add(rosto('surpreso', 0.1), 0)
    .fromTo(p.bocaO, { scale: 0.3 }, { scale: 1, duration: 0.25, ease: 'back.out(3)' }, 0)
    .to(p.tudo, { y: -16, scaleX: 0.86, scaleY: 1.16, duration: 0.12, ease: 'power3.out' }, 0)
    .to(p.tudo, { y: 0, scaleX: 1, scaleY: 1, duration: 0.7, ease: 'elastic.out(1, 0.4)' }, 0.14)
    .to(p.bracoEsq, { rotation: 60, duration: 0.16, ease: 'back.out(3)' }, 0)
    .to(p.bracoDir, { rotation: -60, duration: 0.16, ease: 'back.out(3)' }, 0)
    // o chapéu gira em volta do próprio centro
    .set(p.chapeu, { svgOrigin: ORIGEM.chapeuCentro }, 0)
    .to(p.chapeu, { y: -88, rotation: 200, duration: 0.45, ease: 'power2.out' }, 0.02)
    .to(p.chapeu, { y: 0, rotation: 360, duration: 0.42, ease: 'power2.in' }, 0.47)
    // o braço direito sobe para pegar o chapéu
    .to(p.bracoDir, { rotation: -150, duration: 0.28, ease: 'back.out(1.8)' }, 0.5)
    .set(p.chapeu, { rotation: 0 }, 0.89)
    .to(p.chapeu, { y: 4, duration: 0.06, ease: 'power2.out' }, 0.89)
    .to(p.chapeu, { y: 0, duration: 0.4, ease: 'back.out(3)' }, 0.95)
    .to(p.bracoEsq, { rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' }, 0.55)
    .to(p.bracoDir, { rotation: 0, duration: 0.6, ease: 'back.out(1.5)' }, 1.15)
    // alívio
    .add(rosto('normal'), 1.0)
    .set(p.chapeu, { svgOrigin: ORIGEM.chapeu }, 1.4);
}

/** Risada: olhos fechados de alegria, bochechas coradas e o corpinho tremendo */
function risada() {
  return gsap
    .timeline()
    .add(rosto('feliz', 0.1), 0)
    .add(corar(1.2), 0)
    .to(p.tudo, { scaleX: 1.08, scaleY: 0.9, duration: 0.12, ease: 'power2.out' }, 0)
    .to(p.tudo, { keyframes: { scaleY: [0.9, 1.04, 0.96, 1.03, 0.97, 1.02, 1], scaleX: [1.08, 0.97, 1.03, 0.98, 1.02, 0.99, 1] }, duration: 0.9, ease: 'none' }, 0.12)
    .to(p.tudo, { keyframes: { x: [0, -2.5, 2.5, -2, 2, -1.5, 1.5, 0] }, duration: 0.9, ease: 'none' }, 0.12)
    .to(p.cabeca, { keyframes: { rotation: [0, -5, 5, -4, 4, -2, 0] }, duration: 0.9, ease: 'none' }, 0.2)
    .to(p.bracoEsq, { keyframes: { rotation: [0, -8, -4, -8, -4, 0] }, duration: 1.0 }, 0.1)
    .to(p.bracoDir, { keyframes: { rotation: [0, 8, 4, 8, 4, 0] }, duration: 1.0 }, 0.1)
    .add(rosto('normal'), 1.3);
}

/** Ângulo do braço esquerdo e direção do olhar até um elemento da tela */
function miraPara(alvo) {
  const c = alvo.getBoundingClientRect();
  const b = p.corpo.getBoundingClientRect();
  const s = b.width / 240;
  const dx = c.left + c.width / 2 - (b.left + 90 * s);
  const dy = c.top + c.height * 0.45 - (b.top + 162 * s);
  const angulo = (((Math.atan2(dy, dx) * 180) / Math.PI - BRACO_ESQ_REPOUSO) % 360 + 360) % 360;
  const d = Math.hypot(dx, dy) || 1;
  return { rotacao: gsap.utils.clamp(40, 165, angulo), dx: dx / d, dy: dy / d };
}

/** Aponta para o card ativo: os olhos vão primeiro, a cabeça e o corpo inclinam, o braço recua e estica */
function apontarCard(alvo = null) {
  const card = alvo || document.querySelector('[data-tela="locais"] .card-local.atual');
  if (!card) return olharLados();
  const { rotacao, dx, dy } = miraPara(card);
  const lado = dx < 0 ? -1 : 1;
  return gsap
    .timeline()
    .to(p.iris, { x: dx * 5, y: dy * 4, duration: 0.16, ease: 'power3.out' }, 0)
    .to(p.cabeca, { rotation: lado * 8, x: dx * 3, duration: 0.45, ease: 'back.out(2)' }, 0.08)
    .to(p.tudo, { rotation: lado * 5, duration: 0.5, ease: 'back.out(1.6)' }, 0.14)
    .to(p.bracoEsq, { rotation: -10, duration: 0.14, ease: 'power2.out' }, 0.05)
    .set(p.dedo, { opacity: 1 }, 0.22)
    .to(p.bracoEsq, { rotation: rotacao, duration: 0.45, ease: 'back.out(2)' }, 0.19)
    .to(p.bracoEsq, { rotation: rotacao - 8, duration: 0.16, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.75)
    .to(p.bracoEsq, { rotation: 0, duration: 0.6, ease: 'back.out(1.4)' }, 2.1)
    .set(p.dedo, { opacity: 0 }, 2.3)
    .to(p.tudo, { rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' }, 2.1)
    .to(p.cabeca, { rotation: 0, x: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' }, 2.18)
    .to(p.iris, { x: 0, y: 0, duration: 0.25, ease: 'power2.out' }, 2.1);
}

/** Joinha com piscadinha: o braço recua, sobe com mola e o corpo dá uma balançada */
function joinha() {
  return gsap
    .timeline()
    .to(p.bracoDir, { rotation: 12, duration: 0.1, ease: 'power2.out' }, 0)
    .to(p.bracoDir, { rotation: -100, duration: 0.3, ease: 'back.out(2.2)' }, 0.1)
    .set(p.polegar, { opacity: 1 }, 0.18)
    .to(p.cabeca, { rotation: 6, duration: 0.3, ease: 'back.out(2)' }, 0.18)
    .to(p.olhos[1], { scaleY: 0.1, duration: 0.08, yoyo: true, repeat: 1, repeatDelay: 0.3 }, 0.2)
    .to(p.tudo, { scaleX: 1.05, scaleY: 0.95, duration: 0.1, ease: 'power2.out' }, 0.32)
    .to(p.tudo, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' }, 0.42)
    .to(p.cabeca, { rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }, 1.0)
    .to(p.bracoDir, { rotation: 0, duration: 0.45, ease: 'back.out(1.4)' }, 1.1)
    .set(p.polegar, { opacity: 0 }, 1.3);
}

/** "Conhecer": ele faz joinha e a promessa libera a abertura do local logo depois */
export function fazerJoinha() {
  if (fase === 'fora' || fase === 'saindo') return Promise.resolve();
  terminarEntrada();
  esconderBalao();
  const tl = gesto(joinha());
  return new Promise((pronto) => tl.call(pronto, null, 0.55));
}

// --- Reações ------------------------------------------------------------------------
/** Toque: susto ou risada, sorteado. No susto ele só fala depois de pegar o chapéu */
function aoTocar() {
  if (fase === 'saindo') return;
  terminarEntrada();
  let atraso = 0;
  if (!calmo()) {
    const assustar = Math.random() < 0.5;
    gesto(assustar ? susto() : risada());
    soltarEstrelas();
    if (assustar) atraso = 0.95;
  }
  const responder = () => {
    if (fase === 'fora' || fase === 'saindo') return;
    if (estado.tela === 'local' && falas.length) proximaFala();
    else brincar();
  };
  reacaoToque?.kill();
  if (atraso) reacaoToque = gsap.delayedCall(atraso, responder);
  else responder();
  agendarGesto();
}

/** Troca de card: olha, aponta e conta uma curiosidade curta do lugar (espera o dedo parar) */
function aoTrocarCard(l) {
  if (fase === 'fora' || fase === 'saindo' || !l) return;
  reacaoCard?.kill();
  reacaoCard = gsap.delayedCall(0.35, () => {
    if (estado.tela !== 'locais') return;
    terminarEntrada();
    if (!calmo()) gesto(apontarCard());
    falar(curiosidadeCurta(l), TEMPO_CURIOSIDADE, { simples: true });
    agendarGesto();
  });
}

/** Curiosidades que cabem no balão pequeno, da mais curta para a mais longa, uma por vez */
function curiosidadeCurta(l) {
  const todas = [...(l.falas || [])].sort((a, b) => limpo(tr(a)).length - limpo(tr(b)).length);
  const curtas = todas.filter((f) => limpo(tr(f)).length <= CURIOSIDADE_CURTA);
  const lista = curtas.length ? curtas : todas.slice(0, 1);
  if (!lista.length) return l.frase;
  const k = vistas.get(l.id) || 0;
  vistas.set(l.id, k + 1);
  return lista[k % lista.length];
}

function brincar() {
  const lista = t('mascote.brincadeiras');
  if (!Array.isArray(lista) || !lista.length) return falar(t('mascote.saudacao'), TEMPO_CONVITE, { simples: true });
  let i;
  do i = Math.floor(Math.random() * lista.length);
  while (lista.length > 1 && i === ultimaBrincadeira);
  ultimaBrincadeira = i;
  falar(lista[i], TEMPO_CONVITE, { simples: true });
}

/** Estrelinhas douradas que saltam do mascote quando alguém toca nele */
function soltarEstrelas() {
  for (let i = 0; i < ESTRELAS_DO_TOQUE; i++) {
    const s = document.createElement('span');
    s.className = 'mascote__estrela';
    s.innerHTML = `<svg viewBox="0 0 20 20" aria-hidden="true"><polygon points="${estrela(10, 10, 10)}"/></svg>`;
    raiz.appendChild(s);
    // Leque para cima, levemente espalhado
    const a = -Math.PI / 2 + (i / (ESTRELAS_DO_TOQUE - 1) - 0.5) * Math.PI * 0.9;
    const dist = 70 + Math.random() * 50;
    gsap
      .timeline({ onComplete: () => s.remove() })
      .fromTo(s, { x: 0, y: 0, scale: 0, rotation: 0 }, { x: Math.cos(a) * dist, y: Math.sin(a) * dist, scale: 0.6 + Math.random() * 0.6, rotation: gsap.utils.random(-180, 180), duration: 0.7, ease: 'expo.out' })
      .to(s, { autoAlpha: 0, y: '+=18', duration: 0.45, ease: 'power1.in' }, 0.45);
  }
}

// --- Balão de fala -------------------------------------------------------------------
/** Convite curto do mapa, sem o título "Você sabia?". Depois dele, as dicas trocam a cada 8 s */
function convidar() {
  falar(t('mascote.convite'), TEMPO_DICA + 1500, { simples: true });
  indiceDica = 0; // a primeira dica é o próprio convite
  iniciarDicas();
}

function proximaFala() {
  indiceFala = (indiceFala + 1) % falas.length;
  falar(falas[indiceFala]);
}

/** Ponto da boca do mascote, em px a partir do canto do balão (para ele brotar dali) */
function origemNaBoca() {
  const m = p.sorriso.getBoundingClientRect();
  const r = raiz.getBoundingClientRect();
  const x = m.left + m.width / 2 - r.left - p.balao.offsetLeft;
  const y = m.top + m.height / 2 - r.top - p.balao.offsetTop;
  return `${x.toFixed(1)}px ${y.toFixed(1)}px`;
}

/** Mostra o balão e "digita" o texto letra por letra, com a boca mexendo */
export function falar(conteudo, duracao = 12000, { simples = false } = {}) {
  const texto = tr(conteudo);
  const balao = p.balao;
  const alvo = el('.mascote__texto');
  const sereno = calmo();
  // Já aberto: guarda onde o vidro e o rabinho estão para o balão mudar de tamanho sem pular
  const antes = balaoAberto && !sereno ? { vidro: p.vidro.getBoundingClientRect(), rabo: p.rabo.getBoundingClientRect() } : null;

  balao.classList.toggle('mascote__balao--simples', simples);
  el('.mascote__rotulo').textContent = t('mascote.rotulo');
  el('.mascote__dica').textContent = t('mascote.dica');

  clearInterval(timerDigitar);
  clearTimeout(timerOcultar);
  timerOcultar = setTimeout(esconderBalao, duracao);
  balaoAberto = true;

  const puro = limpo(texto);
  const sufixo = temConfirmar(texto) ? ' <span class="confirmar">CONFIRMAR</span>' : '';
  const concluir = () => {
    alvo.textContent = puro;
    alvo.insertAdjacentHTML('beforeend', sufixo);
    definirFala(false);
  };

  if (sereno) {
    gsap.fromTo(balao, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power1.out', overwrite: true });
    return concluir();
  }

  // O texto inteiro já ocupa seu espaço (invisível) — o balão não "cresce" enquanto digita
  alvo.innerHTML = '<span></span><span class="mascote__resto"></span>';
  const [visivelEl, restoEl] = alvo.children;
  restoEl.textContent = puro;

  if (antes) mudarTamanho(antes);
  else brotar();

  definirFala(true);
  let i = 0;
  timerDigitar = setInterval(() => {
    i += 1;
    visivelEl.textContent = puro.slice(0, i);
    restoEl.textContent = puro.slice(i);
    if (i >= puro.length) {
      clearInterval(timerDigitar);
      concluir();
    }
  }, 32);
}

/** O balão brota da boca: cresce com mola (0,6 → um pouco mais que 1 → 1) */
function brotar() {
  gsap.killTweensOf([p.balao, p.vidro, p.rabo, p.conteudo]);
  gsap.set([p.vidro, p.rabo], { x: 0, y: 0, scaleX: 1, scaleY: 1 });
  gsap.set(p.conteudo, { autoAlpha: 1 });
  gsap.set(p.balao, { transformOrigin: origemNaBoca() });
  gsap.fromTo(p.balao, { scale: 0.6 }, { scale: 1, duration: 0.6, ease: 'back.out(1.9)' });
  gsap.fromTo(p.balao, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.22, ease: 'power1.out' });
}

/**
 * Troca de fala com o balão aberto: o vidro e o rabinho saem do tamanho e lugar antigos
 * e vão até os novos (só transform), e o texto novo aparece por cima.
 */
function mudarTamanho(antes) {
  gsap.killTweensOf([p.balao, p.vidro, p.rabo, p.conteudo]);
  gsap.set(p.balao, { autoAlpha: 1, scale: 1 });
  gsap.set([p.vidro, p.rabo], { x: 0, y: 0, scaleX: 1, scaleY: 1 });
  const vidro = p.vidro.getBoundingClientRect();
  const rabo = p.rabo.getBoundingClientRect();
  if (!vidro.width || !vidro.height) return;
  gsap.fromTo(
    p.vidro,
    { x: antes.vidro.left - vidro.left, y: antes.vidro.top - vidro.top, scaleX: antes.vidro.width / vidro.width, scaleY: antes.vidro.height / vidro.height },
    { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.5, ease: 'back.out(1.3)', transformOrigin: '0 0' }
  );
  gsap.fromTo(p.rabo, { x: antes.rabo.left - rabo.left, y: antes.rabo.top - rabo.top }, { x: 0, y: 0, duration: 0.5, ease: 'back.out(1.3)' });
  gsap.fromTo(p.conteudo, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, delay: 0.15, ease: 'power1.out' });
}

/** Boca abrindo e fechando em ritmo irregular enquanto o balão escreve; a cabeça acompanha */
function definirFala(ligar) {
  if (ligar === p.svg.classList.contains('falando')) return;
  p.svg.classList.toggle('falando', ligar);
  tlBoca?.kill();
  tlFalaCabeca?.kill();
  const neutro = p.svg.dataset.rosto === 'normal';
  if (ligar) {
    gsap.set([p.sorriso, p.bocaO], { opacity: 0 });
    gsap.set(p.boca, { opacity: 1 });
    if (neutro) gsap.to(p.sobrancelhas, { y: -3, duration: 0.3 });
    tlBoca = gsap.to(p.boca, { scaleY: 'random(0.2, 1)', duration: 0.09, ease: 'sine.inOut', repeat: -1, repeatRefresh: true });
    if (!calmo()) tlFalaCabeca = gsap.to(p.cabeca, { y: 'random(-1.6, 0.8)', duration: 0.2, ease: 'sine.inOut', repeat: -1, repeatRefresh: true });
  } else {
    tlBoca = null;
    tlFalaCabeca = calmo() ? null : gsap.to(p.cabeca, { y: 0, duration: 0.3, ease: 'power2.out' });
    // Rindo ou acenando, o sorriso grande fica até a expressão acabar
    const feliz = p.svg.dataset.rosto === 'feliz';
    gsap.set(p.boca, { opacity: feliz ? 1 : 0, scaleY: 1 });
    gsap.set(p.sorriso, { opacity: feliz ? 0 : 1 });
    if (neutro) gsap.to(p.sobrancelhas, { y: 0, duration: 0.3 });
  }
}

/** Some encolhendo de volta para a boca do mascote */
function esconderBalao() {
  if (!p.balao || !balaoAberto) return;
  balaoAberto = false;
  clearInterval(timerDigitar);
  clearTimeout(timerOcultar);
  definirFala(false);
  if (calmo()) {
    gsap.to(p.balao, { autoAlpha: 0, duration: 0.4, ease: 'power1.in', overwrite: true });
    return;
  }
  gsap.killTweensOf(p.balao);
  gsap.set(p.balao, { transformOrigin: origemNaBoca() });
  gsap.to(p.balao, { scale: 0.6, duration: 0.35, ease: 'back.in(1.6)' });
  gsap.to(p.balao, { autoAlpha: 0, duration: 0.3, delay: 0.06, ease: 'power1.in' });
}
