// Converte as fotos reais para WebP otimizado, no tamanho certo para o totem.
//
// 1. Coloque as fotos (JPG, PNG, HEIC não) em  fotos-originais/
//    com o MESMO nome que o arquivo provisório, por exemplo:
//       fotos-originais/lago-prefeitura-capa.jpg
//       fotos-originais/lago-prefeitura-antes.jpg
// 2. Rode: npm run imagens
// 3. As versões otimizadas vão para assets/img/locais/ (substituindo as provisórias):
//       lago-prefeitura-capa.webp     (grande, até 1600 px de largura)
//       lago-prefeitura-capa-sm.webp  (miniatura, 800 px)
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import { extname, basename } from 'node:path';

const ENTRADA = 'fotos-originais';
const SAIDA = 'assets/img/locais';
mkdirSync(SAIDA, { recursive: true });

const arquivos = readdirSync(ENTRADA).filter((f) => /\.(jpe?g|png|webp|tiff?)$/i.test(f));
if (!arquivos.length) {
  console.log(`Nenhuma foto em ${ENTRADA}/. Coloque as fotos lá e rode de novo.`);
  process.exit(0);
}

for (const arq of arquivos) {
  const nome = basename(arq, extname(arq)).toLowerCase().replace(/\s+/g, '-');
  const img = sharp(`${ENTRADA}/${arq}`).rotate(); // respeita a orientação da câmera
  await img.clone().resize({ width: 1600, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(`${SAIDA}/${nome}.webp`);
  await img.clone().resize({ width: 800, withoutEnlargement: true }).webp({ quality: 76 }).toFile(`${SAIDA}/${nome}-sm.webp`);
  console.log(`ok  ${arq}  →  ${SAIDA}/${nome}.webp`);
}
