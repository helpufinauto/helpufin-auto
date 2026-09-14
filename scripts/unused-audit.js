/* Phase 3 — final reference audit for deletion candidates. */
const fs = require("fs");
const path = require("path");

const candidates = [
  "assets/hero.png",
  "assets/Loading-Light.png",
  "assets/brands/ChatGPT Image May 15, 2026, 12_32_12 PM.png",
  "assets/brands/peugeot.png",
  "assets/brands/renault.png",
  "assets/brands/honda.png",
  "assets/brands/mazda.png",
  "assets/brands/isuzu.png",
  "assets/brands/haval.png",
  "assets/brands/Mitsubishi.png",
  "assets/brands/mahindra.png",
  "assets/brands/cherry.png"
];

/* The 12 files currently inside assets/brands/opt/ */
const optDir = "assets/brands/opt";
const optFiles = fs.readdirSync(optDir)
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  .map((f) => "assets/brands/opt/" + f);

const all = [...candidates, ...optFiles];

/* Collect every text file (exclude node_modules and this script). */
const textFiles = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|mjs|html|css|json|xml|txt|md)$/i.test(e.name)) textFiles.push(p);
  }
})(".");

const contents = textFiles.map((f) => ({ f, c: fs.readFileSync(f, "utf8") }));

let deletable = 0;

for (const img of all) {

  const base = path.basename(img);          // e.g. "peugeot.png"
  const stem = base.replace(/\.[^.]+$/, ""); // e.g. "peugeot"

  /* A file counts as referenced if any OTHER file mentions its
     filename, stem-with-path, or full asset path. The file itself
     (and its own opt counterpart path) is skipped. */
  const refs = [];

  for (const s of contents) {

    // Skip the image itself (can't read binary as text anyway)
    if (s.f.replace(/\\/g, "/") === img) continue;

    // Skip this audit script — it contains the candidate list itself.
    if (s.f.replace(/\\/g, "/") === "scripts/unused-audit.js") continue;

    const found =
      s.c.includes(base) ||
      s.c.includes("assets/brands/" + stem) ||
      s.c.includes("brands/opt/" + stem) ||
      s.c.includes("brands/" + stem);

    if (found) refs.push(s.f);

  }

  if (refs.length === 0) {
    deletable++;
    console.log("ZERO REFS  ", img);
  } else {
    console.log("REFERENCED!", img, "->", refs.join(", "));
  }

}

console.log("\nDeletable:", deletable, "of", all.length);
