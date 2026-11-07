import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'node:fs';
import { middlewareTotem } from './scripts/servidor.js';

// As pastas data/, assets/img/, assets/mapa/, audio/ e libras/ são lidas em tempo de execução
// (fetch / <img> / <audio>), então são copiadas inteiras para dist/ no build.
const copiarConteudo = {
  name: 'copiar-conteudo',
  apply: 'build',
  closeBundle() {
    cpSync('data', 'dist/data', { recursive: true });
    cpSync('assets/img', 'dist/assets/img', { recursive: true });
    cpSync('assets/mapa', 'dist/assets/mapa', { recursive: true });
    for (const pasta of ['audio', 'libras']) if (existsSync(pasta)) cpSync(pasta, `dist/${pasta}`, { recursive: true });
    if (existsSync('sw.js')) cpSync('sw.js', 'dist/sw.js');
  },
};

// Registros (api/erro, api/uso, api/batimento) também no npm run dev e no preview.
// No preview (e no servidor do totem), data/, audio/ e libras/ vêm sempre da pasta do projeto:
// basta salvar o lugares.json e recarregar, sem compilar de novo
const totem = {
  name: 'totem',
  configureServer(server) {
    server.middlewares.use(middlewareTotem());
  },
  configurePreviewServer(server) {
    server.middlewares.use(middlewareTotem({ dadosDaRaiz: true }));
  },
};

export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 2200 },
  plugins: [copiarConteudo, totem],
});
