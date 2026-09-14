/* =========================================================
HELPUFIN AUTO — SERVICE WORKER
SPA NAVIGATION FALLBACK + PHASE 3 STATIC ASSET CACHING
=========================================================
This service worker has two strictly separated jobs:

1. SPA NAVIGATION FALLBACK (pre-existing, unchanged)
   Plain static hosts have no History API fallback, so a
   top-level navigation to a clean route ("/browse",
   "/vehicle/ANY-ID") can 404. Navigations always go to the
   NETWORK first; only when the server answers 404 is
   index.html served instead. URLs, query strings and
   /vehicle/:id stay exactly as requested — never rewritten.

2. PHASE 3 — STATIC ASSET CACHING (new)
   Repeat visits are made substantially faster by serving
   safe, same-origin STATIC assets from a versioned
   Cache Storage copy:

     • CSS, JS modules, fonts, images, favicons.

   What is NEVER cached (by design, not by filtering luck):
     • ANY cross-origin request — Supabase auth / REST /
       storage / realtime, CDN libraries, Google Fonts and
       Material Symbols all pass through untouched, so
       authentication responses, private dashboard data,
       messages, private profiles, account information and
       any other user-specific response can never enter
       this cache.
     • HTML documents — index.html is always fetched from
       the network (users can never be trapped on stale
       application code).
     • Non-GET requests, Range (streaming) requests, and
       any URL whose query string contains sensitive
       parameters (token/auth/session/key/password/...).
     • Non-200 responses — only successful "basic"
       same-origin responses are stored.

   UPDATE BEHAVIOUR (stale-while-revalidate):
     A cached asset is served INSTANTLY, then revalidated
     against the network in the background (the server's
     content-derived ETags make revalidation nearly free —
     304 Not Modified). The next page load therefore always
     picks up fresh code: no user can be permanently served
     old JavaScript, and the app stays fully usable while
     the update happens.

   VERSIONING:
     Bump CACHE_VERSION below (v1 → v2, ...) whenever a
     deploy must reach every client immediately. On
     activation every previous hufa-* cache is deleted, so
     old copies are safely removed and new assets are
     fetched fresh. Even WITHOUT a bump, the background
     revalidation self-heals stale entries within one load.

   NO PREFETCHING:
     Nothing is downloaded on install — the cache fills
     only with assets the user's browser actually requests.
     (Background page prefetching is explicitly out of
     scope for this phase.)

Removal:
   Delete this file and the registration script in
   index.html, then unregister via DevTools → Application →
   Service Workers. Nothing else depends on it.
========================================================= */

const CACHE_VERSION = "v1";

const STATIC_CACHE = `hufa-static-${CACHE_VERSION}`;
const SHELL_CACHE  = `hufa-shell-${CACHE_VERSION}`;

/* Only these two cache names may exist after activation.
   Anything else matching the hufa- prefix is a leftover
   from an older version and is deleted on activate. */
const CURRENT_CACHES = new Set([
  STATIC_CACHE,
  SHELL_CACHE
]);

const INDEX_URL =
new URL(
  "/",
  self.location.origin
).href;

/* Served-from-cache entries younger than this are trusted
   without a background revalidation (dedupes rapid reloads
   only — 5s is effectively "always revalidate", keeping
   users at most one reload behind the deployed code). */
const FRESH_WINDOW_MS = 5000;

/* Safety cap so the cache can never grow unbounded. */
const MAX_STATIC_ENTRIES = 250;
const TRIM_THROTTLE_MS = 60000;

/* Static-asset extensions that must NEVER be masked with
   index.html — a missing .js/.css/.png is a real error and
   feeding HTML into <script>/<link> tags would break pages.
   (Pre-existing navigation-fallback guard — unchanged.) */
const ASSET_EXTENSIONS = new Set([

  ".html", ".js", ".mjs", ".css", ".json",
  ".png", ".jpg", ".jpeg", ".gif", ".svg",
  ".ico", ".webp", ".avif",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".txt", ".xml", ".pdf", ".docx",
  ".mp4", ".webm", ".mp3", ".wav"

]);

/* PHASE 3 — the ONLY extensions eligible for the static
   cache. Deliberately EXCLUDES: .html (documents are always
   network-first), .json/.txt/.xml (could be dynamic data or
   crawler files), .pdf/.docx (user content), and media
   containers (.mp4/.webm/.mp3/.wav — Range-sensitive). */
const CACHEABLE_EXTENSIONS = new Set([

  ".css", ".js", ".mjs",
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  ".png", ".jpg", ".jpeg", ".gif", ".svg",
  ".webp", ".avif", ".ico"

]);

/* Belt-and-braces guard: a same-origin URL whose QUERY
   STRING carries anything authentication-shaped must never
   be cached, even if it ends in a static extension.
   (Static asset URLs in this app carry no query strings,
   so this costs nothing today and protects tomorrow.) */
