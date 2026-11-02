// Service worker do totem: guarda os arquivos para funcionar sem internet.
// - HTML e JSON: tenta a rede primeiro (para receber atualizações) e cai no cache
// - Imagens, fontes, JS, CSS: cache primeiro
// - Street View (Google) não passa por aqui: depende da internet
// Ao trocar fotos mantendo o nome do arquivo, aumente a versão: o cache antigo é apagado
const CACHE = 'totem-mirante-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
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
