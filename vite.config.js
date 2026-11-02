import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'node:fs';

// As pastas data/ e assets/img/ são lidas em tempo de execução (fetch / <img>),
// então são copiadas inteiras para dist/ no build. Assim dá para trocar fotos
// e textos direto em dist/ sem precisar compilar de novo.
const copiarConteudo = {
  name: 'copiar-conteudo',
  apply: 'build',
  closeBundle() {
    cpSync('data', 'dist/data', { recursive: true });
    cpSync('assets/img', 'dist/assets/img', { recursive: true });
    if (existsSync('sw.js')) cpSync('sw.js', 'dist/sw.js');
  },
};

export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 1200 },
  plugins: [copiarConteudo],
});
