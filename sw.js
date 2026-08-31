const CACHE_NAME = "j-lab-v4";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json"
];

self.addEventListener("install", (event) => {
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(FILES_TO_CACHE))
    );
});


self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});


self.addEventListener("fetch", (event) => {

    // Don't cache API requests
    if (event.request.url.includes("trycloudflare.com")) {
        return;
    }

    // Network first — get the newest version
    event.respondWith(
        fetch(event.request)
            .then((response) => {

                return response;

            })
            .catch(() => {

                return caches.match(event.request);

            })
    );
});