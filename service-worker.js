// ������ �ٲ�� install �̺�Ʈ�� ������
const CACHE_NAME = "wheel-app-v2.2";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
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
