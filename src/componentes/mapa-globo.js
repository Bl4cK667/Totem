// Mapa desenhado na própria esfera do planeta (contornos do IBGE).
// Brasil, estados, Pará e Canaã ficam colados na superfície: a câmera só desce
// até eles, sem troca de cena. Por isso o mapa nunca muda de posição ou tamanho.
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { BRASIL, ESTADOS, PARA, CANAA, PROJ } from './mapa-dados.js';

const DEG = Math.PI / 180;

/** Converte latitude/longitude em um ponto da esfera (mesmo mapeamento da SphereGeometry) */
export function latLonParaVetor(lat, lon, r = 1) {
  const phi = (lon + 180) * DEG;
  const theta = (90 - lat) * DEG;
  return new THREE.Vector3(-r * Math.cos(phi) * Math.sin(theta), r * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta));
}

/** Coordenadas do mapa-dados.js → ponto na esfera */
const naEsfera = ([x, y], r) => latLonParaVetor(PROJ.lat0 - y / PROJ.k, x / PROJ.k + PROJ.lon0, r);

/** Caminho "M..L..Z" → lista de trechos, cada um com seus pontos [x, y] */
function trechos(d) {
  return d
    .split('M')
    .filter(Boolean)
    .map((s) => s.replace(/Z/g, '').split('L').map((p) => p.trim().split(/\s+/).map(Number)));
}

function contorno(d, r, cor, largura, ordem) {
  const pos = [];
  for (const trecho of trechos(d)) {
    const v = trecho.map((p) => naEsfera(p, r));
    for (let i = 1; i < v.length; i++) pos.push(v[i - 1].x, v[i - 1].y, v[i - 1].z, v[i].x, v[i].y, v[i].z);
  }
  const material = new LineMaterial({ color: cor, linewidth: largura, transparent: true, depthWrite: false });
  const linha = new LineSegments2(new LineSegmentsGeometry().setPositions(pos), material);
  linha.frustumCulled = false;
  linha.renderOrder = ordem;
  linha.userData.total = pos.length / 6;
  return linha;
}

function preenchimento(d, r, cor, alfa, ordem) {
  const material = new THREE.MeshBasicMaterial({ color: cor, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  material.userData.alfa = alfa;
  const grupo = new THREE.Group();
  const dividir = new TessellateModifier(20, 7); // triângulos pequenos acompanham a curva da esfera
  for (const trecho of trechos(d)) {
    const pontos = trecho.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y));
    const pos = [];
    for (const tri of THREE.ShapeUtils.triangulateShape(pontos, [])) for (const i of tri) pos.push(pontos[i].x, pontos[i].y, 0);
    const plano = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const geo = dividir.modify(plano);
    const p = geo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const v = naEsfera([p.getX(i), p.getY(i)], r);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    const malha = new THREE.Mesh(geo, material);
    malha.frustumCulled = false;
    malha.renderOrder = ordem;
    grupo.add(malha);
  }
  return { grupo, material };
}

function grade(r, cor, ordem) {
  const pos = [];
  const trecho = (a, b) => pos.push(...a.toArray(), ...b.toArray());
  for (let lon = -75; lon <= -30; lon += 5) for (let la = -36; la < 8; la++) trecho(latLonParaVetor(la, lon, r), latLonParaVetor(la + 1, lon, r));
  for (let la = -35; la <= 5; la += 5) for (let lon = -76; lon < -32; lon++) trecho(latLonParaVetor(la, lon, r), latLonParaVetor(la, lon + 1, r));
  const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const linhas = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: cor, transparent: true, depthWrite: false }));
  linhas.frustumCulled = false;
  linhas.renderOrder = ordem;
  return linhas;
}

export class MapaGlobo {
  constructor(terra, cores) {
    this.grupo = new THREE.Group();
    terra.add(this.grupo);

    this.grade = grade(1.001, cores.ouro, 1);
    this.brasilFundo = preenchimento(BRASIL, 1.0012, cores.ouro, 0.07, 2);
    this.estados = contorno(ESTADOS, 1.0014, cores.ouro, 0.9, 3);
    this.brasil = contorno(BRASIL, 1.0016, cores.ouro, 1.4, 4);
    this.paraFundo = preenchimento(PARA, 1.0018, cores.mata, 0.55, 5);
    this.para = contorno(PARA, 1.002, cores.ouroClaro, 1.8, 6);
    this.canaaFundo = preenchimento(CANAA, 1.0022, cores.ouroClaro, 0.22, 7);
    this.canaa = contorno(CANAA, 1.0024, cores.ouroClaro, 2.2, 8);

    this.grupo.add(this.grade, this.brasilFundo.grupo, this.estados, this.brasil, this.paraFundo.grupo, this.para, this.canaaFundo.grupo, this.canaa);

    // Valores animados pelo GSAP (0 a 1). *Traco = quanto do contorno já foi desenhado
    this.v = {};
    this.restaurar();
  }

  restaurar() {
    Object.assign(this.v, {
      grade: 0,
      brasilTraco: 0,
      brasilAlfa: 1,
      brasilFundo: 0,
      estados: 0,
      paraTraco: 0,
      paraFundo: 0,
      canaaTraco: 0,
      canaaFundo: 0,
    });
    this.grupo.visible = false;
  }

  /** Revela uma fração do contorno, do começo do traçado até o fim */
  tracar(linha, fracao, alfa = 1) {
    linha.visible = fracao > 0 && alfa > 0;
    linha.geometry.instanceCount = Math.round(linha.userData.total * fracao);
    linha.material.opacity = alfa;
  }

  atualizar() {
    const { v } = this;
    this.grade.material.opacity = 0.14 * v.grade;
    this.tracar(this.brasil, v.brasilTraco, v.brasilAlfa);
    this.tracar(this.estados, 1, 0.3 * v.estados);
    this.tracar(this.para, v.paraTraco);
    this.tracar(this.canaa, v.canaaTraco);
    for (const [fundo, valor] of [[this.brasilFundo, v.brasilFundo], [this.paraFundo, v.paraFundo], [this.canaaFundo, v.canaaFundo]]) {
      fundo.grupo.visible = valor > 0;
      fundo.material.opacity = fundo.material.userData.alfa * valor;
    }
  }
}
