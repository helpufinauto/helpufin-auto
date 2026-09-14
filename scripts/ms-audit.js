/* Extract every Material Symbols ligature name and detect dynamic ones. */
const fs = require("fs");
const path = require("path");

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|html|css)$/i.test(e.name)) files.push(p);
  }
})(".");

const names = new Set();
const dynamic = [];

const famRe = /material-symbols-(outlined|rounded|sharp)/g;

for (const f of files) {

  const src = fs.readFileSync(f, "utf8");

  /* Find each span/i with a material-symbols class and capture its content */
  const tagRe = /<(?:span|i)[^>]*material-symbols-(?:outlined|rounded|sharp)[^>]*>([\s\S]{0,120}?)<\/(?:span|i)>/g;

  let m;
  while ((m = tagRe.exec(src)) !== null) {

    const inner = m[1].trim();

    if (/^[a-z0-9_]+$/i.test(inner)) {
      names.add(inner);
    } else if (inner.length === 0) {
      dynamic.push(f + " -> EMPTY tag (icon set via JS?)");
    } else {
      dynamic.push(f + " -> DYNAMIC: " + JSON.stringify(inner.slice(0, 80)));
    }

  }

  /* families used */
  let fm;
  famRe.lastIndex = 0;
  while ((fm = famRe.exec(src)) !== null) {
    names.add("FAMILY:" + fm[1]);
  }

}

console.log("Unique static icon names:", [...names].filter(n => !n.startsWith("FAMILY:")).length);
console.log([...names].sort().join("\n"));
console.log("\nDynamic/empty usages:", dynamic.length);
dynamic.forEach(d => console.log(" ", d));
