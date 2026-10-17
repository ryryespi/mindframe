// sw.js — caches the app so it can open again with no network.
//
// Every path is relative to this file. On your computer that is
// http://localhost:8000/. On GitHub Pages it is /mindframe/.
// A leading slash would skip that folder and break one of those two.

const CACHE = "mindframe-shell-v2";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./js/analyzer.js",
  "./js/grounding.js",
  "./js/cbt-techniques.js",
  "./js/bots.js",
  "./js/app.js",
  "./js/ground-ui.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

function abs(path) {
  return new URL(path, self.location).href;
}

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES.map(abs))).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response && response.ok && new URL(request.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => caches.match(abs("./index.html")));
    })
  );
});
