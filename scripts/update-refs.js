/* Phase 2 reference updates — UTF-8-safe replacements. */
const fs = require("fs");

const edits = [
  {
    file: "css/styles.css",
    pairs: [
      ["menubackground.png", "menubackground.webp"],
      ["footerbg.png", "footerbg.webp"],
      ["sellmain.png", "sellmain.webp"],
      ["sellprivate.png", "sellprivate.webp"],
      ["selldealer.png", "selldealer.webp"],
      ["headerlogo.png", "headerlogo.webp"],
      ["login.png", "login.webp"],
      ["signup.png", "signup.webp"]
    ]
  },
  {
    file: "components/authLoading.js",
    pairs: [["/assets/loading.png", "/assets/loading.webp"]]
  },
  {
    file: "components/navbar.js",
    pairs: [
      ["/assets/logo1.png", "/assets/logo1.webp"],
      ['width="2172"', 'width="1080"'],
      ['height="724"', 'height="360"']
    ]
  },
  { file: "components/footer.js", pairs: [["/assets/logo1.png", "/assets/logo1.webp"]] },
  {
    file: "pages/dashboard.js",
    pairs: [
      ["/assets/logo1.png", "/assets/logo1.webp"],
      ['width="2172"', 'width="1080"'],
      ['height="724"', 'height="360"']
    ]
  },
  { file: "js/router.js", pairs: [["/assets/HUF1.png", "/assets/HUF1.webp"]] },
  { file: "pages/vehicle.js", pairs: [["/assets/HUF1.png", "/assets/HUF1.webp"]] },
  { file: "pages/helpufin.js", pairs: [["/assets/HUF1.png", "/assets/HUF1.webp"]] },
  { file: "index.html", pairs: [["/assets/HUF1.png", "/assets/HUF1.jpg"]] },
  { file: "scripts/smoke-server-test.js", pairs: [["/assets/logo1.png", "/assets/logo1.webp"]] }
];

for (const e of edits) {

  let src = fs.readFileSync(e.file, "utf8");
  let changed = 0;

  for (const [from, to] of e.pairs) {

    const parts = src.split(from);

    if (parts.length > 1) {
      changed += parts.length - 1;
      src = parts.join(to);
    }

  }

  if (changed) {
    fs.writeFileSync(e.file, src);
  }

  console.log(e.file.padEnd(32), changed, "replacements");

}
