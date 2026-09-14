/* Phase 10 validation: compression negotiation, headers, round-trip
   decompression, and ETag/304 behavior across encodings. */
const http = require("http");
const zlib = require("zlib");
const { spawn } = require("child_process");

const server = spawn(process.execPath, ["server.js"], {
  env: { ...process.env, PORT: "3127" },
  stdio: "ignore"
});

function request(path, headers = {}) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port: 3127, path, headers }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks)
          })
        );
      })
      .on("error", reject);
  });
}

let pass = 0, fail = 0;
function check(label, ok, detail = "") {
  if (ok) { pass++; console.log("  PASS", label, detail); }
  else { fail++; console.log("  FAIL", label, detail); }
}

setTimeout(async () => {

  try {

    const assets = [
      ["/css/styles.css", "text/css", "public, max-age=3600, must-revalidate"],
      ["/pages/dashboard.js", "text/javascript", "public, max-age=3600, must-revalidate"],
      ["/css/tailwind.css", "text/css", "public, max-age=3600, must-revalidate"],
      ["/pages/browse.js", "text/javascript", "public, max-age=3600, must-revalidate"]
    ];

    /* --- Brotli --- */
    console.log("\n[BROTLI]");
    for (const [p, type, cache] of assets) {
      const r = await request(p, { "Accept-Encoding": "br" });
      const raw = zlib.brotliDecompressSync(r.body);
      check(p, r.headers["content-encoding"] === "br"
        && r.headers["vary"] === "Accept-Encoding"
        && r.headers["content-type"].startsWith(type)
        && r.headers["cache-control"] === cache
        && r.headers.etag,
        `${r.body.length} B (raw ${raw.length} B, -${((1 - r.body.length / raw.length) * 100).toFixed(0)}%)`);
    }

    /* --- Gzip --- */
    console.log("\n[GZIP]");
    for (const [p] of assets) {
      const r = await request(p, { "Accept-Encoding": "gzip" });
      const raw = zlib.gunzipSync(r.body);
      check(p, r.headers["content-encoding"] === "gzip"
        && r.headers["vary"] === "Accept-Encoding"
        && raw.length > 0,
        `${r.body.length} B`);
    }

    /* --- Identity (no Accept-Encoding) --- */
    console.log("\n[IDENTITY]");
    const id = await request("/css/styles.css");
    check("no Content-Encoding header",
      !id.headers["content-encoding"] && id.headers["vary"] === "Accept-Encoding",
      `${id.body.length} B`);

    /* --- Images must NOT be compressed --- */
    const png = await request("/assets/logo1.webp", { "Accept-Encoding": "br, gzip" });
    check("webp not compressed",
      !png.headers["content-encoding"] && !png.headers["vary"],
      "");

    /* --- q-value preference: gzip preferred over br when q higher --- */
    const pref = await request("/css/styles.css", { "Accept-Encoding": "br;q=0.5, gzip;q=0.8" });
    check("q-value negotiation picks gzip", pref.headers["content-encoding"] === "gzip", "");

    /* --- ETag / 304 across encodings --- */
    console.log("\n[ETAG/304]");
    const base = await request("/css/styles.css");
    const etag = base.headers.etag;

    const r304plain = await request("/css/styles.css", { "If-None-Match": etag });
    check("304 plain", r304plain.status === 304 && r304plain.body.length === 0, "");

    const r304br = await request("/css/styles.css", { "If-None-Match": etag, "Accept-Encoding": "br" });
    check("304 with br", r304br.status === 304 && r304br.body.length === 0
      && !r304br.headers["content-encoding"], "no encoded body on 304");

    const r304gz = await request("/css/styles.css", { "If-None-Match": etag, "Accept-Encoding": "gzip" });
    check("304 with gzip", r304gz.status === 304 && r304gz.body.length === 0, "");

    /* ETag stability across encodings (same asset) */
    const brFull = await request("/css/styles.css", { "Accept-Encoding": "br" });
    check("ETag stable across encodings", brFull.headers.etag === etag, etag.slice(0, 16));

    /* decompressed br body must equal identity body */
    check("br body decompresses to identity bytes",
      zlib.brotliDecompressSync(brFull.body).equals(id.body), "");

    /* --- SPA fallback + 404 guard unaffected --- */
    const spa = await request("/browse", { "Accept-Encoding": "br" });
    check("SPA fallback compressed", spa.status === 200 && spa.headers["content-encoding"] === "br", "");
    const missing = await request("/js/nope.js", { "Accept-Encoding": "br" });
    check("missing asset still 404", missing.status === 404, "");

    console.log(`\nRESULT: ${pass} passed, ${fail} failed`);

  } catch (e) {
    console.error("ERROR:", e.message);
    fail++;
  }

  server.kill();
  process.exit(fail ? 1 : 0);

}, 1500);
