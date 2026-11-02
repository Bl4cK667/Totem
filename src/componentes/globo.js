// Planeta Terra 3D (Three.js) da tela inicial.
// - Terra com shader próprio: dia, noite (luzes das cidades em dourado),
//   reflexo do sol nos oceanos, nuvens e borda iluminada.
// - Atmosfera (halo), estrelas cintilando e um marcador dourado em Canaã.
// - A "pose" (distância, posição e rotação) é animada pelo GSAP na transição.
import * as THREE from 'three';

const DEG = Math.PI / 180;
const FOV = 35;

/** Converte latitude/longitude em um ponto da esfera (mesmo mapeamento da SphereGeometry) */
export function latLonParaVetor(lat, lon, r = 1) {
  const phi = (lon + 180) * DEG;
  const theta = (90 - lat) * DEG;
  return new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
}

const vertTerra = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 pw = modelMatrix * vec4(position, 1.0);
    vPosW = pw.xyz;
    gl_Position = projectionMatrix * viewMatrix * pw;
  }
`;

const fragTerra = /* glsl */ `
  uniform sampler2D uDia;
  uniform sampler2D uLuzes;
  uniform sampler2D uOceano;
  uniform sampler2D uNuvens;
  uniform vec3 uSol;
  uniform float uTempo;
  uniform float uNuvensOpac;
  uniform vec3 uCorAtmo;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPosW;

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    float luz = dot(n, uSol);
    float dia = smoothstep(-0.18, 0.32, luz);

    // Cor do dia com leve correção quente (combina com a paleta)
    vec3 cor = texture2D(uDia, vUv).rgb;
    float lum = dot(cor, vec3(0.299, 0.587, 0.114));
    cor = mix(vec3(lum), cor, 0.82) * vec3(1.05, 1.0, 0.92);

    // Nuvens deslizando devagar
    float nuv = texture2D(uNuvens, vUv + vec2(uTempo * 0.0025, 0.0)).a * uNuvensOpac;
    cor = mix(cor, vec3(0.96, 0.94, 0.9), nuv * 0.72);
    cor *= 0.08 + 0.92 * dia;

    // Luzes das cidades no lado da noite, em dourado
    float luzes = texture2D(uLuzes, vUv).r;
    cor += vec3(1.0, 0.76, 0.38) * luzes * (1.0 - dia) * (1.0 - nuv) * 1.35;

    // Brilho do sol nos oceanos
    float oceano = texture2D(uOceano, vUv).r;
    vec3 h = normalize(uSol + v);
    float reflexo = max(dot(n, h), 0.0);
    float spec = (pow(reflexo, 420.0) * 0.4 + pow(reflexo, 48.0) * 0.03) * oceano * dia * (1.0 - nuv);
    cor += vec3(1.0, 0.86, 0.62) * spec;

    // Borda iluminada (fresnel)
    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    cor += uCorAtmo * fres * (0.25 + 0.75 * dia) * 0.9;

    gl_FragColor = vec4(cor, 1.0);
    #include <colorspace_fragment>
  }
`;

const vertAtmo = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vPosV;
  varying vec3 vNormalW;
  void main() {
    vNormalV = normalize(normalMatrix * normal);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vPosV = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragAtmo = /* glsl */ `
  uniform vec3 uCorAtmo;
  uniform vec3 uCorSol;
  uniform vec3 uSol;
  uniform float uOpac;
  varying vec3 vNormalV;
  varying vec3 vPosV;
  varying vec3 vNormalW;
  void main() {
    float d = dot(normalize(vNormalV), normalize(-vPosV));
    float a = pow(clamp(-d / 0.5, 0.0, 1.0), 2.4);
    float lado = smoothstep(-0.4, 0.7, dot(normalize(vNormalW), uSol));
    vec3 cor = mix(uCorAtmo, uCorSol, lado * 0.35);
    gl_FragColor = vec4(cor, a * (0.25 + 0.75 * lado) * uOpac);
  }
