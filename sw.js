// Service worker do totem: guarda os arquivos do próprio totem para funcionar sem internet.
// - HTML e JSON (textos e lugares): tenta a rede primeiro (para receber atualizações) e cai no cache
// - Imagens, fontes, JS, CSS, mapa local: cache primeiro
// - Imagens de satélite (Esri) NÃO são guardadas: a licença da camada World Imagery não permite
//   guardá-las para uso offline. Sem internet, o mapa usa as camadas locais (OpenStreetMap e NASA).
// - Street View (Google), áudios e vídeos não passam por aqui
// Ao trocar fotos mantendo o nome do arquivo, aumente a versão: o cache antigo é apagado
const CACHE = 'totem-mirante-v7';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      // Apaga também o cache antigo de imagens de satélite (totem-mapa-v1)
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
);

// A página envia a lista de tudo o que usa para deixar em cache de uma vez
self.addEventListener('message', (e) => {
  if (e.data?.tipo !== 'precache') return;
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(e.data.urls.map((u) => c.add(u).catch(() => {})))));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/') || /\.(mp3|mp4|webm)$/.test(url.pathname)) return;

  const daRede = () =>
    fetch(req).then((res) => {
      if (res.ok) {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copia));
      }
      return res;
    });

  // ignoreVary: JS e CSS são pedidos com cabeçalho Origin, que o pré-cache não tem
  if (req.mode === 'navigate' || url.pathname.endsWith('.json')) {
    e.respondWith(daRede().catch(() => caches.match(req, { ignoreSearch: true, ignoreVary: true })));
  } else {
    e.respondWith(caches.match(req, { ignoreVary: true }).then((r) => r || daRede()));
  }
});
