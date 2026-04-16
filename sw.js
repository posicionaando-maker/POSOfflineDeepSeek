// ============================================
// SERVICE WORKER - Modo Amigable
// ============================================

const CACHE_NAME = 'pos-pro-v6';
const urlsToCache = [
  '/POSOfflineDeepSeek/',
  '/POSOfflineDeepSeek/index.html',
  '/POSOfflineDeepSeek/script.js',
  '/POSOfflineDeepSeek/manifest.json'
];

// INSTALACIÓN - Cachear archivos sin interrumpir
self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cacheando archivos');
      return cache.addAll(urlsToCache).catch(err => {
        console.log('[SW] Error cacheando:', err);
      });
    })
  );
  self.skipWaiting();
});

// ACTIVACIÓN - Limpiar caches viejos
self.addEventListener('activate', event => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[SW] Eliminando cache viejo:', key);
          return caches.delete(key);
        })
      );
    })
  );
  // Tomar control pero NO recargar automáticamente
  event.waitUntil(self.clients.claim());
});

// FETCH - Estrategia: Network First, fallback a cache
self.addEventListener('fetch', event => {
  // No interceptar peticiones a Google Sheets (API externa)
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('script.google.com')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cachear respuesta exitosa para futuro offline
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, buscar en cache
        return caches.match(event.request)
          .then(response => {
            if (response) {
              console.log('[SW] Sirviendo desde cache:', event.request.url);
              return response;
            }
            // Si no hay cache, devolver página de error
            if (event.request.mode === 'navigate') {
              return caches.match('/POSOfflineDeepSeek/index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});