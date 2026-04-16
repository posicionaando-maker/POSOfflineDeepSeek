// ============================================
// SERVICE WORKER - Modo de emergencia
// ============================================

const CACHE_NAME = 'pos-pro-v3';

// Durante la instalación, borrar caches viejos
self.addEventListener('install', event => {
    console.log('[SW] Instalando nueva versión...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.map(key => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Eliminando cache viejo:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.skipWaiting();
});

// Durante la activación, tomar control inmediato
self.addEventListener('activate', event => {
    console.log('[SW] Activando y tomando control...');
    event.waitUntil(
        Promise.all([
            clients.claim(),
            caches.delete(CACHE_NAME) // Limpiamos todo al activar
        ])
    );
    // Recargar todas las pestañas para forzar la nueva versión
    event.waitUntil(
        clients.matchAll().then(clients => {
            clients.forEach(client => client.navigate(client.url));
        })
    );
});

// No interceptar nada - modo transparente
self.addEventListener('fetch', event => {
    // No hacer nada, dejar que el navegador maneje todo
    return;
});