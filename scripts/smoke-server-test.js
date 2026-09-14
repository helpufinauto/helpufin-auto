const http = require("http");
const { spawn } = require("child_process");

const server = spawn(process.execPath, ["server.js"], {
  env: { ...process.env, PORT: "3123" },
  stdio: "inherit"
});

setTimeout(() => {

  const get = (path, headers = {}) =>
    new Promise((resolve) => {
      http
        .get({ host: "127.0.0.1", port: 3123, path, headers }, (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              cache: res.headers["cache-control"],
              etag: res.headers.etag,
              type: res.headers["content-type"],
              bytes: body.length
            })
          );
        })
        .on("error", (e) => resolve({ error: e.message }));
    });

  (async () => {

    const home = await get("/");
    console.log("HTML /            :", home.status, "|", home.cache, "|", home.etag && home.etag.slice(0, 14));

    const css = await get("/css/styles.css");
    console.log("CSS               :", css.status, "|", css.cache, "|", css.etag && css.etag.slice(0, 14), "|", css.bytes, "bytes");

    const css304 = await get("/css/styles.css", { "If-None-Match": css.etag });
    console.log("CSS revalidate    :", css304.status, "(expect 304)");

    const png = await get("/assets/logo1.webp");
    console.log("PNG logo1         :", png.status, "|", png.cache);

    const browse = await get("/browse");
    console.log("SPA /browse       :", browse.status, "|", browse.type, "|", browse.bytes, "bytes");

    const veh = await get("/vehicle/abc123");
    console.log("SPA /vehicle/:id  :", veh.status, "|", veh.type);

    const missing = await get("/js/nope.js");
    console.log("Missing asset 404 :", missing.status, "(expect 404)");

    const sw = await get("/sw.js");
    console.log("sw.js             :", sw.status, "|", sw.cache);

    server.kill();
    process.exit(0);

  })();

}, 1500);
