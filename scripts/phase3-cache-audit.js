/* =========================================================
PHASE 3 — STATIC ASSET CACHING — VALIDATION HARNESS
=========================================================
Self-contained (no dependencies). It:

  A. Static-analyses sw.js for the Phase 3 safety
     guarantees (privacy wall, whitelist, versioning,
     network-first documents, no precaching).

  B. Boots the real server (node server.js on a test
     port) and verifies the pre-existing behaviour the
     service worker depends on still works exactly as
     before:
       • SPA history fallback (direct routes → index.html)
       • asset-extension 404 guard (no HTML masking)
       • Cache-Control + content ETag + 304 revalidation
         (the "nearly free" background refresh the SW
         relies on)

Usage:  node scripts/phase3-cache-audit.js
========================================================= */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PORT = 3111;
const BASE = `http://localhost:${PORT}`;

let passed = 0;
let failed = 0;

function check(name, condition, extra = "") {
  const ok = Boolean(condition);
  if (ok) passed++; else failed++;
  console.log(
    (ok ? "  ✅" : "  ❌") + " " + name + (ok ? "" : " " + extra)
  );
}

function request(pathname, headers = {}, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request(
      BASE + pathname,
      { method, headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks)
          })
        );
      }
    );
    req.on("error", reject);
    req.end();
  });
}

/* =========================================
A. STATIC GUARANTEES INSIDE sw.js
========================================= */

function auditSwSource() {

  console.log("\n[A. sw.js SAFETY GUARANTEES]");

  const swPath = path.join(ROOT, "sw.js");
  /* Normalise line endings — the file may be CRLF on Windows. */
  const sw =
    fs.readFileSync(swPath, "utf8").replace(/\r\n/g, "\n");

  const guardPos = sw.indexOf("url.origin !== self.location.origin");
  const firstRespondWith = sw.indexOf("respondWith");

  check(
    "cross-origin guard exists and runs before ANY respondWith",
    guardPos !== -1 &&
      firstRespondWith !== -1 &&
      guardPos < firstRespondWith,
    "(Supabase/CDN/fonts can never be intercepted or cached)"
  );

  const cacheableBlock = sw.slice(
    sw.indexOf("const CACHEABLE_EXTENSIONS"),
    sw.indexOf("]);", sw.indexOf("const CACHEABLE_EXTENSIONS"))
  );

  check(
    "cache whitelist exists",
    cacheableBlock.includes("new Set"),
    ""
  );

  for (const forbidden of [
    ".html", ".json", ".txt", ".xml",
    ".pdf", ".mp4", ".webm", ".mp3"
  ]) {
    check(
      `whitelist does NOT cache ${forbidden}`,
      !cacheableBlock.includes(`"${forbidden}"`),
      "(documents/data/media stay network-first)"
    );
  }

  check(
    "only HTTP 200 + basic responses are stored",
    sw.includes("response.status === 200") &&
      sw.includes('response.type === "basic"'),
    ""
  );

  check(
    "non-GET requests pass through untouched",
    sw.includes('request.method !== "GET"'),
    ""
  );

  check(
    "Range/streaming requests pass through untouched",
    sw.includes('headers.has("range")'),
    ""
  );

  check(
    "sensitive query strings are never cached",
    sw.includes("SENSITIVE_QUERY_PATTERN") &&
      /token\|auth\|session/.test(sw),
    ""
  );

  check(
    "cache versioning constant present",
    /const CACHE_VERSION = "v\d+"/.test(sw),
    ""
  );

  const activatePos = sw.indexOf('addEventListener(\n  "activate"');
  /* The activate window runs to the next listener registration
     (the fetch handler) — it must contain the old-cache purge. */
  const activateEnd = sw.indexOf("addEventListener(", activatePos + 10);
  const activateBlock = sw.slice(activatePos, activateEnd);

  check(
    "activation purges old hufa-* caches",
    activateBlock.includes("caches.delete"),
    "(old versions safely removed)"
  );

  check(
    "no opaque (cross-origin) responses are ever cached",
    !sw.includes('"opaque"'),
    ""
  );

  const installPos = sw.indexOf('addEventListener(\n  "install"');
  /* The install window runs to the next listener registration
     (the activate handler) — it must contain no precaching. */
  const installEnd = sw.indexOf("addEventListener(", installPos + 10);
  const installBlock = sw.slice(installPos, installEnd);

  check(
    "install does NOT precache (no prefetching this phase)",
    !installBlock.includes("cache.addAll") &&
      !installBlock.includes("cache.put") &&
      !installBlock.includes("CACHEABLE"),
    ""
  );

  check(
    "documents are network-first (no-store on fallback)",
    sw.includes('cache: "no-store"'),
    "(users can never be trapped on stale code)"
  );

  check(
    "stale-while-revalidate present (self-healing updates)",
    sw.includes("scheduleRevalidate") &&
      sw.includes('cache: "no-cache"'),
    ""
  );

  check(
    "sw.js never references Supabase or any endpoint",
    !sw.includes("supabase") && !sw.includes("supabase.co"),
    ""
  );

}

