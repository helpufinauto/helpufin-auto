/* =========================================================
PHASE 5 — GITHUB PAGES FIRST-VISIT DEEP-LINK FALLBACK TESTS
=========================================================
Zero-dependency (plain node) validation of the Phase 5
GitHub Pages 404 fallback.

  Part A — STATIC: file presence, single router, single
           base-path abstraction, Phase 4 boot intact,
           service-worker registration intact, extension-set
           parity with sw.js, no logging of URLs/tokens.
  Part B — HTTP: a local server that REPLAYS GitHub Pages
           semantics (any missing path under /helpufin-auto/
           is answered with 404.html at status 404, at the
           requested URL, without a redirect).
  Part C — BEHAVIOURAL: the REAL inline scripts are extracted
           from 404.html and index.html and executed against
           stubbed location/sessionStorage/history/console,
           proving URL + query-string + hash preservation,
           the localhost gate, the asset guard, the TTL /
           cross-origin / directory guards, and that
           recovery-hash tokens are never logged.

Run:  node scripts/phase5-ghpages-404-test.js
========================================================= */

const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.join(__dirname, "..");

const KEY = "hufa:ghp-redirect";
const MARKER_404 = "PHASE 5 — GITHUB PAGES FIRST-VISIT DEEP-LINK FALLBACK";
const MARKER_RESTORE = "PHASE 5 — GITHUB PAGES FIRST-VISIT RESTORE";

let pass = 0;
let fail = 0;

function check(name, cond, detail){
  if(cond){
    pass++;
    console.log("  \u2714 " + name);
  }else{
    fail++;
    console.log(
      "  \u2718 " + name +
      (detail ? "   [" + detail + "]" : "")
    );
  }
}

function section(title){
  console.log("\n" + title);
}

function read(file){
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function walkJs(dir, acc){
  acc = acc || [];
  for(const entry of fs.readdirSync(dir, { withFileTypes: true })){
    const p = path.join(dir, entry.name);
    if(entry.isDirectory()){
      walkJs(p, acc);
    }else if(entry.name.endsWith(".js")){
      acc.push(p);
    }
  }
  return acc;
}

/* Extract an inline (attribute-less) <script> block that
   contains a given marker — i.e. the REAL shipped code. */
function extractScript(text, marker){
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while((m = re.exec(text))){
    if(m[1].indexOf(marker) !== -1) return m[1];
  }
  return "";
}

function extSet(text){
  const m =
  text.match(/ASSET_EXTENSIONS\s*=\s*new\s+Set\(\[([\s\S]*?)\]\)/);
  if(!m) return null;
  return m[1].match(/"(\.[a-z0-9]+)"/g)
    .map(s => s.slice(1, -1))
    .sort();
}

/* =========================================
PART C — stub browser environment
========================================= */

function makeEnv(initialHref, sharedStore){

  const store = sharedStore || new Map();
  let href = initialHref;

  const calls = {
    replace: [],
    replaceState: [],
    logs: []
  };

  const fakeConsole = {
    log:   (...a) => calls.logs.push(["log"].concat(a)),
    info:  (...a) => calls.logs.push(["info"].concat(a)),
    warn:  (...a) => calls.logs.push(["warn"].concat(a)),
    error: (...a) => calls.logs.push(["error"].concat(a)),
    debug: (...a) => calls.logs.push(["debug"].concat(a))
  };

  return {
    store,
    calls,
    fakeConsole,
    get href(){ return href; },
    location: {
      get href(){ return href; },
      set href(v){ href = String(v); },
      get origin(){ return new URL(href).origin; },
      get hostname(){ return new URL(href).hostname; },
      get pathname(){ return new URL(href).pathname; },
      get search(){ return new URL(href).search; },
      get hash(){ return new URL(href).hash; },
      replace(u){
        calls.replace.push(String(u));
        href = new URL(String(u), href).href;
      }
    },
    sessionStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); }
    },
    history: {
      state: null,
      replaceState(state, title, url){
        calls.replaceState.push({ state, url });
        href = new URL(url, href).href;
      }
    }
  };

}

/* Execute one of the REAL extracted scripts inside the stub
   environment. location/sessionStorage/history/console are
   shadowed; Date/JSON/URL/Set resolve to node globals — the
   same objects a browser would provide. */
function runScript(body, env){
  const fn = new Function(
    "location",
    "sessionStorage",
    "history",
    "console",
    '"use strict";\n' + body
  );
  fn(env.location, env.sessionStorage, env.history, env.fakeConsole);
}

