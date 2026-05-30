// Service Worker - Registro Fotográfico de Obra
// Versión de caché - cambia este número para forzar actualización
const CACHE_VERSION = 'v1.2';
const CACHE_NAME = `registro-obra-${CACHE_VERSION}`;

// Archivos a cachear para uso offline
const FILES_TO_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/docx/8.5.0/docx.umd.min.js',
  'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.min.js',
  'https://unpkg.com/docx@8.5.0/build/index.umd.min.js'
];

// ── INSTALL: cachea todos los archivos
self.addEventListener('install', event => {
  console.log('[SW] Instalando caché...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE).catch(err => {
        console.warn('[SW] Algunos archivos no se pudieron cachear:', err);
      });
    }).then(() => {
      console.log('[SW] Caché lista ✅');
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE: limpia cachés viejos
self.addEventListener('activate', event => {
  console.log('[SW] Activando nueva versión...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Eliminando caché viejo:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: sirve desde caché, falla gracefully si offline
self.addEventListener('fetch', event => {
  // Solo intercepta GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Sirve desde caché y actualiza en background
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached;
      }
      // No está en caché: intenta red
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline y no está cacheado
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── MENSAJE: fuerza actualización desde la app
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