const SENSITIVE_QUERY_PATTERN =
/(token|auth|session|api[-_]?key|password|secret|credential)/i;

/* =========================================
INSTALL — activate immediately, cache NOTHING
========================================= */

self.addEventListener(
  "install",
  () => {

    /* Take over as soon as the new worker is ready.
       Deliberately NO precaching here — no asset lists,
       no background prefetching (out of scope this phase)
       and nothing that can delay or fail the install. */
    self.skipWaiting();

  }
);

/* =========================================
ACTIVATE — purge every old cache version,
then take control of open pages
========================================= */

self.addEventListener(
  "activate",
  (event) => {

    event.waitUntil(

      (async () => {

        const cacheNames =
        await caches.keys();

        await Promise.all(

          cacheNames

            .filter((name) =>
              name.startsWith("hufa-") &&
              !CURRENT_CACHES.has(name)
            )

            .map((name) =>
              caches.delete(name)
            )

        );

        await self.clients.claim();

      })()

    );

  }
);

/* =========================================
FETCH — one router, two isolated paths
========================================= */

self.addEventListener(
  "fetch",
  (event) => {

    const request =
    event.request;

    /* Only GET requests are ever touched.
       POST/PUT/DELETE/PATCH (auth, messages, uploads…)
       always pass straight through. */
    if(request.method !== "GET"){
      return;
    }

    let url;

    try{

      url =
      new URL(request.url);

    }catch(err){
      return;
    }

    /* =========================================
       CROSS-ORIGIN GUARD — the hard privacy wall
       =========================================
       Supabase (auth/REST/storage/realtime), CDN
       libraries, Google Fonts and Material Symbols are
       all cross-origin. They are NEVER intercepted and
       NEVER cached — no private, user-specific or
       sensitive response can enter this service
       worker's storage. */
    if(url.origin !== self.location.origin){
      return;
    }

    /* Byte-range (streaming/seeking) requests must be
       answered by the network — a cached full response
       would corrupt media handling. */
    if(request.headers.has("range")){
      return;
    }

    /* Top-level document navigations (address bar,
       Ctrl+R, deep links, back/forward loads).
       Always network-first — see handleNavigation. */
    if(request.mode === "navigate"){
      event.respondWith(
        handleNavigation(request, url)
      );
      return;
    }

    /* Same-origin static assets → stale-while-revalidate */
    if(isCacheableAssetRequest(request, url)){
      event.respondWith(
        serveStaticAsset(request)
      );
    }

    /* Anything else (same-origin non-asset, XHR, beacons…)
       passes through untouched. */

  }
);

/* =========================================
NAVIGATION (pre-existing behaviour + offline shell)
======================================== */

async function handleNavigation(request, url){

  try{

    const response =
    await fetch(request);

    const isMissingRoute =

      response &&
      response.status === 404 &&
      !hasAssetExtension(url.pathname);

    if(isMissingRoute){
      return serveIndex();
    }

    /* Keep a fresh copy of index.html for the
       network-failure fallback only. Never served
       while the network is reachable. */
    if(isHtmlResponse(response)){
      storeShellCopy(response);
    }

    return response;

  }catch(err){
    return serveIndex();
  }

}

async function serveIndex(){

  try{

    /* Always fresh from the network — the document is
       never served from cache while the server is up,
       so users can never be trapped on stale code. */
    const response =
    await fetch(
      INDEX_URL,
      {
        cache: "no-store",
        credentials: "same-origin"
      }
    );

    if(!response.ok){
      throw new Error(
        "index.html unavailable"
      );
    }

    storeShellCopy(response);

    return response;

  }catch(err){

    /* Network unreachable → boot from the last known
       good shell (offline fallback ONLY). Cached static
       assets then let the app start without a server. */
    const shell =
    await caches.open(SHELL_CACHE)
      .then((cache) => cache.match(INDEX_URL))
      .catch(() => undefined);

    if(shell){
      return shell;
    }

    return new Response(

      "<h1>Helpufin Auto</h1>" +
      "<p>Could not load the application. " +
      "Please make sure the development server is running.</p>",

      {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        }
      }

    );

  }

}

function isHtmlResponse(response){

  return Boolean(
    response &&
    response.status === 200 &&
    response.type === "basic" &&
    (response.headers.get("content-type") || "")
      .toLowerCase()
      .includes("text/html")
  );

}

/* Fire-and-forget: clone the fresh document into the
   shell cache. Never blocks or affects the live response. */
function storeShellCopy(response){

  const copy =
  response.clone();

  caches
    .open(SHELL_CACHE)
    .then((cache) =>
      cache.put(INDEX_URL, copy)
    )
    .catch(() => {});

}

