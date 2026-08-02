// Tudo que o app precisa está aqui dentro. Depois da primeira visita não há
// mais nenhuma chamada de rede: as fontes deixaram de vir do Google e passaram
// a ser servidas do próprio pacote.
//
// Bump em CACHE a cada publicação — é o que força o aparelho a pegar a versão nova.
const CACHE = "sessao-v16";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./fontes/archivo.woff2",
  "./fontes/archivo-ext.woff2",
  "./fontes/jetbrains-mono.woff2",
  "./fontes/jetbrains-mono-ext.woff2"
];

// addAll é atômico: um único 404 abortava a instalação inteira e o app ficava
// sem offline nenhum, silenciosamente. Foi exatamente o que aconteceu com os
// ícones que não existiam. Agora cada asset é tentado por si, e o que falta
// aparece no console em vez de derrubar tudo.
self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const faltando = [];
    await Promise.all(ASSETS.map(a =>
      c.add(new Request(a, { cache: "reload" })).catch(() => faltando.push(a))
    ));
    if (faltando.length) console.warn("[sw] nao entraram no cache:", faltando);
    // O index é o mínimo indispensável: sem ele não há app offline.
    if (!(await c.match("./index.html"))) throw new Error("[sw] index.html nao cacheou");
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const ks = await caches.keys();
    await Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return;   // nada de fora, e nada a interceptar

  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      return await fetch(req);
    } catch (err) {
      // Só navegação cai no index. Antes, qualquer coisa que falhasse recebia
      // o HTML de volta — uma fonte que falhasse virava um woff2 cheio de HTML.
      if (req.mode === "navigate") {
        const idx = await caches.match("./index.html");
        if (idx) return idx;
      }
      return new Response("", { status: 504, statusText: "offline" });
    }
  })());
});
