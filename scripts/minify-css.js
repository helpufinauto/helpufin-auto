/* =========================================================
   Phase 11 — SAFE styles.css minifier (reproducible build)
   =========================================================
   npm run minify:css
   Reads the authoritative formatted source (css/styles.css.src)
   and regenerates the production css/styles.css by REMOVING
   comments and compacting formatting only. Every selector,
   declaration value, at-rule and ordering is preserved verbatim
   via postcss cloning — NO value rewrites, so behaviour (including
   the file's two pre-existing malformed regions) is identical.
   Run this after editing css/styles.css.src.
   ========================================================= */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const postcss = require("postcss");

const SRC = path.join(__dirname, "..", "css", "styles.css.src");
const OUT = path.join(__dirname, "..", "css", "styles.css");

const src = fs.readFileSync(SRC, "utf8");
const root = postcss.parse(src);

const out = postcss.root();

for (const node of root.nodes) {
  if (node.type === "comment") continue;
  const clone = node.clone();
  clone.raws = {};
  if (clone.nodes) {
    const strip = (parent) => {
      parent.raws = {};
      parent.nodes = parent.nodes.filter((n) => n.type !== "comment");
      for (const n of parent.nodes) {
        n.raws = {};
        if (n.nodes) strip(n);
      }
    };
    strip(clone);
  }
  out.append(clone);
}

const min = out.toString();
fs.writeFileSync(OUT, min);

console.log("raw:", src.length, "->", min.length,
  `(-${((1 - min.length / src.length) * 100).toFixed(1)}%)`);

/* exact structural equivalence check */
function fingerprint(cssText) {
  const r = postcss.parse(cssText);
  const nodes = [];
  r.walk((node) => {
    if (node.type === "rule") nodes.push("R:" + node.selector);
    else if (node.type === "decl") nodes.push("D:" + node.prop + ":" + node.value);
    else if (node.type === "atrule" && node.name !== "charset")
      nodes.push("@" + node.name + ":" + node.params);
  });
  return nodes;
}

const a = fingerprint(src);
const b = fingerprint(min);
let bad = 0;
for (let i = 0; i < Math.max(a.length, b.length); i++)
  if (a[i] !== b[i]) bad++;

console.log("nodes:", a.length, "| exact mismatches:", bad);
if (bad !== 0) { console.error("EQUIVALENCE FAIL"); process.exit(1); }
console.log("EQUIVALENCE: PASS (byte-identical semantics)");

const gz = zlib.gzipSync(Buffer.from(min), { level: 6 });
const br = zlib.brotliCompressSync(Buffer.from(min), {
  params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 }
});
console.log("gzip:", (gz.length / 1024).toFixed(0) + "K",
  "| brotli:", (br.length / 1024).toFixed(0) + "K");
