// ============================================
// SERVICE WORKER DEFINITIVO - Versión 3.0
// ============================================

const CACHE_VERSION = 'v3_' + new Date().toISOString().split('T')[0];
const CACHE_NAME = `enlace-pos-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Archivos esenciales para el funcionamiento offline
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/script.js',
  '/manifest.json'
];

// Instalación - Cache de archivos estáticos
self.addEventListener('install', event => {
  console.log('[SW] Instalando versión:', CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_CACHE_URLS);
      await self.skipWaiting();
      console.log('[SW] Cache completado');
    })()
  );
});

// Activación - Limpieza de caches viejos
self.addEventListener('activate', event => {
  console.log('[SW] Activando versión:', CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      // Eliminar todas las caches que no sean la actual
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Eliminando cache viejo:', name);
            return caches.delete(name);
          })
      );
      
      // Tomar control inmediato de todas las pestañas
      await self.clients.claim();
      console.log('[SW] Control tomado');
    })()
  );
});

// Interceptar peticiones - Estrategia: Network First, luego Cache
self.addEventListener('fetch', event => {
  // Ignorar peticiones a Google APIs y otros dominios externos
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    // Para recursos externos, usar solo cache si falla la red
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }
  
  // Para recursos propios: Network First
  event.respondWith(
    (async () => {
      try {
        // Intentar obtener de la red primero
        const networkResponse = await fetch(event.request);
        
        // Si es exitoso, actualizar cache
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // Si falla la red, buscar en cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          console.log('[SW] Sirviendo desde cache:', event.request.url);
          return cachedResponse;
        }
        
        // Si no hay cache y es una navegación, mostrar página offline
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});