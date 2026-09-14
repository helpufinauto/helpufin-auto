/* Phase 3 — delete the 22 confirmed zero-reference images. */
const fs = require("fs");

const toDelete = [
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
  "assets/brands/cherry.png",
  "assets/brands/opt/ChatGPT Image May 15, 2026, 12_32_12 PM.png",
  "assets/brands/opt/cherry.png",
  "assets/brands/opt/haval.png",
  "assets/brands/opt/honda.png",
  "assets/brands/opt/isuzu.png",
  "assets/brands/opt/mahindra.png",
  "assets/brands/opt/mazda.png",
  "assets/brands/opt/Mitsubishi.png",
  "assets/brands/opt/peugeot.png",
  "assets/brands/opt/renault.png"
];

let total = 0;

for (const f of toDelete) {

  const size = fs.statSync(f).size;

  fs.unlinkSync(f);

  total += size;

  console.log(
    "DELETED",
    (size / 1024).toFixed(0).padStart(6) + " KB",
    f
  );

}

console.log("\nTOTAL RECOVERED:", (total / 1024 / 1024).toFixed(2), "MB");
