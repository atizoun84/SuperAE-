/* =====================================================================
   Service Worker - AnimHebdo / Mercredi Pédago
   Version : 1.0.0
   Rôle : mise en cache hors ligne + support PWA + notifications push
   ===================================================================== */

const CACHE_NAME = 'animhebdo-cache-v1';
const RUNTIME_CACHE = 'animhebdo-runtime-v1';

// Ressources locales à mettre en cache dès l'installation
const PRECACHE_URLS = [
  './',
  './index.html',
  './config-annee.html',
  './programmation.html',
  './export.html',
  './aide.html',
  './manifest.json',
  './logoapp.png'
];

// Ressources externes (CDN) à mettre en cache à la volée
const RUNTIME_HOSTS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com'
];

/* ---------- INSTALLATION ---------- */
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours...');
  event.waitUntil(
    caches.open(CACHE_NAME)
    .then((cache) => {
      console.log('[SW] Mise en cache des ressources de base');
      return cache.addAll(PRECACHE_URLS);
    })
    .then(() => self.skipWaiting())
    .catch((err) => console.error('[SW] Erreur de pré-cache :', err))
  );
});

/* ---------- ACTIVATION ---------- */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
        .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
        .map((name) => {
          console.log('[SW] Suppression ancien cache :', name);
          return caches.delete(name);
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* ---------- INTERCEPTION DES REQUÊTES (FETCH) ---------- */
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // On ignore les requêtes non GET
  if (request.method !== 'GET') return;
  
  const url = new URL(request.url);
  
  // ---- Stratégie 1 : Cache First pour les fichiers locaux ----
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Rafraîchissement en arrière-plan (stale-while-revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          }).catch(() => { /* hors ligne : on garde le cache */ });
          return cachedResponse;
        }
        
        // Pas en cache : on va sur le réseau et on stocke
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Hors ligne ET pas en cache : retour à l'accueil
          return caches.match('./index.html');
        });
      })
    );
    return;
  }
  
  // ---- Stratégie 2 : Cache First pour les CDN connus ----
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // CDN inaccessible et pas en cache : rien à faire
          return new Response('', { status: 408, statusText: 'Hors ligne' });
        });
      })
    );
    return;
  }
  
  // ---- Stratégie 3 : Par défaut, réseau simple ----
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

/* ---------- NOTIFICATIONS PUSH ---------- */
self.addEventListener('push', (event) => {
  console.log('[SW] Push reçu');
  let data = {
    title: 'AnimHebdo',
    body: 'Nouvelle notification',
    icon: './logoapp.png',
    badge: './logoapp.png',
    tag: 'animhebdo'
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      data = Object.assign(data, payload);
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: { url: data.url || './index.html' }
    })
  );
});

/* ---------- CLIC SUR UNE NOTIFICATION ---------- */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || './index.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre de l'appli est déjà ouverte, on la focus
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Sinon on en ouvre une nouvelle
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

/* ---------- MESSAGE DEPUIS LA PAGE ---------- */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});