/* Full first-visit simulation:
   1. browser lands on the 404 document at the deep URL
   2. bootstrap saves + replaces to the app root
   3. index.html loads there and its restore script runs */
function simulateFirstVisit(deepUrl, script404, scriptRestore){
  const env404 = makeEnv(deepUrl);
  runScript(script404, env404);
  const savedRaw = env404.store.get(KEY);
  const envIndex = makeEnv(env404.href, env404.store);
  runScript(scriptRestore, envIndex);
  return { env404, envIndex, savedRaw };
}

/* =========================================
PART B — GitHub Pages simulation server
========================================= */

function startGhSim(){

  const indexHtml = read("index.html");
  const notFoundHtml = read("404.html");
  const seenUrls = [];

  const server = http.createServer((req, res) => {

    seenUrls.push(req.url);

    const u = new URL(req.url, "http://localhost");
    let p;
    try{
      p = decodeURIComponent(u.pathname);
    }catch(e){
      p = u.pathname;
    }

    /* Localhost semantics — server.js serves index directly
       for the root and for clean routes; 404.html is never
       involved. */
    if(p === "/" || p === "/index.html"){
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(indexHtml);
      return;
    }

    /* GitHub Pages project-site semantics */
    if(p.indexOf("/helpufin-auto/") === 0){

      if(p === "/helpufin-auto/"){
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(indexHtml);
        return;
      }

      const rel = p.slice("/helpufin-auto/".length);
      const filePath = path.join(ROOT, rel);
      const rootWithSep =
        ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;

      if(
        filePath.startsWith(rootWithSep) &&
        fs.existsSync(filePath) &&
        fs.statSync(filePath).isFile()
      ){
        res.writeHead(200, {
          "Content-Type":
            rel.endsWith(".js")
              ? "text/javascript; charset=utf-8"
              : "application/octet-stream"
        });
        res.end(fs.readFileSync(filePath));
        return;
      }

      /* GitHub Pages: ANY missing path under the project
         site is answered with the site's 404.html — status
         404 — AT THE REQUESTED URL (no redirect). */
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(notFoundHtml);
      return;

    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found");

  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, seenUrls });
    });
  });

}

function get(urlStr){
  return new Promise((resolve, reject) => {
    http.get(urlStr, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { body += c; });
      res.on("end", () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body
      }));
    }).on("error", reject);
  });
}

/* =========================================
RUN
========================================= */

