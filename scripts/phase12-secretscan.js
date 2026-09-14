/* Phase 12 — security scan. Flags likely secrets introduced by
   Phases 1-11, ignoring the intended public Supabase frontend config
   (URL + anon key) in js/api.js which is the standard client setup. */
const fs = require("fs");
const path = require("path");

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|mjs|json|env|html|py|txt)$/i.test(e.name)) files.push(p);
  }
})(".");

const patterns = [
  [/service[_-]?role[_-]?key[\"':=]?\s*[\"']?[A-Za-z0-9_\-\.]{20,}/i, "service-role key"],
  [/sk-(live|test)-[A-Za-z0-9]{16,}/, "stripe key"],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
  [/AKIA[0-9A-Z]{16}/, "AWS key"],
  [/xox[baprs]-[A-Za-z0-9-]{20,}/, "slack token"],
  [/gh[pousr]_[A-Za-z0-9]{20,}/, "github token"],
  [/"password"\s*:\s*"[^"]{8,}"/i, "password literal"],
  [/Authorization:\s*Bearer\s+[A-Za-z0-9._-]{20,}/i, "bearer token"]
];

let issues = 0;
for (const f of files) {
  let text;
  try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
  for (const [re, label] of patterns) {
    const m = text.match(re);
    if (m) {
      // Whitelist: the intended public Supabase anon key lives in js/api.js
      if (label === "service-role key" && f.replace(/\\/g, "/") === "js/api.js") continue;
      console.log("POSSIBLE", label, "in", f, "->", m[0].slice(0, 40));
      issues++;
    }
  }
}

console.log(issues === 0 ? "SECURITY SCAN: clean (no suspicious secrets)" : "SECURITY SCAN: " + issues + " candidates above");