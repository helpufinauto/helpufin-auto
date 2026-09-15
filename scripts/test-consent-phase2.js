/* =========================================================
   PHASE 2 — COOKIE & PRIVACY CONSENT VALIDATION
   =========================================================
   Run: node scripts/test-consent-phase2.js

   1. HTTP checks  — server serves the new consent assets and
      the SPA fallback / existing routes are unaffected.
   2. Logic checks — the consent module's storage + gating
      behaviour (stubbed browser globals, no DOM needed).
   Exits 0 when every check passes, 1 otherwise.
   ========================================================= */

const http = require("http");

const {
  spawn
} = require("child_process");

const fs = require("fs");

const os = require("os");

const path = require("path");

const {
  pathToFileURL
} = require("url");

const PORT = 3125;

let failures = 0;

function check(name, ok, extra){

  const suffix =
  extra ? " — " + extra : "";

  console.log(
    (ok ? "PASS" : "FAIL") +
    "  " + name + suffix
  );

  if(!ok){
    failures++;
  }

}

function httpGet(port, reqPath){

  return new Promise((resolve) => {

    const req =
    http.get(
      { host: "127.0.0.1", port, path: reqPath },
      (res) => {

        let body = "";

        res.on("data", (c) => (body += c));

        res.on("end", () => resolve({
          status: res.statusCode,
          type: res.headers["content-type"] || "",
          body
        }));

      }
    );

    req.on("error", (e) => resolve({
      status: 0,
      type: "",
      body: "",
      error: e.message
    }));

  });

}

async function waitForServer(port, tries = 25){

  for(let i = 0; i < tries; i++){

    const res =
    await httpGet(port, "/");

    if(res.status === 200){
      return true;
    }

    await new Promise((r) => setTimeout(r, 120));

  }

  return false;

}

async function httpChecks(){

  const server =
  spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: "ignore"
  });

  try{

    const up =
    await waitForServer(PORT);

    if(!up){
      check("dev server reachable", false);
      return;
    }

    const home =
    await httpGet(PORT, "/");

    check(
      "index.html served",
      home.status === 200
    );

    check(
      "index.html includes consent.js",
      home.body.includes('src="js/consent.js"')
    );

    check(
      "index.html includes consent.css",
      home.body.includes('href="css/consent.css"')
    );

    const consentJs =
    await httpGet(PORT, "/js/consent.js");

    check(
      "/js/consent.js served",
      consentJs.status === 200 &&
      consentJs.type.includes("javascript"),
      consentJs.status + " " + consentJs.type
    );

    const consentCss =
    await httpGet(PORT, "/css/consent.css");

    check(
      "/css/consent.css served",
      consentCss.status === 200 &&
      consentCss.type.includes("css"),
      consentCss.status + " " + consentCss.type
    );

    const browse =
    await httpGet(PORT, "/browse");

    check(
      "SPA /browse fallback still works",
      browse.status === 200 &&
      browse.type.includes("html")
    );

    const missing =
    await httpGet(PORT, "/js/nope.js");

    check(
      "missing asset still 404s",
      missing.status === 404
    );

  }finally{

    server.kill();

  }

}

async function logicChecks(){

  /* consent.js is an ES module living in a CJS package —
     copy it to a .mjs temp file so it can be imported. */

  const tmp =
  path.join(os.tmpdir(), "hufa-consent-module-test.mjs");

  fs.copyFileSync(
    path.join(__dirname, "..", "js", "consent.js"),
    tmp
  );

  /* Minimal browser-global stubs (no DOM). */

  const store = new Map();

  global.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  };

  global.window = global;

  global.CustomEvent = class {
    constructor(type, opts){
      this.type = type;
      this.detail = opts?.detail;
    }
  };

  global.document = {
    addEventListener(){},
    removeEventListener(){},
    createElement(){
      throw new Error("no DOM in logic test");
    },
    appendChild(){},
    body: {}
  };

  const consent =
  await import(pathToFileURL(tmp).href);

  check(
    "first visit is undecided",
    consent.hasDecided() === false
  );

  check(
    "necessary is always allowed",
    consent.isAllowed("necessary") === true
  );

  check(
    "analytics denied before any choice",
    consent.isAllowed("analytics") === false
  );

  consent.setConsent(
    { analytics: true },
    "accept_all"
  );

  check(
    "Accept all enables the analytics category",
    consent.isAllowed("analytics") === true
  );

  check(
    "decision is persisted locally",
    store.get("hufa_cookie_consent") !== undefined
  );

  const persisted =
  JSON.parse(store.get("hufa_cookie_consent"));

  check(
    "stored payload holds preference booleans only",
    JSON.stringify(Object.keys(persisted).sort()) ===
    JSON.stringify(["analytics", "decision", "necessary", "ts", "v"]),
    JSON.stringify(persisted)
  );

  consent.setConsent(
    { analytics: false },
    "necessary"
  );

  check(
    "Only necessary disables the analytics category",
    consent.isAllowed("analytics") === false
  );

  check(
    "necessary can never be switched off",
    consent.isAllowed("necessary") === true
  );

  check(
    "getConsent exposes the decision",
    consent.getConsent()?.decision === "necessary"
  );

  fs.unlinkSync(tmp);

}

(async () => {

  console.log("PHASE 2 — CONSENT VALIDATION\n");

  await logicChecks();

  await httpChecks();

  console.log(
    failures === 0
      ? "\nALL PHASE 2 CHECKS PASSED"
      : "\n" + failures + " CHECK(S) FAILED"
  );

  process.exit(failures === 0 ? 0 : 1);

})();