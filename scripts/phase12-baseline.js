/* Phase 12 — final performance baseline.
   Compresses each key asset with the SAME zlib settings as server.js
   (brotli quality 5, gzip level 6) and reports raw/gzip/brotli sizes. */
const fs = require("fs");
const zlib = require("zlib");

const assets = [
  "css/styles.css",
  "css/tailwind.css",
  "pages/dashboard.js",
  "pages/browse.js",
  "pages/vehicle.js",
  "js/app.js"
];

console.log("| Asset | Raw | gzip | Brotli |");
console.log("|---|---:|---:|---:|");
for (const a of assets) {
  const buf = fs.readFileSync(a);
  const gz = zlib.gzipSync(buf, { level: 6 });
  const br = zlib.brotliCompressSync(buf, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 }
  });
  console.log(`| ${a} | ${(buf.length/1024).toFixed(0)} KB | ${(gz.length/1024).toFixed(0)} KB | ${(br.length/1024).toFixed(0)} KB |`);
}

/* Optimized image totals (referenced webp/jpg) */
const refs = [
  "assets/sellmain.webp", "assets/sellprivate.webp", "assets/selldealer.webp",
  "assets/signup.webp", "assets/login.webp", "assets/loading.webp",
  "assets/menubackground.webp", "assets/footerbg.webp", "assets/headerlogo.webp",
  "assets/HUF1.webp", "assets/HUF1.jpg", "assets/logo1.webp",
  "assets/hero-opt.jpg", "assets/hero-mobile.jpg"
];
let imgBytes = 0;
for (const r of refs) imgBytes += fs.statSync(r).size;
console.log("\nOptimized referenced images count:", refs.length, "| total:", (imgBytes/1024).toFixed(0), "KB");