async function main(){

  /* ---------------- PART A — STATIC ---------------- */

  section("[A. STATIC CHECKS]");

  const idxText = read("index.html");
  const swText = read("sw.js");
  const p404Exists = fs.existsSync(path.join(ROOT, "404.html"));
  const p404Text = p404Exists ? read("404.html") : "";

  check("404.html exists at repository root", p404Exists);
  check(
    "404.html contains the Phase 5 bootstrap",
    p404Text.indexOf(MARKER_404) !== -1
  );
  check(
    "index.html contains the Phase 5 restore script",
    idxText.indexOf(MARKER_RESTORE) !== -1
  );

  const script404 = extractScript(p404Text, MARKER_404);
  const scriptRestore = extractScript(idxText, MARKER_RESTORE);
  check(
    "Phase 5 inline scripts extractable for behavioural testing",
    script404.length > 0 && scriptRestore.length > 0
  );

  /* Single router / single base-path abstraction */
  const routerDefRe =
    /const\s+ROUTES\s*=|function\s+renderNotFound\b|async\s+function\s+navigate\b/;
  const baseDefRe =
    /function\s+(getBasePath|getBaseUrl|stripBase|appUrl)\b|const\s+BASE_PATH\b/;

  const appJs = []
    .concat(walkJs(path.join(ROOT, "js")))
    .concat(walkJs(path.join(ROOT, "components")))
    .concat(walkJs(path.join(ROOT, "pages")))
    .concat([path.join(ROOT, "sw.js")]);

  const secondRouter = appJs.filter(
    (f) =>
      f !== path.join(ROOT, "js", "router.js") &&
      routerDefRe.test(fs.readFileSync(f, "utf8"))
  );
  check(
    "no second router exists outside js/router.js",
    secondRouter.length === 0,
    secondRouter.join(", ")
  );

  const secondBase = appJs.filter(
    (f) =>
      f !== path.join(ROOT, "js", "basePath.js") &&
      baseDefRe.test(fs.readFileSync(f, "utf8"))
  );
  check(
    "no second base-path abstraction outside js/basePath.js",
    secondBase.length === 0,
    secondBase.join(", ")
  );

  check(
    "404.html defines no routes / router / base-path helpers",
    !routerDefRe.test(p404Text) && !baseDefRe.test(p404Text)
  );
  check(
    "404.html imports no application modules and has no <base>",
    !/js\/(router|app|basePath)\.js/.test(p404Text) &&
      !/<base\s/i.test(p404Text)
  );
  check(
    "404.html is NOT a copy of the app shell (no app markup)",
    p404Text.indexOf('id="app"') === -1 &&
      p404Text.indexOf("js/app.js") === -1
  );

  /* index.html boot order + intact loading */
  const bootIdx = idxText.indexOf("PHASE 4 — BASE-PATH BOOT");
  const restoreIdx = idxText.indexOf(MARKER_RESTORE);
  const appIdx = idxText.indexOf('src="js/app.js"');
  check("Phase 4 base-path boot still present", bootIdx !== -1);
  check(
    "Phase 4 boot remains the FIRST head script (before restore)",
    bootIdx !== -1 && restoreIdx !== -1 && bootIdx < restoreIdx
  );
  check(
    "restore script runs before the app module (deferred)",
    restoreIdx !== -1 && appIdx !== -1 && restoreIdx < appIdx
  );
  check(
    "app module entry intact (js/app.js)",
    /<script\s+type="module"\s+src="js\/app\.js">/.test(idxText)
  );
  check(
    "service-worker registration intact (root + relative fallback)",
    idxText.indexOf("navigator.serviceWorker") !== -1 &&
      idxText.indexOf('register("/sw.js")') !== -1 &&
      /register\("sw\.js"\)/.test(idxText)
  );
  check(
    "app root container intact",
    idxText.indexOf('id="app"') !== -1
  );

  /* Parity + secrecy */
  const keyRe = new RegExp('"' + KEY + '"');
  check(
    "sessionStorage key identical in both documents",
    keyRe.test(p404Text) && keyRe.test(idxText)
  );
  check(
    "TTL identical in both documents (300000 ms)",
    p404Text.indexOf("300000") !== -1 &&
      idxText.indexOf("300000") !== -1
  );
  check(
    "404.html saves the FULL href (query + hash preserved)",
    /href:\s*location\.href/.test(script404)
  );
  check(
    "Phase 5 scripts never log to the console (tokens safe)",
    !/console\./.test(script404) && !/console\./.test(scriptRestore)
  );
  check(
    "Phase 5 scripts reference no Supabase / auth modules",
    !/supabase/i.test(script404) && !/supabase/i.test(scriptRestore)
  );

  /* Extension-set parity with sw.js */
  const swExts = extSet(swText);
  const p404Exts = extSet(p404Text);
  check(
    "404.html asset-extension guard matches sw.js exactly",
    Boolean(swExts) &&
      Boolean(p404Exts) &&
      JSON.stringify(swExts) === JSON.stringify(p404Exts)
  );

  /* sw.js Phase 5 guard + navigation fallback intact */
  check(
    "sw.js: offline shell only refreshed by the app-root document",
    /isHtmlResponse\(response\)\s*&&\s*url\.href\s*===\s*INDEX_URL/.test(swText)
  );
  check(
    "sw.js: navigation fallback + offline shell intact",
    swText.indexOf("handleNavigation") !== -1 &&
      swText.indexOf("serveIndex") !== -1 &&
      swText.indexOf("storeShellCopy") !== -1
  );

    /* ---------------- PART B — HTTP SIMULATION ---------------- */

  section("[B. GITHUB PAGES HTTP SIMULATION]");

  const sim = await startGhSim();
  const server = sim.server;
  const seenUrls = sim.seenUrls;
  const base = "http://127.0.0.1:" + server.address().port;

  try{

    const root = await get(base + "/helpufin-auto/");
    check(
      "GH Pages root /helpufin-auto/ serves index.html (200, app entry)",
      root.status === 200 && root.body.indexOf('src="js/app.js"') !== -1,
      "status " + root.status
    );

    const deepRoutes = [
      "/helpufin-auto/browse?condition=new",
      "/helpufin-auto/browse",
      "/helpufin-auto/login",
      "/helpufin-auto/signup",
      "/helpufin-auto/forgot-password",
      "/helpufin-auto/dealerships",
      "/helpufin-auto/compare",
      "/helpufin-auto/saved",
      "/helpufin-auto/dashboard",
      "/helpufin-auto/mfa-verify",
      "/helpufin-auto/vehicle?id=EXAMPLE",
      "/helpufin-auto/dashboard/dealer"
    ];

    let allMissing404 = true;
    let allFallbackBody = true;
    for(const r of deepRoutes){
      const res = await get(base + r);
      if(res.status !== 404) allMissing404 = false;
      if(
        res.body.indexOf(MARKER_404) === -1 ||
        res.body.indexOf('id="app"') !== -1
      ){
        allFallbackBody = false;
      }
    }
    check(
      "every first-visit deep route answered with HTTP 404 (no SW yet)",
      allMissing404
    );
    check(
      "every 404 response carries the bootstrap — not the app shell",
      allFallbackBody
    );

    const browse = await get(base + "/helpufin-auto/browse?condition=new");
    check(
      "no server-side redirect — requested URL stays in the address bar",
      !browse.headers.location
    );
    check(
      "query string reaches the server intact (?condition=new)",
      seenUrls.indexOf("/helpufin-auto/browse?condition=new") !== -1
    );
    check(
      "vehicle id query reaches the server intact (?id=EXAMPLE)",
      seenUrls.indexOf("/helpufin-auto/vehicle?id=EXAMPLE") !== -1
    );

    const asset = await get(base + "/helpufin-auto/js/basePath.js");
    check(
      "existing assets still served normally (200)",
      asset.status === 200,
      "status " + asset.status
    );

    const missingAsset = await get(base + "/helpufin-auto/js/nope.js");
    check(
      "missing asset still a real 404 (asset guard proven in part C)",
      missingAsset.status === 404
    );

    const local = await get(base + "/");
    check(
      "localhost-style root serves index.html directly (200, no 404 hop)",
      local.status === 200 &&
        local.body.indexOf('src="js/app.js"') !== -1 &&
        local.body.indexOf(MARKER_404) === -1
    );

    /* Hash fragments never reach any server — preservation is
       proven client-side in part C. */
    check(
      "hash fragments are never sent to the server (by spec)",
      !seenUrls.some((u) => u.indexOf("#") !== -1)
    );

  }finally{
    server.close();
  }

    /* ---------------- PART C — BEHAVIOURAL ---------------- */

  section("[C. BEHAVIOURAL — REAL SCRIPTS EXECUTED]");

  const GH = "https://helpufinauto.github.io";

  section("  C1. First visit — URL / query / hash preservation");

  const routes = [
    "/browse?condition=new",
    "/browse",
    "/login",
    "/signup",
    "/forgot-password",
    "/dealerships",
    "/compare",
    "/saved",
    "/dashboard",
    "/mfa-verify",
    "/vehicle?id=EXAMPLE",
    "/dashboard/dealer",
    "/browse/"
  ];

  for(const r of routes){
    const target = GH + "/helpufin-auto" + r;
    const sim2 = simulateFirstVisit(target, script404, scriptRestore);
    const env404 = sim2.env404;
    const envIndex = sim2.envIndex;
    const savedRaw = sim2.savedRaw;

    const transferred =
      env404.calls.replace.length === 1 &&
      env404.calls.replace[0] === "/helpufin-auto/";

    let storedHref = null;
    try{
      storedHref = JSON.parse(savedRaw).href;
    }catch(e){
      storedHref = null;
    }

    const restored =
      envIndex.calls.replaceState.length === 1 &&
      envIndex.calls.replaceState[0].url === target;

    check(
      "/helpufin-auto" + r + " \u2192 transfer + exact URL restore",
      transferred &&
        storedHref === target &&
        restored &&
        envIndex.href === target,
      "replace=" + JSON.stringify(env404.calls.replace) +
        " restore=" + JSON.stringify(envIndex.calls.replaceState)
    );
    check(
      "   \u2514 entry consumed, zero console output for " + r,
      !envIndex.store.has(KEY) &&
        envIndex.calls.logs.length === 0 &&
        env404.calls.logs.length === 0
    );
  }

  section("  C2. Password-recovery hash handling (tokens)");

  const recovery =
    GH +
    "/helpufin-auto/reset-password" +
    "#access_token=EXAMPLE_ACCESS_TOKEN&type=recovery";

  const rec = simulateFirstVisit(recovery, script404, scriptRestore);
  check(
    "recovery deep link restores the FULL hash fragment",
    rec.envIndex.href === recovery &&
      rec.envIndex.calls.replaceState.length === 1 &&
      rec.envIndex.calls.replaceState[0].url === recovery
  );
  check(
    "recovery token never appears in any console output",
    rec.env404.calls.logs.length === 0 &&
      rec.envIndex.calls.logs.length === 0
  );

    section("  C3. Transfer guards (404.html bootstrap)");

  const loc = makeEnv("http://localhost:5500/browse");
  runScript(script404, loc);
  check(
    "localhost: no transfer, no storage write, URL untouched",
    loc.calls.replace.length === 0 &&
      loc.store.size === 0 &&
      loc.href === "http://localhost:5500/browse"
  );

  const other = makeEnv("https://example.com/helpufin-auto/browse");
  runScript(script404, other);
  check(
    "non-github.io host: no transfer",
    other.calls.replace.length === 0 &&
      other.href === "https://example.com/helpufin-auto/browse"
  );

  const missingJs =
    makeEnv("https://helpufinauto.github.io/helpufin-auto/js/missing.js");
  runScript(script404, missingJs);
  check(
    "missing .js \u2192 static 404, SPA never boots",
    missingJs.calls.replace.length === 0
  );

  const missingPng =
    makeEnv("https://helpufinauto.github.io/helpufin-auto/logo.png");
  runScript(script404, missingPng);
  check(
    "missing .png \u2192 static 404, SPA never boots",
    missingPng.calls.replace.length === 0
  );

  const self404 =
    makeEnv("https://helpufinauto.github.io/helpufin-auto/404.html");
  runScript(script404, self404);
  check(
    "/helpufin-auto/404.html \u2192 no self-bootstrap loop",
    self404.calls.replace.length === 0
  );

  const stray = makeEnv("https://helpufinauto.github.io/stray");
  runScript(script404, stray);
  check(
    "URL outside /<repo>/ \u2192 static 404",
    stray.calls.replace.length === 0
  );

    section("  C4. Restore guards (index.html)");

  const ttl = makeEnv("https://helpufinauto.github.io/helpufin-auto/");
  ttl.store.set(
    KEY,
    JSON.stringify({
      href: GH + "/helpufin-auto/browse?condition=new",
      ts: Date.now() - 300001
    })
  );
  runScript(scriptRestore, ttl);
  check(
    "stale entry (>5 min) ignored and consumed",
    ttl.calls.replaceState.length === 0 && !ttl.store.has(KEY)
  );

  const xOrigin = makeEnv("https://helpufinauto.github.io/helpufin-auto/");
  xOrigin.store.set(
    KEY,
    JSON.stringify({
      href: "https://evil.example/helpufin-auto/x",
      ts: Date.now()
    })
  );
  runScript(scriptRestore, xOrigin);
  check(
    "cross-origin entry rejected (no token exfil path)",
    xOrigin.calls.replaceState.length === 0
  );

  const outside = makeEnv("https://helpufinauto.github.io/helpufin-auto/");
  outside.store.set(
    KEY,
    JSON.stringify({ href: GH + "/other-app/page", ts: Date.now() })
  );
  runScript(scriptRestore, outside);
  check(
    "entry outside the app directory rejected",
    outside.calls.replaceState.length === 0
  );

  const malformed = makeEnv("https://helpufinauto.github.io/helpufin-auto/");
  malformed.store.set(KEY, "{not-json");
  runScript(scriptRestore, malformed);
  check(
    "malformed entry discarded without throwing",
    malformed.calls.replaceState.length === 0
  );

  const normal = makeEnv("https://helpufinauto.github.io/helpufin-auto/");
  runScript(scriptRestore, normal);
  check(
    "normal root visit (no key) \u2192 restore is a strict no-op",
    normal.calls.replaceState.length === 0 &&
      normal.href === "https://helpufinauto.github.io/helpufin-auto/"
  );

  const localNormal =
    makeEnv("http://localhost:5500/browse?condition=new");
  runScript(scriptRestore, localNormal);
  check(
    "localhost normal load \u2192 restore is a strict no-op",
    localNormal.calls.replaceState.length === 0 &&
      localNormal.href === "http://localhost:5500/browse?condition=new"
  );

  /* ---------------- SUMMARY ---------------- */

  console.log("\n========================================");
  console.log(
    "PHASE 5 RESULT: " +
    (fail === 0 ? "PASS" : "FAIL") +
    " \u2014 " + pass + " passed, " + fail + " failed"
  );
  console.log("========================================");

  process.exit(fail === 0 ? 0 : 1);

}

main().catch((err) => {
  console.error("TEST HARNESS ERROR:", err && err.message);
  process.exit(1);
});







