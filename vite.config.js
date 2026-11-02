import { defineConfig } from 'vite';
import { cpSync, existsSync, readFileSync } from 'node:fs';

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
    cpSync('config.js', 'dist/config.js');
  },
};

// No totem (vite preview), usa sempre o config.js da raiz: basta salvar e recarregar
const configNoPreview = {
  name: 'config-no-preview',
  configurePreviewServer(server) {
    server.middlewares.use('/config.js', (_req, res) => {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(readFileSync('config.js'));
    });
  },
};

export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { target: 'es2020', assetsInlineLimit: 0, chunkSizeWarningLimit: 1200 },
  plugins: [copiarConteudo, configNoPreview],
});
