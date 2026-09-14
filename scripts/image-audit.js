/* Phase 2 image audit: dimensions + references for every asset image. */
const fs = require("fs");
const path = require("path");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(png|jpe?g|webp|gif|svg)$/i.test(e.name)) out.push(p);
  }
  return out;
}

function pngSize(buf) {
  if (buf.readUInt32BE(12) === 0x49484452)
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  return null;
}
function jpgSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc)
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

const images = walk("assets");

/* Collect all text sources for reference search */
const srcFiles = [];
(function walkSrc(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walkSrc(p);
    else if (/\.(js|mjs|html|css|json)$/i.test(e.name)) srcFiles.push(p);
  }
})(".");
const sources = srcFiles
  .map((f) => ({ f, c: fs.readFileSync(f, "utf8") }));

console.log("size_bytes | dimensions | refs | file");
for (const img of images.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)) {
  const buf = fs.readFileSync(img);
  const dim = img.endsWith(".png") ? pngSize(buf) : jpgSize(buf);
  const base = path.basename(img);
  const refs = sources.filter((s) => s.c.includes(base)).map((s) => s.f);
  const rel = img.replace(/\\/g, "/");
  console.log(
    `${String(buf.length).padStart(9)} | ${dim ? dim.w + "x" + dim.h : "??"} | ${refs.length ? refs.join(",") : "UNREFERENCED"} | ${rel}`
  );
}
