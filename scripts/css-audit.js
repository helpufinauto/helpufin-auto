/* Phase 9 audit — precise per-prefix byte accounting via postcss. */
const fs = require("fs");
const postcss = require("postcss");

const css = fs.readFileSync("css/styles.css", "utf8");
const root = postcss.parse(css);

const sizes = new Map();

function groupFor(sel) {
  const cls = sel.match(/\.([A-Za-z][A-Za-z0-9_-]*)/);
  const el = sel.match(/^[a-z][a-z0-9-]*/i);
  return cls ? cls[1] : (el ? el[0] : "other:" + sel.slice(0, 24));
}

root.walk((node) => {
  if (node.type === "rule") {
    const b = node.toString().length;
    const g = groupFor(node.selector || "@");
    sizes.set(g, (sizes.get(g) || 0) + b);
  } else if (node.type === "atrule" &&
             ["font-face", "keyframes", "property"].includes(node.name)) {
    const g = "@" + node.name;
    sizes.set(g, (sizes.get(g) || 0) + node.toString().length);
  }
});

let declared = 0;
root.walkDecls(() => declared++);

const sorted = [...sizes.entries()].sort((a, b) => b[1] - a[1]);
let sum = 0;
for (const [, b] of sorted) sum += b;

console.log("file bytes:", css.length, "| declarations:", declared);
console.log("rule-attributed bytes:", sum, "(" + ((sum / css.length) * 100).toFixed(1) + "% — remainder: comments/whitespace)");

let acc = 0;
console.log("\nTop 50 groups:");
for (const [g, b] of sorted.slice(0, 50)) {
  acc += b;
  console.log(String(b).padStart(8), ((b / css.length) * 100).toFixed(1).padStart(5) + "%", g);
}
console.log("top50:", acc, "=", ((acc / css.length) * 100).toFixed(1) + "%");

const routes = {
  dashboard_admin: ["dashboard", "crm", "admin", "tradein", "aff", "hufa-page-heading"],
  sell: ["sell"],
  compare: ["compare"],
  messages: ["msg", "message", "chat"],
  navbar: ["nav", "dropdown", "mobile", "menu"],
  vehicle: ["hufa-fs", "vehicle"],
};

console.log("\nRough route-attributable totals (selector-prefix heuristic):");
for (const [route, prefixes] of Object.entries(routes)) {
  let t = 0;
  for (const [g, b] of sorted) {
    const gl = g.toLowerCase();
    if (prefixes.some((p) => gl.startsWith(p))) t += b;
  }
  console.log(" ", route.padEnd(16), String(t).padStart(7), ((t / css.length) * 100).toFixed(1) + "%");
}