/* =========================================
STATIC ASSETS — stale-while-revalidate
======================================== */

function isCacheableAssetRequest(request, url){

  if(request.mode === "navigate"){
    return false;
  }

  if(!hasCacheableExtension(url.pathname)){
    return false;
  }

  if(
    url.search &&
    SENSITIVE_QUERY_PATTERN.test(url.search)
  ){
    return false;
  }

  return true;

}

async function serveStaticAsset(request){

  let cache = null;

  try{
    cache =
    await caches.open(STATIC_CACHE);
  }catch(err){
    cache = null;
  }

  let cached = null;

  if(cache){
    try{
      cached =
      await cache.match(request);
    }catch(err){
      cached = null;
    }
  }

  /* Repeat visit → instant cache hit, then a
     background revalidation keeps the next load
     fresh (never permanently old code). */
  if(cached){
    scheduleRevalidate(request, cached);
    return cached;
  }

  /* First visit → the network, exactly as if no
     service worker existed. */
  const response =
  await fetch(
    request,
    { cache: "no-cache" }
  );

  if(
    cache &&
    isCacheableAssetResponse(response)
  ){
    try{
      await storeAsset(
        cache,
        request,
        response.clone()
      );
    }catch(err){
      /* Cache write failures must never
         break the page. */
    }
  }

  return response;

}

async function revalidateAsset(request){

  /* cache:"no-cache" forces a conditional request —
     the server's content ETag answers 304 (nearly
     free) or 200 with fresh bytes. A 304 is
     transparently resolved by fetch(), so this always
     yields a full 200 response when the asset changed. */
  const response =
  await fetch(
    request,
    { cache: "no-cache" }
  );

  if(!isCacheableAssetResponse(response)){
    return;
  }

  const cache =
  await caches.open(STATIC_CACHE);

  await storeAsset(
    cache,
    request,
    response.clone()
  );

}

function scheduleRevalidate(request, cached){

  const cachedAt =
  Number(
    cached.headers.get("x-hufa-cached-at") || 0
  );

  if(Date.now() - cachedAt < FRESH_WINDOW_MS){
    return;
  }

  /* Fire-and-forget — failures (offline, server down)
     leave the cached copy untouched. */
  revalidateAsset(request).catch(() => {});

}

function isCacheableAssetResponse(response){

  return Boolean(
    response &&
    response.status === 200 &&
    response.type === "basic"
  );

}

async function storeAsset(
  cache,
  request,
  source
){

  const body =
  await source.arrayBuffer();

  /* Strip wire-encoding headers that no longer apply to
     the decompressed copy, then stamp it with the time
     it entered the cache (drives revalidation). */
  const headers =
  new Headers(source.headers);

  headers.delete("vary");
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.set(
    "x-hufa-cached-at",
    String(Date.now())
  );

  await cache.put(
    request,
    new Response(
      body,
      {
        status: source.status,
        statusText: source.statusText,
        headers
      }
    )
  );

  scheduleTrim();

}

/* =========================================
CACHE HYGIENE — bounded, versioned storage
======================================== */

let lastTrim = 0;

function scheduleTrim(){

  const now =
  Date.now();

  if(now - lastTrim < TRIM_THROTTLE_MS){
    return;
  }

  lastTrim = now;

  trimCache(
    STATIC_CACHE,
    MAX_STATIC_ENTRIES
  ).catch(() => {});

}

async function trimCache(
  cacheName,
  maxEntries
){

  const cache =
  await caches.open(cacheName);

  const keys =
  await cache.keys();

  if(keys.length <= maxEntries){
    return;
  }

  const stamped = [];

  for(const req of keys){

    const res =
    await cache.match(req);

    stamped.push(
      {
        req,
        at: res
          ? Number(res.headers.get("x-hufa-cached-at") || 0)
          : 0
      }
    );

  }

  stamped.sort(
    (a, b) => a.at - b.at
  );

  const oldest =
  stamped.slice(
    0,
    stamped.length - maxEntries
  );

  await Promise.all(
    oldest.map((entry) =>
      cache.delete(entry.req)
    )
  );

}

/* =========================================
EXTENSION HELPERS
======================================== */

function extensionOf(pathname){

  const lastSegment =
  pathname.split("/").pop() || "";

  const dotIndex =
  lastSegment.lastIndexOf(".");

  if(dotIndex === -1){
    return "";
  }

  return lastSegment.slice(dotIndex).toLowerCase();

}

function hasAssetExtension(pathname){

  const ext =
  extensionOf(pathname);

  return ext !== "" &&
         ASSET_EXTENSIONS.has(ext);

}

function hasCacheableExtension(pathname){

  const ext =
  extensionOf(pathname);

  return ext !== "" &&
         CACHEABLE_EXTENSIONS.has(ext);

}



