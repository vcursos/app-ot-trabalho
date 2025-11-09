const CACHE_NAME = 'ot-app-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script1.js',
  './limpar-dados.html',
  './js/servicosMOI.js',
  './logo.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Apenas GET deve ser tratado via cache
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          // Cache dinâmico (apenas respostas válidas)
          if (res && res.status === 200 && res.type === 'basic') {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);

      // Resposta imediata do cache se existir, senão aguarda rede
      return cached || fetchPromise;
    })
  );
});
