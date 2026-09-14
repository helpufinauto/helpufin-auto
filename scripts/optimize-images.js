/* Phase 2 image optimization — generates optimized WebP variants.
   Originals are left untouched; references are updated separately. */
const sharp = require("sharp");

const jobs = [
  // Photographic/branded page backgrounds (opaque) — same dimensions, q78
  { in: "assets/selldealer.png",      out: "assets/selldealer.webp" },
  { in: "assets/sellmain.png",        out: "assets/sellmain.webp" },
  { in: "assets/sellprivate.png",     out: "assets/sellprivate.webp" },
  { in: "assets/signup.png",          out: "assets/signup.webp" },
  { in: "assets/login.png",           out: "assets/login.webp" },
  { in: "assets/menubackground.png",  out: "assets/menubackground.webp" },
  { in: "assets/footerbg.png",        out: "assets/footerbg.webp" },
  { in: "assets/headerlogo.png",      out: "assets/headerlogo.webp" },
  { in: "assets/loading.png",         out: "assets/loading.webp" },
  // In-page vehicle fallback image (opaque)
  { in: "assets/HUF1.png",            out: "assets/HUF1.webp" },
  // Social-share image — JPEG (crawlers universally support it)
  { in: "assets/HUF1.png",            out: "assets/HUF1.jpg", opts: { quality: 80 } },
  // Navbar/footer/dashboard logo (alpha) — displayed at max ~52px nav height,
  // footer column up to ~500px wide. 1080w covers retina 2x comfortably.
  { in: "assets/logo1.png",           out: "assets/logo1.webp", resize: { width: 1080 } }
];

(async () => {
  let before = 0, after = 0;
  for (const j of jobs) {
    let p = sharp(j.in);
    if (j.resize) p = p.resize(j.resize);
    const info = await p.webp({ quality: j.opts?.quality ?? 78, effort: 5 }).toFile(j.out);
    const b = require("fs").statSync(j.in).size;
    before += b; after += info.size;
    console.log(
      j.out.padEnd(30),
      (b / 1024).toFixed(0).padStart(6) + " KB ->",
      (info.size / 1024).toFixed(0).padStart(5) + " KB",
      `(${info.width}x${info.height})`
    );
  }
  console.log("TOTAL:", (before / 1024 / 1024).toFixed(2), "MB ->", (after / 1024 / 1024).toFixed(2), "MB");
})();
