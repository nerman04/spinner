self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open("wheel-app").then((cache) => {
      return cache.addAll([
        "./",
        "./index.html",
        "./wheel.js",
        "./manifest.json",
        "./icon.svg",
      ]);
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
