import { defineConfig } from 'vite';
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

// config.js não passa pelo empacotamento: fica editável fora do código.
// Na Vercel, a chave vem da variável GOOGLE_MAPS_KEY, para não ir ao GitHub.
function lerConfig() {
  const texto = readFileSync('config.js', 'utf8');
  const chave = process.env.GOOGLE_MAPS_KEY;
  return chave ? texto.replace(/(const GOOGLE_MAPS_KEY = )"[^"]*"/, (_, inicio) => inicio + JSON.stringify(chave)) : texto;
}

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
    writeFileSync('dist/config.js', lerConfig());
  },
};

// No totem (vite preview), usa sempre o config.js da raiz: basta salvar e recarregar
const configNoPreview = {
  name: 'config-no-preview',
  configurePreviewServer(server) {
    server.middlewares.use('/config.js', (_req, res) => {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.end(lerConfig());
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
