/* Phase 12 — final CDN / third-party audit of index.html. */
const fs = require("fs");
const c = fs.readFileSync("index.html", "utf8");

const scripts = [...c.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g)].map(m => ({ src: m[1], defer: /defer/.test(m[0]) }));
const links  = [...c.matchAll(/<link[^>]*href="([^"]+)"[^>]*>/g)].map(m => m[1]);

console.log("== <script src> tags ==");
for (const s of scripts) console.log("  defer=" + s.defer, s.src);

console.log("== <link href> ==");
for (const l of links) console.log("  " + l.replace(/&amp;/g, "&").slice(0, 160));

console.log("\ncdn.tailwindcss.com in runtime code:", /cdn\.tailwindcss\.com/.test(c.replace(/<!--[\s\S]*?-->/g, "")));
console.log("@latest refs:", /lucide@latest|tailwind@latest/.test(c));
console.log("Material icon_names present:", /icon_names=balance/.test(c));
console.log("Material display=swap present:", /display=swap/.test(c));
console.log("Supabase script count:", (c.match(/supabase-js/g) || []).length);
console.log("Lucide script tag present (must be 0):", (c.match(/src="https:\/\/unpkg\.com\/lucide/g) || []).length);