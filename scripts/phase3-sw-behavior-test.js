/* =========================================================
PHASE 3 — SERVICE WORKER RUNTIME BEHAVIOUR TEST
=========================================================
Loads the REAL sw.js into this process with a mock
CacheStorage + instrumented fetch, then exercises it against
the REAL server (node server.js on a test port):

  1. Versioning      — activate purges old hufa-* caches only
  2. First visit     — network fetch, cache filled
  3. Repeat visit    — served instantly from cache (no refetch)
  4. Self-healing    — background revalidation fires when the
                       entry ages past the freshness window
  5. Update flow     — fresh bytes from the network replace
                       the cached copy and the next request
                       serves the UPDATED asset
  6. Privacy walls   — Supabase / CDN requests, non-GET,
                       Range and sensitive-query requests are
                       never intercepted or cached
  7. Documents       — index.html never cached as an asset;
                       404-asset responses never cached
  8. Navigation      — SPA fallback intact; offline boot from
                       the network-failure shell

Usage:  node scripts/phase3-sw-behavior-test.js
========================================================= */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PORT = 3177;
const BASE = `http://127.0.0.1:${PORT}`;

let passed = 0;
let failed = 0;

function check(name, condition, extra = "") {
  const ok = Boolean(condition);
  if (ok) passed++; else failed++;
  console.log((ok ? "  [PASS] " : "  [FAIL] ") + name + (ok ? "" : " " + extra));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/* =========================================
MOCK CACHE STORAGE (spec-shaped)
match() returns a fresh clone, like browsers do.
========================================= */

class MockCache {
  constructor(name) {
    this.name = name;
    this.map = new Map();
  }
  keyOf(req) {
    return typeof req === "string" ? req : req.url;
  }
  async match(req) {
    const stored = this.map.get(this.keyOf(req));
    if (!stored) return undefined;
    return stored.clone();
  }
  async put(req, res) {
    this.map.set(this.keyOf(req), res);
  }
  async delete(req) {
    return this.map.delete(this.keyOf(req));
  }
  async keys() {
    return [...this.map.keys()].map((u) => new Request(u));
  }
}

const cacheStore = new Map();

const mockCaches = {
  open: async (name) => {
    if (!cacheStore.has(name)) cacheStore.set(name, new MockCache(name));
    return cacheStore.get(name);
  },
  keys: async () => [...cacheStore.keys()],
  delete: async (name) => cacheStore.delete(name)
};

/* =========================================
INSTRUMENTED fetch (spies on every SW network call)
========================================= */

const realFetch = globalThis.fetch;
const fetchLog = [];
let injectFreshNext = false;

/* Node's undici responses may report type "default"; the
   browser reports "basic" for same-origin. Tag accordingly
   so the SW sees exactly what it would see in a browser. */
function tagBasic(res) {
  return new Proxy(res, {
    get(target, prop) {
      if (prop === "type") return "basic";
      const value = Reflect.get(target, prop);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
}

async function spyFetch(input, init) {
  const url =
    typeof input === "string" ? input : (input && input.url) || String(input);

  fetchLog.push(url);

  if (injectFreshNext && url.includes("/css/styles.css")) {
    injectFreshNext = false;
    const fresh = await realFetch(input, init);
    const body = await fresh.text();
    return tagBasic(
      new Response("/*FRESH-CSS*/" + body, {
        status: 200,
        headers: {
          "content-type": "text/css",
          etag: fresh.headers.get("etag") || 'W/"fresh"'
        }
      })
    );
  }

  try {
    const res = await realFetch(input, init);
    if (!res.type || res.type === "default") return tagBasic(res);
    return res;
  } catch (err) {
    /* Older runtimes may reject the cache option itself —
       retry once without it (network errors still throw). */
    if (init && init.cache) {
      const retryInit = { ...init };
      delete retryInit.cache;
      const res = await realFetch(input, retryInit);
      if (!res.type || res.type === "default") return tagBasic(res);
      return res;
    }
    throw err;
  }
}

/* =========================================
LOAD THE REAL sw.js
========================================= */

const listeners = {};

globalThis.self = {
  location: { origin: BASE },
  skipWaiting: async () => {},
  clients: { claim: async () => {} },
  addEventListener: (type, fn) => {
    listeners[type] = fn;
  }
};

globalThis.caches = mockCaches;
globalThis.fetch = spyFetch;

const swSource = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");

(0, eval)(swSource);

const fetchHandler = listeners.fetch;
const installHandler = listeners.install;
const activateHandler = listeners.activate;

const cacheVersion =
  (swSource.match(/const CACHE_VERSION = "([^"]+)"/) || [])[1] || "v1";
const STATIC_CACHE_NAME = `hufa-static-${cacheVersion}`;
const SHELL_CACHE_NAME = `hufa-shell-${cacheVersion}`;

function dispatch(request) {
  const event = {
    request,
    responded: false,
    _p: null,
    respondWith(promise) {
      this.responded = true;
      this._p = promise;
    }
  };
  fetchHandler(event);
  return event;
}

async function makeNavigate(url) {
  try {
    return new Request(url, { method: "GET", mode: "navigate" });
  } catch (err) {
    const plain = new Request(url, { method: "GET" });
    return new Proxy(plain, {
      get(target, prop) {
        if (prop === "mode") return "navigate";
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      }
    });
  }
}

function countCalls(urlPart) {
  return fetchLog.filter((u) => u.includes(urlPart)).length;
}

async function waitUp(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await realFetch(BASE + "/");
      if (res.ok) return true;
    } catch (err) {
      /* not up yet */
    }
    await sleep(250);
  }
  return false;
}

/* =========================================
SCENARIOS
========================================= */

async function testVersioning() {

  console.log("\n[1. VERSIONING — old caches purged on activate]");

  installHandler({ waitUntil: (p) => p });

  cacheStore.set("hufa-static-v0", new MockCache("hufa-static-v0"));
  cacheStore.set("unrelated-app-cache", new MockCache("unrelated-app-cache"));

  let activation = null;
  activateHandler({ waitUntil: (p) => { activation = p; } });
  await activation;

  check(
    "previous hufa-* cache version is deleted",
    !cacheStore.has("hufa-static-v0")
  );
  check(
    "caches from other apps are untouched",
    cacheStore.has("unrelated-app-cache")
  );

}

async function testFirstAndRepeatVisit(staticCache) {

  console.log("\n[2+3. FIRST VISIT vs REPEAT VISIT]");

  const cssUrl = BASE + "/css/styles.css";

  const ev1 = dispatch(new Request(cssUrl, { method: "GET" }));
  check("first visit is intercepted by the SW", ev1.responded);

  const res1 = await ev1._p;
  const type1 = (res1.headers.get("content-type") || "");
  check(
    "first visit → real network CSS (status 200)",
    res1.status === 200 && type1.includes("text/css"),
    `status ${res1.status} type ${type1}`
  );
  check(
    "first visit fills the static cache",
    Boolean(staticCache.map.get(cssUrl))
  );

  const callsBefore = countCalls("/css/styles.css");

  const ev2 = dispatch(new Request(cssUrl, { method: "GET" }));
  const res2 = await ev2._p;
  check(
    "repeat visit is served from cache (status 200)",
    ev2.responded && res2.status === 200
  );

  const callsAfter = countCalls("/css/styles.css");
  check(
    "repeat visit made NO extra network call (fresh window)",
    callsAfter === callsBefore,
    `calls before=${callsBefore} after=${callsAfter}`
  );

  return cssUrl;

}

async function testRevalidationAndUpdates(staticCache, cssUrl) {

  console.log("\n[4+5. SELF-HEALING REVALIDATION + UPDATE FLOW]");

  const realNow = Date.now;
  Date.now = () => realNow() + 6000; /* age the entry past the window */

  const callsBefore = countCalls("/css/styles.css");
  const ev3 = dispatch(new Request(cssUrl, { method: "GET" }));
  const res3 = await ev3._p;
  check(
    "aged entry still served INSTANTLY from cache",
    res3.status === 200
  );
  Date.now = realNow;

  await sleep(150);
  const callsAfter = countCalls("/css/styles.css");
  check(
    "background revalidation hit the network",
    callsAfter > callsBefore,
    `calls before=${callsBefore} after=${callsAfter}`
  );

  /* Deploy a "new version" of the stylesheet: the next
     network response carries different bytes. */
  injectFreshNext = true;
  Date.now = () => realNow() + 6000;
  dispatch(new Request(cssUrl, { method: "GET" }));

  /* The SW's freshness check runs after its internal awaits,
     so the clock must stay advanced until the revalidation
     has actually been scheduled. */
  await sleep(60);
  Date.now = realNow;

  await sleep(250);

  const entry = await staticCache.match(cssUrl);
  const entryText = await entry.text();
  check(
    "fresh bytes replaced the cached copy",
    entryText.includes("/*FRESH-CSS*/")
  );

  const ev5 = dispatch(new Request(cssUrl, { method: "GET" }));
  const res5 = await ev5._p;
  const res5Text = await res5.text();
  check(
    "next request serves the UPDATED asset",
    res5Text.includes("/*FRESH-CSS*/")
  );

}

async function testPrivacyWalls() {

  console.log("\n[6. PRIVACY WALLS — never intercepted, never cached]");

  const supabaseCalls = countCalls("supabase.co");

  const supa = dispatch(
    new Request(
      "https://wkmsibpenpllkkjlidgu.supabase.co/rest/v1/vehicles?select=*",
      { method: "GET" }
    )
  );
  check("Supabase REST request NOT intercepted", !supa.responded);

  const cdn = dispatch(
    new Request("https://cdn.jsdelivr.net/npm/@supabase/supabase-js")
  );
  check("CDN library request NOT intercepted", !cdn.responded);

  const post = dispatch(
    new Request(BASE + "/js/app.js", { method: "POST" })
  );
  check("non-GET request NOT intercepted", !post.responded);

  const ranged = dispatch(
    new Request(BASE + "/css/styles.css", {
      method: "GET",
      headers: { Range: "bytes=0-10" }
    })
  );
  check("Range/streaming request NOT intercepted", !ranged.responded);

  const sensitive = dispatch(
    new Request(BASE + "/css/styles.css?token=SECRET-VALUE", { method: "GET" })
  );
  check("sensitive query string NOT intercepted", !sensitive.responded);

  check(
    "SW made ZERO network calls to Supabase/CDN hosts",
    countCalls("supabase.co") === supabaseCalls &&
      countCalls("jsdelivr") === 0
  );

}

async function testDocuments(staticCache) {

  console.log("\n[7. DOCUMENTS — HTML/404s are never asset-cached]");

  const evMiss = dispatch(
    new Request(BASE + "/js/does-not-exist.js", { method: "GET" })
  );
  const resMiss = await evMiss._p;
  check(
    "missing asset → real 404 passed through (no HTML masking)",
    evMiss.responded && resMiss.status === 404,
    `status ${resMiss && resMiss.status}`
  );
  check(
    "404 asset response NOT cached",
    !staticCache.map.has(BASE + "/js/does-not-exist.js")
  );

}

async function testNavigation(staticCache, server) {

  console.log("\n[8. NAVIGATION — fallback, shell, offline boot]");

  const evBrowse = dispatch(await makeNavigate(BASE + "/browse"));
  check("direct-route navigation intercepted", evBrowse.responded);
  const resBrowse = await evBrowse._p;
  const browseText = await resBrowse.text();
  check(
    "GET /browse → 200 index.html (SPA fallback intact)",
    resBrowse.status === 200 && browseText.startsWith("<!DOCTYPE html>"),
    `status ${resBrowse.status}`
  );

  const evRoot = dispatch(await makeNavigate(BASE + "/"));
  const resRoot = await evRoot._p;
  check(
    "root navigation → 200",
    resRoot.status === 200
  );

  await sleep(150); /* shell copy is stored fire-and-forget */

  const shell = await cacheStore.get(SHELL_CACHE_NAME).match(BASE + "/");
  check(
    "offline shell copy stored (network-failure fallback only)",
    Boolean(shell)
  );

  check(
    "HTML document is NOT inside the static asset cache",
    !staticCache.map.has(BASE + "/") &&
      !staticCache.map.has(BASE + "/index.html")
  );

  /* --- OFFLINE BOOT: kill the server, then navigate --- */
  server.kill();
  await sleep(500); /* let the port close */

  const evOff = dispatch(await makeNavigate(BASE + "/dashboard"));
  const resOff = await evOff._p;
  const offText = await resOff.text();
  check(
    "network-failure navigation boots from cached shell",
    resOff.status === 200 && offText.startsWith("<!DOCTYPE html>"),
    `status ${resOff.status}`
  );

}

/* =========================================
RUN
========================================= */

async function main() {

  console.log(
    "PHASE 3 — SW RUNTIME BEHAVIOUR TEST\n" +
    "==================================="
  );

  if (!fetchHandler || !activateHandler) {
    check("sw.js loaded and registered its listeners", false, "");
    process.exit(1);
  }
  check("sw.js loaded and registered its listeners", true);

  const staticCache = await mockCaches.open(STATIC_CACHE_NAME);

  const server = spawn(
    process.execPath,
    [path.join(ROOT, "server.js")],
    {
      env: { ...process.env, PORT: String(PORT) },
      stdio: "ignore"
    }
  );

  try {

    const up = await waitUp();
    if (!up) {
      check("server booted on port " + PORT, false, "(could not connect)");
      return finish();
    }

    await testVersioning();
    const cssUrl = await testFirstAndRepeatVisit(staticCache);
    await testRevalidationAndUpdates(staticCache, cssUrl);
    await testPrivacyWalls();
    await testDocuments(staticCache);
    await testNavigation(staticCache, server);

  } catch (err) {
    check("test run completed without crashing", false, String(err && err.message));
  } finally {
    server.kill();
  }

  return finish();

  function finish() {
    console.log(`\nRESULT: ${passed} passed, ${failed} failed\n`);
    process.exit(failed === 0 ? 0 : 1);
  }

}

main();