`;

const vertEstrelas = /* glsl */ `
  attribute float aTam;
  attribute float aFase;
  uniform float uTempo;
  uniform float uDpr;
  varying float vBrilho;
  void main() {
    vBrilho = 0.55 + 0.45 * sin(uTempo * (0.6 + aFase) + aFase * 20.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aTam * uDpr;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragEstrelas = /* glsl */ `
  uniform float uOpac;
  varying float vBrilho;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(1.0, 0.95, 0.85), a * vBrilho * uOpac);
  }
`;

export class Globo {
  constructor(canvas, { cidade }) {
    this.canvas = canvas;
    this.cidade = cidade;
    this.ativo = false;
    this.girando = true;
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x120d09, 1);
    this.renderer.setPixelRatio(this.dpr);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 400);

    // Hierarquia: pivo (posição na tela) → inclinacao (lat/tilt) → terra (giro)
    this.pivo = new THREE.Group();
    this.inclinacao = new THREE.Group();
    this.terra = new THREE.Group();
    this.pivo.add(this.inclinacao);
    this.inclinacao.add(this.terra);
    this.scene.add(this.pivo);

    // Valores animáveis pelo GSAP
    this.pose = { dist: 6, x: 0, y: 0, rotX: -0.22, rotZ: -0.16, rotY: 0, atmo: 1, nuvens: 1, estrelas: 1, flutuar: 1 };

    this.sol = new THREE.Vector3(-0.55, 0.38, 0.74).normalize();
        this.tempo = 0;
  }

  async carregar() {
    const loader = new THREE.TextureLoader();
    const carregar = (url, srgb) =>
      new Promise((ok, erro) =>
        loader.load(
          url,
          (t) => {
            if (srgb) t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = 4;
            ok(t);
          },
          undefined,
          erro
        )
      );
    const base = 'assets/img/globo/';
    const [dia, luzes, oceano, nuvens] = await Promise.all([
      carregar(base + 'terra-dia.webp', true),
      carregar(base + 'terra-luzes.webp'),
      carregar(base + 'terra-oceano.webp'),
      carregar(base + 'terra-nuvens.webp'),
    ]);
    // As nuvens deslizam: sem repetir, a borda da textura vira riscos e um corte no planeta
    nuvens.wrapS = THREE.RepeatWrapping;

    const corAtmo = new THREE.Color('#9fc4df');

    this.matTerra = new THREE.ShaderMaterial({
      vertexShader: vertTerra,
      fragmentShader: fragTerra,
      uniforms: {
        uDia: { value: dia },
        uLuzes: { value: luzes },
        uOceano: { value: oceano },
        uNuvens: { value: nuvens },
        uSol: { value: this.sol },
        uTempo: { value: 0 },
        uNuvensOpac: { value: 1 },
        uCorAtmo: { value: corAtmo },
      },
    });
    this.terra.add(new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), this.matTerra));

    // Atmosfera: casca maior, só a parte de trás, mistura aditiva
    this.matAtmo = new THREE.ShaderMaterial({
      vertexShader: vertAtmo,
      fragmentShader: fragAtmo,
      uniforms: {
        uCorAtmo: { value: corAtmo },
        uCorSol: { value: new THREE.Color('#f0d39a') },
        uSol: { value: this.sol },
        uOpac: { value: 1 },
      },
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.16, 96, 64), this.matAtmo);
    this.inclinacao.add(atmo);

    this.criarEstrelas();
    this.criarMarcador();

    // Rotação inicial: começa com as Américas entrando pela esquerda
    this.pose.rotY = this.rotacaoParaCidade() - 0.45;
    this.layout();
    window.addEventListener('resize', () => this.layout());
  }

  criarEstrelas() {
    const qtd = 1800;
    const pos = new Float32Array(qtd * 3);
    const tam = new Float32Array(qtd);
    const fase = new Float32Array(qtd);
    for (let i = 0; i < qtd; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 60);
      pos.set([v.x, v.y, v.z], i * 3);
      tam[i] = Math.random() < 0.06 ? 2.6 + Math.random() * 1.6 : 0.9 + Math.random() * 1.4;
      fase[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aTam', new THREE.BufferAttribute(tam, 1));
    geo.setAttribute('aFase', new THREE.BufferAttribute(fase, 1));
    this.matEstrelas = new THREE.ShaderMaterial({
      vertexShader: vertEstrelas,
      fragmentShader: fragEstrelas,
      uniforms: { uTempo: { value: 0 }, uDpr: { value: this.dpr }, uOpac: { value: 0.85 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.estrelas = new THREE.Points(geo, this.matEstrelas);
    this.scene.add(this.estrelas);
  }

  // Ponto dourado + anel pulsante sobre Canaã
  criarMarcador() {
    const p = latLonParaVetor(this.cidade.lat, this.cidade.lng, 1.002);
    const grupo = new THREE.Group();
    grupo.position.copy(p);
    grupo.lookAt(p.clone().multiplyScalar(2));
    const ouro = new THREE.Color('#e4c77e');
    const ponto = new THREE.Mesh(
      new THREE.CircleGeometry(0.006, 24),
      new THREE.MeshBasicMaterial({ color: ouro, transparent: true })
    );
    this.anel = new THREE.Mesh(
      new THREE.RingGeometry(0.012, 0.0145, 48),
      new THREE.MeshBasicMaterial({ color: ouro, transparent: true, side: THREE.DoubleSide })
    );
    grupo.add(ponto, this.anel);
    this.terra.add(grupo);
  }

  /** Rotação Y que deixa Canaã de frente para a câmera */
  rotacaoParaCidade() {
    const p = latLonParaVetor(this.cidade.lat, this.cidade.lng);
    return Math.atan2(-p.x, p.z);
  }

  /** Pose de repouso (tela inicial), conforme a orientação da tela */
  poseInicial() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const tan = Math.tan((FOV / 2) * DEG);
    if (aspect < 1) {
      // Vertical: planeta grande "nascendo" na parte de baixo
      const larguraVisivel = 2 / 1.22;
      const dist = larguraVisivel / (2 * tan * aspect);
      const alturaVisivel = 2 * dist * tan;
      return { dist, x: 0, y: -alturaVisivel * 0.29 };
    }
    // Horizontal: planeta à direita, texto à esquerda
    const alturaVisivel = 2 / 0.86;
    const dist = alturaVisivel / (2 * tan);
    return { dist, x: alturaVisivel * aspect * 0.2, y: -alturaVisivel * 0.02 };
  }

  /** Pose final do zoom: Canaã no centro, Brasil ocupando boa parte da tela */
  poseFoco() {
    const aspect = window.innerWidth / window.innerHeight;
    const tan = Math.tan((FOV / 2) * DEG);
    const alvoSuperficie = 0.95; // largura (em raios) visível na superfície
    const dist = 1 + alvoSuperficie / (2 * tan * Math.min(aspect, 1));
    const alvoY = this.rotacaoParaCidade();
    const voltas = Math.round((this.pose.rotY - alvoY) / (Math.PI * 2));
    // Caminho mais curto até a cidade (sem dar uma volta inteira)
    return { dist, x: 0, y: 0, rotX: this.cidade.lat * DEG, rotZ: 0, rotY: alvoY + voltas * Math.PI * 2 };
  }

  /** Largura visível (em graus de longitude) na superfície, com a pose atual — usada para alinhar o mapa SVG */
  grausVisiveis(dist = this.pose.dist) {
    const tan = Math.tan((FOV / 2) * DEG);
    const aspect = window.innerWidth / window.innerHeight;
    const larguraSuperficie = 2 * (dist - 1) * tan * aspect;
    return larguraSuperficie / DEG;
  }

  aplicarPoseInicial() {
    Object.assign(this.pose, this.poseInicial(), { rotX: -0.22, rotZ: -0.16, atmo: 1, nuvens: 1, estrelas: 1, flutuar: 1 });
  }

  layout() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (!this.emTransicao) Object.assign(this.pose, this.poseInicial());
  }

  iniciar() {
    if (this.ativo) return;
    this.ativo = true;
    this.ultimoQuadro = performance.now();
    const loop = () => {
      if (!this.ativo) return;
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  pausar() {
    this.ativo = false;
    cancelAnimationFrame(this.raf);
  }

  render() {
    const agora = performance.now();
    const dt = Math.min((agora - this.ultimoQuadro) / 1000, 0.05);
    this.ultimoQuadro = agora;
    this.tempo += dt;
    const p = this.pose;
    if (this.girando) p.rotY += dt * 0.045;

    // Flutuação bem lenta enquanto está em repouso
    this.pivo.position.set(p.x, p.y + Math.sin(this.tempo * 0.28) * 0.018 * p.flutuar, 0);
    this.inclinacao.rotation.set(p.rotX, 0, p.rotZ);
    this.terra.rotation.y = p.rotY;
    this.camera.position.set(0, 0, p.dist);
    this.camera.lookAt(0, 0, 0);

    this.matTerra.uniforms.uTempo.value = this.tempo % 400; // 400 s = uma volta das nuvens (fecha o ciclo sem salto)
    this.matTerra.uniforms.uNuvensOpac.value = p.nuvens;
    this.matAtmo.uniforms.uOpac.value = p.atmo;
    this.matEstrelas.uniforms.uTempo.value = this.tempo;
    this.matEstrelas.uniforms.uOpac.value = 0.85 * p.estrelas;
    this.estrelas.rotation.y = this.tempo * 0.004;

    const pulso = (this.tempo * 0.7) % 1;
    this.anel.scale.setScalar(1 + pulso * 2.2);
    this.anel.material.opacity = 1 - pulso;

    this.renderer.render(this.scene, this.camera);
  }
}
