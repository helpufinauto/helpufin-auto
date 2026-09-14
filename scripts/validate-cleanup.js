/* Phase 3 post-deletion validation. */
const fs = require("fs");
const path = require("path");

const deleted = [
  "assets/hero.png", "assets/Loading-Light.png",
  "assets/brands/ChatGPT Image May 15, 2026, 12_32_12 PM.png",
  "assets/brands/peugeot.png", "assets/brands/renault.png",
  "assets/brands/honda.png", "assets/brands/mazda.png",
  "assets/brands/isuzu.png", "assets/brands/haval.png",
  "assets/brands/Mitsubishi.png", "assets/brands/mahindra.png",
  "assets/brands/cherry.png",
  "assets/brands/opt/ChatGPT Image May 15, 2026, 12_32_12 PM.png",
  "assets/brands/opt/cherry.png", "assets/brands/opt/haval.png",
  "assets/brands/opt/honda.png", "assets/brands/opt/isuzu.png",
  "assets/brands/opt/mahindra.png", "assets/brands/opt/mazda.png",
  "assets/brands/opt/Mitsubishi.png", "assets/brands/opt/peugeot.png",
  "assets/brands/opt/renault.png"
];

let ok = true;

/* 1. Files are gone */
for (const f of deleted) {
  if (fs.existsSync(f)) { console.log("STILL EXISTS!", f); ok = false; }
}
console.log("1. All 22 deleted files confirmed removed:", ok);

/* 2. Zero references remain (exclude maintenance scripts that only
      list filenames for audit purposes). */
const textFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|mjs|html|css|json|xml|txt|md)$/i.test(e.name)) textFiles.push(p);
  }
})(".");

let refsFound = [];

for (const f of textFiles) {
  const rel = f.replace(/\\/g, "/");
  if (rel.startsWith("scripts/")) continue; // maintenance scripts only
  const c = fs.readFileSync(f, "utf8");
  for (const d of deleted) {
    if (c.includes(path.basename(d))) refsFound.push(rel + " -> " + path.basename(d));
  }
}
console.log("2. Remaining app references to deleted files:", refsFound.length ? refsFound : "NONE");

/* 3. Every asset referenced by application code exists on disk */
const assetRefs = new Set();
const assetRe = /\/assets\/[A-Za-z0-9 _.,\-()[\]]+?\.(png|jpe?g|webp|gif|svg|ico)/gi;
for (const f of textFiles) {
  const rel = f.replace(/\\/g, "/");
  if (rel.startsWith("scripts/")) continue;
  const c = fs.readFileSync(f, "utf8");
  let m;
  while ((m = assetRe.exec(c)) !== null) assetRefs.add(m[0]);
}

let missing = [];
for (const ref of assetRefs) {
  if (!fs.existsSync("." + ref)) missing.push(ref + "  (referenced in: ?)");
}
console.log("3. Total distinct asset references:", assetRefs.size);
console.log("   Missing referenced assets:", missing.length ? missing : "NONE");

console.log(ok && refsFound.length === 0 && missing.length === 0 ? "\nVALIDATION PASSED" : "\nVALIDATION FAILED");
