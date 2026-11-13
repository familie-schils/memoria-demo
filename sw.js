// Service worker van de demo-app: bewaart de app zelf, zodat ze zonder internet opent (BR-095).
// Foto's, muziek en de video staan apart in de opslag van de browser (zie src/lib/mediaDb.ts).
const CACHE = "memoria-demo-app";

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const lijst = await (await fetch("precache.json", { cache: "no-store" })).json();
        // Eén voor één: een ontbrekend bestand mag de rest niet tegenhouden.
        await Promise.all(lijst.bestanden.map((b) => cache.add(new Request(b || "./", { cache: "reload" })).catch(() => {})));
      } catch {
        /* geen lijst (bijvoorbeeld tijdens ontwikkelen): bestanden worden bewaard bij gebruik */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.includes("/api/")) return;
  // Eerst het netwerk, zodat een nieuwe versie aankomt; zonder netwerk de bewaarde kopie.
  e.respondWith(
    fetch(e.request)
      .then((antwoord) => {
        if (antwoord.ok && antwoord.status === 200) {
          const kopie = antwoord.clone();
          caches.open(CACHE).then((c) => c.put(e.request, kopie));
        }
        return antwoord;
      })
      .catch(async () => (await caches.match(e.request, { ignoreSearch: true })) ?? (await caches.match("./")) ?? Response.error()),
  );
});
