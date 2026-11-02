// Carregamento antecipado de imagens (ex.: a capa do próximo local),
// para as transições não "piscarem" esperando a foto.
const cache = new Map();

export function preCarregar(urls) {
  return Promise.all(
    [].concat(urls).filter(Boolean).map((url) => {
      if (!cache.has(url)) {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        cache.set(
          url,
          img.decode().catch(() => {})
        );
      }
      return cache.get(url);
    })
  );
}
