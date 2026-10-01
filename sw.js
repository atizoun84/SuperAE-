/* =====================================================================
   Service Worker - SuperAE (anciennement AnimHebdo / Mercredi Pédago)
   Version : 1.0.2 (isolation multi-apps GitHub Pages)
   Rôle : mise en cache hors ligne + support PWA + notifications push
   ===================================================================== */

// 🔧 CORRECTION ISOLATION : préfixe "superae-" unique à cette application
// pour ne jamais toucher aux caches d'une autre app du même domaine.
const CACHE_NAME = 'superae-cache-v1';
const RUNTIME_CACHE = 'superae-runtime-v1';

// Préfixe unique à cette application : sert à ne jamais toucher
// aux caches d'autres applications hébergées sur le même domaine.
// 🔧 CORRECTION ISOLATION : 'animhebdo-' → 'superae-'
const APP_CACHE_PREFIX = 'superae-';

// Portée réelle du Service Worker : tout ce qui est hors de ce chemin
// appartient à d'autres applications et ne doit PAS être intercepté.
// Ex : si sw.js est dans /SuperAE-/, SW_SCOPE = '/SuperAE-/'.
const SW_SCOPE = (() => {
  const path = self.location.pathname;
  // On retire le nom du fichier sw.js pour ne garder que le dossier
  const dir = path.substring(0, path.lastIndexOf('/') + 1);
  return dir || '/';
})();

// Ressources locales à mettre en cache dès l'installation
const PRECACHE_URLS = [
  './',
  './index.html',
  './config-annee.html',
  './programmation.html',
  './export.html',
  './aide.html',
  './manifest.json',
  './logoappae.png'
];

// Ressources externes (CDN) à mettre en cache à la volée
const RUNTIME_HOSTS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com'
];

/* ---------- UTILITAIRE : appartenance à la portée ---------- */
function isInScope(url) {
  // On ne gère que les URL qui appartiennent à notre sous-dossier.
  // Le préfixe SW_SCOPE garantit qu'on n'intercepte jamais les requêtes
  // d'une autre application hébergée ailleurs sur le même domaine.
  return url.pathname.startsWith(SW_SCOPE);
}

/* ---------- INSTALLATION ---------- */
self.addEventListener('install', (event) => {
  console.log('[SW] Installation en cours... (scope:', SW_SCOPE, ')');
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
        // On ne supprime QUE les caches préfixés par APP_CACHE_PREFIX.
        // Ainsi, les caches d'autres applications du même domaine
        // (ex : genpct-cache-v1) ne sont JAMAIS touchés.
        .filter((name) =>
          name.startsWith(APP_CACHE_PREFIX) &&
          name !== CACHE_NAME &&
          name !== RUNTIME_CACHE
        )
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
  
  // ---- Filtre de portée : ne rien intercepter hors de notre dossier ----
  // Empêche toute interférence avec une autre application GitHub Pages
  // (ex : SuperAE, GenPCT) hébergée sur le même domaine.
  if (url.origin === self.location.origin && !isInScope(url)) {
    return;
  }
  
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
          // Hors ligne ET pas en cache : retour à l'accueil de NOTRE app
          return caches.match(SW_SCOPE + 'index.html') ||
            caches.match('./index.html');
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
  // 🔧 CORRECTION ISOLATION : titre et tag par défaut adaptés à SuperAE
  let data = {
    title: 'SuperAE',
    body: 'Nouvelle notification',
    icon: './logoappae.png',
    badge: './logoappae.png',
    tag: 'superae'
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
      data: { url: data.url || (SW_SCOPE + 'index.html') }
    })
  );
});

/* ---------- CLIC SUR UNE NOTIFICATION ---------- */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || (SW_SCOPE + 'index.html');
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre de l'appli est déjà ouverte, on la focus
      for (const client of clientList) {
        if (client.url.includes(SW_SCOPE) && 'focus' in client) {
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