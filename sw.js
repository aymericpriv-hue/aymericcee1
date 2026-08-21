/* Service worker CEE1 — stratégie « réseau d'abord ».
   En ligne : on sert TOUJOURS la version fraîche du site (aucun risque de rester
   bloqué sur une vieille version après une mise à jour).
   Hors ligne : on sert la dernière version mise en cache. */

const CACHE_NAME = 'cee1-v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(['./', './index.html']).catch(function () {});
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; })
            .map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Pages : réseau d'abord, cache en secours (hors ligne)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (resp) {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put('./index.html', copy); });
        return resp;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Ressources même origine (icônes, manifeste) : réseau d'abord, cache en secours
  if (new URL(req.url).origin === self.location.origin) {
    event.respondWith(
      fetch(req).then(function (resp) {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        return resp;
      }).catch(function () {
        return caches.match(req);
      })
    );
  }
  // Tout le reste (Firebase, polices, socket…) : comportement normal du navigateur.
});