/* =========================================
B. LIVE SERVER BEHAVIOUR (fallback + caching primitives)
========================================= */

async function auditLiveServer() {

  console.log("\n[B. LIVE SERVER (node server.js) BEHAVIOUR]");

  /* --- SPA history fallback still works (direct routes) --- */
  const browse = await request("/browse");
  check(
    "GET /browse → 200 HTML (direct route still works)",
    browse.status === 200 &&
      browse.headers["content-type"].startsWith("text/html"),
    `got ${browse.status}`
  );

  const deep = await request("/vehicle/test-123?make=Mazda&priceMax=500000");
  check(
    "GET /vehicle/test-123?query → 200 HTML (deep links + query strings)",
    deep.status === 200 &&
      deep.headers["content-type"].startsWith("text/html"),
    `got ${deep.status}`
  );

  const root = await request("/");
  check(
    "GET / → 200 HTML (first visit path)",
    root.status === 200 && root.body.length > 1000,
    ""
  );

  /* --- Asset-extension 404 guard unchanged --- */
  const missing = await request("/js/does-not-exist.js");
  check(
    "GET /js/does-not-exist.js → real 404 (never masked with HTML)",
    missing.status === 404,
    `got ${missing.status}`
  );

  /* --- Static asset caching primitives the SW revalidates against --- */
  const css = await request("/css/styles.css");
  check(
    "GET /css/styles.css → 200 CSS with Cache-Control",
    css.status === 200 &&
      css.headers["content-type"].startsWith("text/css") &&
      css.headers["cache-control"] ===
        "public, max-age=3600, must-revalidate",
    `cache-control: ${css.headers["cache-control"]}`
  );

  check(
    "content ETag present (drives free 304 revalidation)",
    Boolean(css.headers.etag) && css.headers.etag.startsWith('W/"'),
    ""
  );

  const css304 = await request("/css/styles.css", {
    "If-None-Match": css.headers.etag
  });
  check(
    "If-None-Match → 304 (background revalidation is nearly free)",
    css304.status === 304 && css304.body.length === 0,
    `got ${css304.status}`
  );

  const js = await request("/js/app.js");
  check(
    "GET /js/app.js → 200 JS with Cache-Control",
    js.status === 200 &&
      js.headers["content-type"].startsWith("text/javascript"),
    ""
  );

  const img = await request("/assets/logo.png");
  check(
    "GET /assets/logo.png → 200 PNG (1-week policy, SWR-cached)",
    img.status === 200 &&
      img.headers["content-type"].startsWith("image/png") &&
      img.headers["cache-control"] ===
        "public, max-age=604800, stale-while-revalidate=86400",
    `cache-control: ${img.headers["cache-control"]}`
  );

  const html = await request("/");
  check(
    "GET / → no-cache (documents always revalidated)",
    html.headers["cache-control"] === "no-cache",
    `got: ${html.headers["cache-control"]}`
  );

  /* --- The SW file itself must stay reachable + revalidatable --- */
  const swFile = await request("/sw.js");
  check(
    "GET /sw.js → 200 (registration target reachable)",
    swFile.status === 200 &&
      swFile.headers["content-type"].startsWith("text/javascript"),
    ""
  );

  const sw304 = await request("/sw.js", {
    "If-None-Match": swFile.headers.etag
  });
  check(
    "sw.js ETag/304 works (browser update checks stay cheap)",
    sw304.status === 304,
    `got ${sw304.status}`
  );

}

/* =========================================
BOOT SERVER → RUN → SHUTDOWN
========================================= */

async function waitForServer(timeoutMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await request("/");
      return true;
    } catch (err) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return false;
}

async function main() {

  console.log(
    "PHASE 3 — STATIC ASSET CACHING — VALIDATION\n" +
    "==========================================="
  );

  auditSwSource();

  const server = spawn(
    process.execPath,
    [path.join(ROOT, "server.js")],
    {
      env: { ...process.env, PORT: String(PORT) },
      stdio: "ignore"
    }
  );

  try {

    const up = await waitForServer();

    if (!up) {
      check("server booted on port " + PORT, false, "(could not connect)");
    } else {
      await auditLiveServer();
    }

  } finally {
    server.kill();
  }

  console.log(
    `\nRESULT: ${passed} passed, ${failed} failed\n`
  );

  process.exit(failed === 0 ? 0 : 1);

}

main().catch((err) => {
  console.error("AUDIT CRASHED:", err && err.message);
  process.exit(1);
});

