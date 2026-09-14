import fs from "fs";
const s = fs.readFileSync("pages/dashboard.js","utf8");

// Locate the inventory search block inside renderInventoryResults
const anchor = s.indexOf("window.__inventoryFilters.search");
// the inventory filter block sits AFTER the filters-state init
const i = s.indexOf("/* SEARCH */", anchor);
const j = s.indexOf("/* STATUS */", i);
let body = s.slice(i, j);

console.log("--- extracted block head ---");
console.log(body.split("\n").slice(0,6).join("\n"));
console.log("---------------------------");

// Compile the real production block into a testable function:
//   fn(searchTerm, vehicles) -> filtered array
body = body
  .replaceAll("filteredVehicles", "matches")
  .replace(/\bsearchValue\b/g, "sv");
const runSearch = new Function("sv", "list",
  "let matches = list;\n" + body + "\nreturn matches;"
);

var sampleVehicles = [
  { make:"Mazda", model:"2", year:2019, price:185000, status:"active" },
  { make:"Ford",  model:"Ranger", year:2021, price:350000, status:"sold" },
  { make:"Toyota",model:"Corolla",year:2020, price:289500, status:"active" }
];

function t(q){
  const out = runSearch(String(q).toLowerCase(), sampleVehicles);
  return out.map(v=>v.make+" "+v.model).join(", ") || "(none)";
}

console.log("Mazda        ->", t("Mazda"));
console.log("Mazda2       ->", t("Mazda2"));
console.log("Ford Ranger  ->", t("Ford Ranger"));
console.log("350000       ->", t("350000"));
console.log("350 000      ->", t("350 000"));
console.log("R 350,000    ->", t("R 350,000"));
console.log("zzz          ->", t("zzz"));
console.log("sold         ->", t("sold"));
console.log("2021         ->", t("2021"));

